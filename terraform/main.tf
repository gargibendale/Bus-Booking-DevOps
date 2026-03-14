# Tell Terraform to use the AWS provider and which region
provider "aws" {
  region = var.aws_region
}

# ── NETWORKING ──────────────────────────────────────────────

# VPC: Your private, isolated network on AWS
# cidr_block defines the IP address range for the entire network (65,536 addresses)
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.app_name}-vpc"
  }
}

# Subnet: A slice of the VPC's IP range, tied to one availability zone
# We use a public subnet so the EC2 instance can get a public IP
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"   # 256 addresses within the VPC
  availability_zone       = "${var.aws_region}a"
  # map_public_ip_on_launch = true             # Auto-assign public IP to instances
  map_public_ip_on_launch = false  # ✅ FIX: Public IPs must be assigned explicitly per resource

  tags = {
    Name = "${var.app_name}-public-subnet"
  }
}

# Internet Gateway: Connects your VPC to the public internet
# Without this, nothing inside your VPC can reach the outside world
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.app_name}-igw"
  }
}

# Route Table: Acts like a GPS — tells traffic where to go
# Here we add a rule: send all outbound traffic (0.0.0.0/0) to the internet gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.app_name}-public-rt"
  }
}

# Associate the route table with our subnet so the subnet uses these routing rules
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ── SECURITY GROUP (INTENTIONALLY VULNERABLE) ───────────────

# Security Group: A virtual firewall controlling inbound/outbound traffic
# ⚠️  INTENTIONAL VULNERABILITY: SSH port 22 is open to the entire internet (0.0.0.0/0) (now removed)
# This is the flaw Trivy will detect, and AI will help fix later
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg"
  description = "Security group for bus booking app"
  vpc_id      = aws_vpc.main.id

  # ✅ FIX: SSH restricted to your specific IP only
  ingress {
    description = "SSH from trusted IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.trusted_ssh_cidr]  # e.g. "203.0.113.10/32" — set in terraform.tfvars
  }

  ingress {
    description = "HTTP for frontend"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Frontend"
    from_port   = 4200
    to_port     = 4200
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "FastAPI backend"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # ✅ FIX: Restrict egress to only necessary outbound ports
  # HTTPS (443) — for AWS APIs, Docker Hub, package managers
  egress {
    description = "HTTPS outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.trusted_ssh_cidr]
  }

  # HTTP (80) — for package installs (apt, pip)
  egress {
    description = "HTTP outbound"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.trusted_ssh_cidr]
  }

  # DNS (53) — required for hostname resolution
  egress {
    description = "DNS outbound"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.trusted_ssh_cidr]
  }

  tags = {
    Name = "${var.app_name}-sg"
  }
}

resource "aws_secretsmanager_secret" "backend_env" {
  name = "bus-booking/backend-env-v7"
  recovery_window_in_days = 0  # allows force-delete on future terraform destroy
}

resource "aws_secretsmanager_secret_version" "backend_env" {
  secret_id = aws_secretsmanager_secret.backend_env.id

  # Store all your backend .env values as a JSON object
  secret_string = jsonencode({
  SECRET_KEY                  = var.secret_key
  ALGORITHM                   = var.algorithm
  ACCESS_TOKEN_EXPIRE_MINUTES = var.access_token_expire_minutes
  DB_HOST                     = var.db_host
  POSTGRES_USER               = var.postgres_user
  POSTGRES_PASSWORD           = var.postgres_password
  POSTGRES_DB                 = var.postgres_db
})
}

# Create an IAM role that EC2 can assume
resource "aws_iam_role" "ec2_role" {
  name = "bus-booking-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Allow that role to read your specific secret
resource "aws_iam_role_policy" "secrets_policy" {
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = aws_secretsmanager_secret.backend_env.arn
    }]
  })
}

# Attach the role to an instance profile (this is what EC2 actually uses)
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "bus-booking-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ── EC2 INSTANCE ─────────────────────────────────────────────

# Fetch the latest Ubuntu 22.04 AMI ID automatically for eu-north-1
# This avoids hardcoding an AMI ID that might become outdated
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical's official AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# EC2 Instance: The virtual machine that will run your Docker containers
resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  key_name               = var.key_pair_name

  # ✅ FIX: Enforce IMDSv2 — require session token for all metadata requests
  metadata_options {
    http_tokens                 = "required"   # Blocks unauthenticated IMDS requests
    http_put_response_hop_limit = 1            # Prevents containers from reaching IMDS
    http_endpoint               = "enabled"    # Keep IMDS available but secured
  }

  # ✅ FIX: Encrypted root volume
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true  # Data at rest is now protected by AWS-managed KMS key
  }

  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  user_data = templatefile("${path.module}/user_data.sh", {
    github_pat = var.github_pat
  })

  tags = {
    Name = "${var.app_name}-server"
  }
}

# Assign an Elastic IP explicitly to the aws_instance resource
resource "aws_eip" "app_server" {
  instance = aws_instance.app_server.id
  domain   = "vpc"
}