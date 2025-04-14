# AI-Powered Subtitle Generator

This project is an AI-powered subtitle generator with a Next.js frontend and Node.js backend.

## Docker Setup

This project uses Docker Compose to set up the development environment. This includes:

- Backend server (Node.js with Express)
- Frontend client (Next.js)
- Redis for caching

### Prerequisites

- Docker and Docker Compose installed
- Google Cloud credentials file (for Vertex AI)

### Getting Started

1. **Update the environment variables**

   Edit the `.env` file in the root directory with your Appwrite and Google Cloud credentials.

2. **Add your Google Cloud credentials**

   Place your Google Cloud credentials JSON file at `server/credentials.json`.

3. **Start the services**

   ```bash
   docker-compose up
   ```

   This will start all services defined in the docker-compose.yml file.

4. **Access the applications**

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Backend Health Check: http://localhost:3001/health

### Development Workflow

- The source code is mounted as volumes, so changes will be reflected immediately.
- Both frontend and backend use hot-reloading for development.

### Stopping the Services

```bash
docker-compose down
```

To remove volumes as well:

```bash
docker-compose down -v
```

## Troubleshooting

### Redis Connection Issues

If you're experiencing Redis connection issues, make sure:

1. The Redis service is running: `docker-compose ps`
2. The backend service is configured to connect to Redis using the service name: `REDIS_HOST=redis`

### Container Logs

To view logs for a specific service:

```bash
docker-compose logs -f server  # For backend logs
docker-compose logs -f client  # For frontend logs
docker-compose logs -f redis   # For Redis logs
```
