aws_region   = "eu-west-1"
instance_type = "t3.small"
key_name      = "dev-mac-01"
project_name  = "cq-dpl"
environment   = "production"

# Restrict SSH access to your IP
allowed_cidr_blocks = [
  "0.0.0.0/0",  # Change this to your IP for better security
]
