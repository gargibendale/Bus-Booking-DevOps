#!/bin/bash
# This script runs as root on first EC2 boot

GITHUB_PAT="${github_pat}"

# Update package lists
apt-get update -y

# Install Docker
apt-get install -y docker.io docker-compose git

# Start Docker service and enable it on reboot
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group so it can run docker without sudo
usermod -aG docker ubuntu

# Install the AWS CLI (needed to talk to Secrets Manager)
apt-get install -y awscli jq

SECRET=$(aws secretsmanager get-secret-value --secret-id "bus-booking/backend-env-v3" --region ap-south-1 --query SecretString --output text)

# Create app directory
mkdir -p /home/ubuntu/bus-booking
cd /home/ubuntu/bus-booking

# Clone your repo (replace with your actual GitHub repo URL)
git clone https://${github_pat}@github.com/gargibendale/bus-app-copy.git .

cat > /home/ubuntu/bus-booking/backend/.env <<EOF
SECRET_KEY=$(echo $SECRET | jq -r '.SECRET_KEY')
ALGORITHM=$(echo $SECRET | jq -r '.ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES=$(echo $SECRET | jq -r '.ACCESS_TOKEN_EXPIRE_MINUTES')
DB_HOST=$(echo $SECRET | jq -r '.DB_HOST')
POSTGRES_USER=$(echo $SECRET | jq -r '.POSTGRES_USER')
POSTGRES_PASSWORD=$(echo $SECRET | jq -r '.POSTGRES_PASSWORD')
POSTGRES_DB=$(echo $SECRET | jq -r '.POSTGRES_DB')
EOF

# Start the app using docker-compose
docker-compose up -d --build