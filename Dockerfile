# ---- Base Stage ----
# Use an official Node.js runtime as a parent image
# Using a specific LTS version is good practice (e.g., 20-alpine, 18-alpine)
# Alpine versions are smaller
FROM node:20-alpine AS base

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
# This step is separate to leverage Docker cache for dependencies
COPY package*.json ./

# ---- Dependencies Stage ----
# Install app dependencies
FROM base AS dependencies
# If you have build steps or native modules, you might need build-essential here
# RUN apk add --no-cache --virtual .gyp python3 make g++
RUN npm install --omit=dev
# RUN npm ci --omit=dev # 'npm ci' is often preferred for CI for stricter builds

# ---- Release Stage ----
# Use a clean base image for the final stage
FROM base AS release

# Copy only necessary files from the dependencies stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy the rest of your application code
COPY . .

# Make your app's port available to the outside world
# This doesn't actually publish the port, just documents it.
# The -p flag in 'docker run' does the actual publishing.
EXPOSE 3000 

# Define the command to run your app
CMD [ "node", "server.js" ]