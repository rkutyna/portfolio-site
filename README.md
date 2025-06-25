# Full-Stack Portfolio Website

This is a complete full-stack portfolio application built with a modern tech stack, fully containerized for easy deployment and scalability. It features a Next.js frontend, an Express.js backend API, and a PostgreSQL database. The application supports full CRUD (Create, Read, Update, Delete) functionality for projects, including dynamic image uploads.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Containerization:** Docker, Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

Follow these steps to get your development environment set up and running.

### 1. Clone the Repository

First, clone this repository to your local machine.

```bash
git clone https://github.com/rkutyna/portfolio-site
cd portfolio-site
```

### 2. Create the Environment File

This project uses a single `.env` file in the root directory to manage all necessary environment variables for Docker Compose. You must create this file yourself.

In the root of the project, create a file named `.env`:

```bash
touch .env
```

### 3. Configure Your Environment

Open the `.env` file you just created and add the following content. These variables tell the application how to connect to itself and are crucial for ensuring assets and API calls work correctly.

```env
# This file is for Docker Compose configuration.
# It must be in the project's root directory.

# The full public URL for the backend API server.
# For local development, use http://localhost:3001/api.
# For deployment, replace 'localhost' with your server's public or local IP address.
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# The full public URL for the frontend Next.js app.
# This MUST be the address you use to access the site in your browser.
# For local development, use http://localhost:3000.
# For deployment, replace 'localhost' with your server's public or local IP address.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** If you are deploying this on a server, you **must** replace `localhost` with your server's IP address (either public or local, depending on your needs).

### 4. Build and Run the Application

With the `.env` file configured, you can now build the Docker images and launch the containers. This single command handles everything.

```bash
docker-compose up --build -d
```

- `--build`: Forces Docker to build the images from your Dockerfiles, baking in your environment variables.
- `-d`: Runs the containers in detached mode, so they run in the background.

## Accessing the Application

Once the containers are running, you can access the different parts of the application:

- **Frontend Website:** [http://localhost:3000](http://localhost:3000) (or `http://<your-server-ip>:3000`)
- **Backend API:** [http://localhost:3001/api/projects](http://localhost:3001/api/projects)

## Stopping the Application

To stop all running containers, use the following command:

```bash
docker-compose down
```

This will stop and remove the containers and the network created by Docker Compose.

## Project Structure

- `/client`: Contains the Next.js frontend application.
- `/server`: Contains the Express.js backend API.
- `docker-compose.yml`: The main configuration file that defines all services, networks, and volumes.
- `.env`: The root environment file that you create to configure the deployment.
