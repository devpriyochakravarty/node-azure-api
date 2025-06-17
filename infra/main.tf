# main.tf

# Configure the Azure Provider
# This tells Terraform we want to interact with Azure
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0" # Specify a version constraint for the Azure provider
    }
  }
}

# Configure the Azure provider with details
# Terraform will use your Azure CLI login session by default
provider "azurerm" {
  features {} # Empty features block is often sufficient to start
}

# --- Define an Azure Resource Group ---
resource "azurerm_resource_group" "rg" {
  name     = "node-azure-api-rg-tf"       # Actual name of the RG in Azure
  location = "centralindia"               # Azure region

  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define a Virtual Network (VNet) ---
resource "azurerm_virtual_network" "vnet" {
  name                = "node-api-vnet-tf"                  # Name of the VNet in Azure
  address_space       = ["10.0.0.0/16"]                     # Overall IP address range for the VNet
  location            = azurerm_resource_group.rg.location  # Use the same location as the resource group
  resource_group_name = azurerm_resource_group.rg.name    # Place it in our existing RG (references the RG above)

  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Define a Subnet within the VNet ---
resource "azurerm_subnet" "subnet" {
  name                 = "node-api-subnet-tf"                # Name of the subnet in Azure
  resource_group_name  = azurerm_resource_group.rg.name    # Same RG
  virtual_network_name = azurerm_virtual_network.vnet.name # Link to the VNet created above
  address_prefixes     = ["10.0.1.0/24"]                     # IP address range for this subnet (must be within VNet's range)
}

# --- Define a Public IP Address for the VM ---
resource "azurerm_public_ip" "pip" {
  name                = "node-api-vm-pip-tf"              # Name of the Public IP resource in Azure
  location            = azurerm_resource_group.rg.location  # Same location
  resource_group_name = azurerm_resource_group.rg.name    # Same RG
  allocation_method   = "Dynamic"                           # Can be "Static" or "Dynamic"
  sku                 = "Basic"                             # SKU for the Public IP

  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}
# --- Define a Network Security Group (NSG) ---
resource "azurerm_network_security_group" "nsg" {
  name                = "node-api-vm-nsg-tf"              # Name of the NSG in Azure
  location            = azurerm_resource_group.rg.location  # Same location as RG
  resource_group_name = azurerm_resource_group.rg.name    # Same RG

  # Inbound rule for SSH
  security_rule {
    name                       = "AllowSSH"
    priority                   = 100  # Lower numbers have higher priority
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"     # Any source port
    destination_port_range     = "22"    # Destination port 22 (SSH)
    source_address_prefix      = "Internet" # Allow from any internet IP (can be restricted)
    destination_address_prefix = "*"     # To any IP within the associated resource
  }

  # Inbound rule for our Node.js Application (port 3000)
  security_rule {
    name                       = "AllowNodeAppPort3000"
    priority                   = 110 # Must be different from other rules
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3000"  # Your application's port
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # You can also add outbound rules if needed, but default outbound is usually AllowAny.

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