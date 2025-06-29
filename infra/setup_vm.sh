#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Log all commands to stdout for debugging in Azure Portal
set -x

# --- Update and Install Prerequisites ---
echo "Updating package list and installing prerequisites..."
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# --- Install Docker ---
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# --- Docker Post-Installation ---
echo "Adding admin user to docker group..."
usermod -aG docker azureuser

# --- Authenticate with ACR ---
echo "Logging into Azure Container Registry..."
# The variables like ${acr_login_server} will be replaced by Terraform before this script is sent to the VM.
echo "${acr_password}" | docker login "${acr_login_server}" -u "${acr_username}" --password-stdin

# --- Pull Docker Images ---
echo "Pulling application and database images..."
docker pull "${acr_login_server}/node-azure-api:latest"
docker pull mongo:latest

# --- Stop and Remove any old containers to ensure a clean start ---
echo "Stopping and removing any old containers..."
(docker stop tf-vm-nodeapp tf-vm-mongo || true) && (docker rm tf-vm-nodeapp tf-vm-mongo || true)

# --- Run MongoDB Container ---
echo "Starting MongoDB container..."
docker run \
    -d \
    -p 27017:27017 \
    --name tf-vm-mongo \
    -v mongo-tf-vm-data:/data/db \
    --restart unless-stopped \
    mongo:latest

# --- Run Node.js Application Container ---
echo "Waiting 15 seconds for MongoDB to initialize..."
sleep 15

echo "Starting Node.js application container..."
docker run \
    -d \
    --network host \
    --name tf-vm-nodeapp \
    -e JWT_SECRET="${jwt_secret}" \
    -e DB_URI="mongodb://127.0.0.1:27017/${db_name}" \
    --restart unless-stopped \
    "${acr_login_server}/node-azure-api:latest"

echo "VM setup script finished successfully!"