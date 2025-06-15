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

# Configure the Azure provider with details (e.g., features)
# This block is for provider-specific settings.
# For Azure, we often enable features for certain resource types.
provider "azurerm" {
  features {} # Empty features block is often sufficient to start
  # Terraform will use your Azure CLI login session by default
  # or you can configure explicit authentication here (later for CI)
}

# --- Define an Azure Resource Group ---
# This is the same resource group we created manually, but now defined in code.
# If it already exists, Terraform can import it or manage it.
# For a clean start, you might delete the manually created RG before running this,
# or Terraform will try to adopt/update it if the configuration matches.
resource "azurerm_resource_group" "rg" { # "rg" is a local name for this resource block in Terraform
  name     = "node-azure-api-rg-tf"       # Actual name of the RG in Azure. Let's make it unique for TF.
  location = "centralindia"               # Same location

  tags = {
    environment = "learning"
    project     = "node-azure-api-terraform"
  }
}

# --- Output the Resource Group Name ---
# Outputs are useful for getting information about created resources.
output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}