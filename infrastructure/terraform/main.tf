terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data source for latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group for the EC2 instance
resource "aws_security_group" "cq_dpl_sg" {
  name        = "${var.project_name}-sg"
  description = "Security group for cq-dpl server"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM role for EC2 instance
resource "aws_iam_role" "cq_dpl_role" {
  name = "${var.project_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-role"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM instance profile
resource "aws_iam_instance_profile" "cq_dpl_profile" {
  name = "${var.project_name}-profile"
  role = aws_iam_role.cq_dpl_role.name
}

# EC2 instance
resource "aws_instance" "cq_dpl_server" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.cq_dpl_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.cq_dpl_profile.name

  user_data = <<-EOF
              #!/bin/bash
              set -e
              
              # Update system
              dnf update -y
              
              # Install Node.js 20.x
              dnf install -y nodejs npm
              
              # Install Rust (for building cq binary)
              curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
              source $HOME/.cargo/env
              
              # Install PM2 for process management
              npm install -g pm2
              
              # Create app directory
              mkdir -p /opt/cq-dpl
              chown ec2-user:ec2-user /opt/cq-dpl
              
              # Note: Application deployment should be done via deployment script
              # This user data script sets up the environment
              EOF

  tags = {
    Name        = "${var.project_name}-server"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Elastic IP (optional, for static IP)
resource "aws_eip" "cq_dpl_eip" {
  instance = aws_instance.cq_dpl_server.id
  domain   = "vpc"

  tags = {
    Name        = "${var.project_name}-eip"
    Project     = var.project_name
    Environment = var.environment
  }
}
