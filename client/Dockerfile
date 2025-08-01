# Stage 1: Build the Next.js application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Declare the build-time argument that will be passed from docker-compose
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Set the environment variable for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build the Next.js application for production
RUN npm run build


# Stage 2: Create the lean production image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install *only* production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --production

# Copy the built application from the 'builder' stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the port the Next.js app runs on
EXPOSE 3000

# The command to start the production server
CMD ["npm", "start"]
