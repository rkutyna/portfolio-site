# 1. Start with a base image
# We're using an official Node.js image. The 'alpine' version is very small and great for production.
FROM node:18-alpine

# 2. Set the working directory inside the container
# All subsequent commands will be run from this path.
WORKDIR /app

# 3. Copy package files and install dependencies
# We copy these first to leverage Docker's layer caching. If these files don't change,
# Docker won't re-run the `npm install` step on subsequent builds, saving time.
COPY package*.json ./
RUN npm install

# Create the uploads directory for file storage
RUN mkdir -p uploads

# 4. Copy the rest of the application source code
COPY . .

# 5. Expose the port the app runs on
# This tells Docker that the container will listen on port 3001.
EXPOSE 3001

# 6. Define the command to run the application
# This is the command that will be executed when the container starts.
CMD ["node", "index.js"]
