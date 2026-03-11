# Print the public IP of the EC2 instance after deployment
output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app_server.public_ip
}

# Print the public DNS hostname
output "instance_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.app_server.public_dns
}

# Print the full URL for the frontend
output "app_url" {
  description = "URL to access the bus booking application"
  value       = "http://${aws_instance.app_server.public_ip}"
}