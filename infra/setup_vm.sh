#!/bin/bash

# This script uses template variables like $${variable_name} which are replaced by Terraform.

set -e
set -x

# Update and Install Prerequisites
echo "Updating package list and installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Install Docker
echo "Installing Docker..."

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu jammy stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Docker Post-Installation
echo "Adding admin user to docker group..."
sudo usermod -aG docker azureuser

# Authenticate with ACR
echo "Logging into Azure Container Registry..."
echo "${acr_password}" | sudo docker login "${acr_login_server}" -u "${acr_username}" --password-stdin

# Pull Docker Images
echo "Pulling application and database images..."
sudo docker pull "${acr_login_server}/node-azure-api:latest"
sudo docker pull mongo:latest

# Stop and Remove any old containers
echo "Stopping and removing any old containers..."
sudo docker stop tf-vm-nodeapp tf-vm-mongo || echo "Containers not running, skipping stop."
sudo docker rm tf-vm-nodeapp tf-vm-mongo || echo "Containers not found, skipping rm."

# Run MongoDB Container
echo "Starting MongoDB container..."
sudo docker run -d -p 27017:27017 --name tf-vm-mongo -v mongo-tf-vm-data:/data/db --restart unless-stopped mongo:latest

# Run Node.js Application Container
echo "Waiting 15 seconds for MongoDB to initialize..."
sleep 15

echo "Starting Node.js application container..."
sudo docker run -d --network host --name tf-vm-nodeapp -e JWT_SECRET="${jwt_secret}" -e DB_URI="mongodb://127.0.0.1:27017/${db_name}" --restart unless-stopped "${acr_login_server}/node-azure-api:latest"

echo "VM setup script finished successfully!"