# main.tf - TARGET CONFIGURATION

variable "jwt_secret" {
  description = "The secret key for signing JWTs."
  type        = string
  sensitive   = true # Marks this variable as sensitive
}

variable "db_name" {
  description = "The name of the MongoDB database on the VM."
  type        = string
  default     = "recipeHubDbOnTerraformVM"
}


# 1. Configure Providers
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features  {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# 2. Define Azure Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "node-azure-api-rg-tf"
  location = "centralindia"
  tags     = { environment = "learning", project = "node-azure-api" }
}

# 3. Define Networking Resources using the clear '_vm' local names
resource "azurerm_virtual_network" "vnet_vm" {
  name                = "node-api-vnet-tf"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = { environment = "learning", project = "node-azure-api" }
}

resource "azurerm_subnet" "subnet_vm" {
  name                 = "node-api-subnet-tf"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet_vm.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_public_ip" "pip_vm" {
  name                = "node-api-vm-pip-tf"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Dynamic"
  sku                 = "Basic"
  tags                = { environment = "learning", project = "node-azure-api" }
}

resource "azurerm_network_security_group" "nsg_vm" {
  name                = "node-api-vm-nsg-tf"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  # Security rules for SSH and App port
  security_rule {
    name                       = "AllowSSH"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "AllowNodeAppPort3000"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3000"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
  tags = { environment = "learning", project = "node-azure-api" }
}

resource "azurerm_network_interface" "nic_vm" {
  name                = "node-api-vm-nic-tf"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet_vm.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip_vm.id
  }
  tags = { environment = "learning", project = "node-azure-api" }
}

# Explicitly associate the NSG with the NIC
resource "azurerm_network_interface_security_group_association" "nic_vm_nsg_assoc" {
  network_interface_id      = azurerm_network_interface.nic_vm.id
  network_security_group_id = azurerm_network_security_group.nsg_vm.id
}

# 4. Generate SSH Key and Define the Linux Virtual Machine
resource "tls_private_key" "vm_ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "local_file" "vm_private_key_pem" {
  content         = tls_private_key.vm_ssh_key.private_key_pem
  filename        = "${path.module}/node-api-vm-tf-generated_key.pem"
  file_permission = "0600"
}

resource "azurerm_linux_virtual_machine" "vm" {
  name                  = "node-api-vm-tf"
  computer_name         = "nodeapivm"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  size                  = "Standard_B1s"
  admin_username        = "azureuser"
  network_interface_ids = [azurerm_network_interface.nic_vm.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = tls_private_key.vm_ssh_key.public_key_openssh
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }
  tags = { environment = "learning", project = "node-azure-api" }

}

# --- Define Azure Container Registry (ACR) to be managed by Terraform ---
# This will be used by the setup script to log in and pull images.
resource "azurerm_container_registry" "acr" {
  name                = "devpriyoacr939" # Your unique ACR name that already exists
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true # Required to get admin_password
  tags = {
    environment = "learning"
    project     = "node-azure-api"
  }
}

# main.tf

# --- Run Setup Script on VM using Custom Script Extension ---
resource "azurerm_virtual_machine_extension" "app_setup_script" {
  name                 = "app-setup"
  virtual_machine_id   = azurerm_linux_virtual_machine.vm.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.0"

  # We use 'protected_settings' to pass sensitive variables to our script template.
  # The 'templatefile' function reads our script, injects the variables,
  # and 'jsonencode' ensures it's a valid JSON structure.
  protected_settings = jsonencode({
    "script" = base64encode(templatefile("${path.module}/setup_vm.sh", {
      # These are the variables we are passing into the setup_vm.sh template
      acr_login_server = azurerm_container_registry.acr.login_server
      acr_username     = azurerm_container_registry.acr.name
      acr_password     = azurerm_container_registry.acr.admin_password
      jwt_secret       = var.jwt_secret
      db_name          = var.db_name
    }))
  })

  # This extension resource must be created after the VM it attaches to is ready.
  # It also needs the ACR to be ready to get its credentials.
  depends_on = [
    azurerm_linux_virtual_machine.vm,
    azurerm_container_registry.acr
  ]

  tags = {
    environment = "learning"
    project     = "node-azure-api"
  }
}

# --- Outputs for VM Infrastructure ---
output "vm_public_ip_address" {
  description = "The Public IP address of the created Virtual Machine."
  value       = azurerm_linux_virtual_machine.vm.public_ip_address
}

output "vm_id" {
  description = "The ID of the created Virtual Machine."
  value       = azurerm_linux_virtual_machine.vm.id
}

output "generated_ssh_private_key_path" {
  description = "Path to the generated SSH private key PEM file."
  value       = local_file.vm_private_key_pem.filename
}