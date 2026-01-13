output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.cq_dpl_server.id
}

output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.cq_dpl_eip.public_ip
}

output "public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.cq_dpl_server.public_dns
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = var.key_name != null ? "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.cq_dpl_eip.public_ip}" : "No SSH key configured. Use AWS Systems Manager Session Manager or configure a key pair."
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.cq_dpl_sg.id
}
