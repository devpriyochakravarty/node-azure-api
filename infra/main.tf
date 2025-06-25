# main.tf

# Configure the Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# --- Define an Azure Resource Group ---
resource "azurerm_resource_group" "rg" {
  name     = "node-azure-api-rg-tf"
  location = "centralindia"
  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define a Virtual Network (VNet) ---
resource "azurerm_virtual_network" "vnet" {
  name                = "node-api-vnet-tf"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define a Subnet within the VNet ---
resource "azurerm_subnet" "subnet" {
  name                 = "node-api-subnet-tf"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# --- Define a Public IP Address for the VM ---
resource "azurerm_public_ip" "pip" {
  name                = "node-api-vm-pip-tf"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Dynamic"
  sku                 = "Basic"
  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define a Network Security Group (NSG) ---
resource "azurerm_network_security_group" "nsg" {
  name                = "node-api-vm-nsg-tf"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

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
  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define a Network Interface (NIC) for the VM ---
resource "azurerm_network_interface" "nic" {
  name                = "node-api-vm-nic-tf"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id 
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }

  # CORRECTED: Associate the Network Security Group with this NIC
  

  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define the Linux Virtual Machine ---
resource "azurerm_linux_virtual_machine" "vm" {
  name                  = "node-api-vm-tf" # Name of the VM in Azure
  computer_name         = "nodeapivm"      # Hostname for the VM (shorter, no hyphens usually)
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  size                  = "Standard_B1s"   # Same size as your manual VM
  admin_username        = "azureuser"      # Your admin username

  # Associate the NIC we created earlier
  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  # Configure SSH key authentication
  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/node-api-vm-tf_key.pub") # Path to your SSH public key file
                                                       # Or use file("${path.module}/node-api-vm-tf_key.pub")
                                                       # if key is in the same 'infra' folder
  }

  # Define the OS disk
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS" # Or "Premium_LRS" if desired/available for B1s
                                          # Standard_LRS is usually fine for Basic VMs
  }

  # Specify the OS image
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy" # For Ubuntu 22.04 LTS
    # For Ubuntu 20.04 LTS, it might be "UbuntuServer" for offer and "20_04-LTS" for sku
    sku       = "22_04-lts-gen2" # Or "22_04-LTS" depending on exact image name
    version   = "latest"
  }

  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Outputs ---
output "resource_group_name" {
  description = "The name of the created resource group."
  value       = azurerm_resource_group.rg.name
}

output "virtual_network_name" {
  description = "The name of the created virtual network."
  value       = azurerm_virtual_network.vnet.name
}

output "subnet_name" {
  description = "The name of the created subnet."
  value       = azurerm_subnet.subnet.name
}

output "public_ip_address_id" {
  description = "The ID of the created Public IP address."
  value       = azurerm_public_ip.pip.id # Often you need the ID for other resources
}

output "public_ip_address" {
  description = "The actual Public IP address allocated (known after apply if dynamic)."
  value       = azurerm_public_ip.pip.ip_address
}

output "vm_public_ip_address" {
  description = "The Public IP address of the VM."
  value       = azurerm_linux_virtual_machine.vm.public_ip_address 
  # Or if you want it from the PIP resource directly, it might be available after association:
  # value = azurerm_public_ip.pip.ip_address 
  # The VM resource itself often exposes the primary public IP.
}

output "vm_id" {
  description = "The ID of the created Virtual Machine."
  value = azurerm_linux_virtual_machine.vm.id
}
