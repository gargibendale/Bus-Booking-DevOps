variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-north-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "app_name" {
  description = "Application name used for tagging resources"
  type        = string
  default     = "bus-booking"
}

variable "key_pair_name" {
  description = "Name of the AWS key pair for SSH access"
  type        = string
  default     = "My-First-Keypair"
}

variable "github_pat" {
  description = "GitHub Personal Access Token"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  type      = string
  sensitive = true
}

variable "algorithm" {
  type = string
}

variable "access_token_expire_minutes" {
  type = string
}

variable "db_host" {
  type = string
}

variable "postgres_user" {
  type      = string
  sensitive = true
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "postgres_db" {
  type = string
}

variable "trusted_ssh_cidr" {
  description = "Your personal IP in CIDR notation, e.g. 203.0.113.10/32"
  type        = string
}