# Terraform Infrastructure for cq-dpl

This directory contains Terraform configuration for deploying the cq-dpl application to AWS EC2.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform installed (>= 1.0)
3. An AWS key pair for SSH access

## Setup

1. Copy `terraform.tfvars.example` to `terraform.tfvars`:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   - `key_name`: Your AWS key pair name
   - `aws_region`: Your preferred AWS region
   - `allowed_cidr_blocks`: Restrict SSH access to your IP for security

3. Initialize Terraform:
   ```bash
   terraform init
   ```

4. Review the plan:
   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

6. After deployment, note the outputs:
   - `public_ip`: Public IP address
   - `ssh_command`: Command to SSH into the instance

## Deployment

After infrastructure is created, use the deployment script from `../scripts/deploy.sh` to deploy the application.

## Destroying

To tear down the infrastructure:
```bash
terraform destroy
```
