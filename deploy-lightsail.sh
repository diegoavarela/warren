#!/bin/bash

# Warren Lightsail Deployment Script for v3-wiseimport
# This script deploys the v3-wiseimport branch without overriding existing deployments

set -e

# Configuration
BRANCH="v3-wiseimport"
DEPLOYMENT_NAME="warren-v3-wiseimport"
DOCKER_TAG="v3-wiseimport"
REGISTRY_URL=""  # Set this to your Docker registry URL if using one
LIGHTSAIL_HOST=""  # Set this to your Lightsail server IP or hostname
LIGHTSAIL_USER="ubuntu"  # Default Lightsail user, change if different

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Warren v3-wiseimport Deployment ===${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command_exists git; then
    echo -e "${RED}Error: Git is not installed${NC}"
    exit 1
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            LIGHTSAIL_HOST="$2"
            shift 2
            ;;
        --user)
            LIGHTSAIL_USER="$2"
            shift 2
            ;;
        --registry)
            REGISTRY_URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --host HOST       Lightsail server hostname or IP (required)"
            echo "  --user USER       SSH user for Lightsail (default: ubuntu)"
            echo "  --registry URL    Docker registry URL (optional)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$LIGHTSAIL_HOST" ]; then
    echo -e "${RED}Error: Lightsail host not specified. Use --host option${NC}"
    exit 1
fi

# Step 1: Checkout v3-wiseimport branch
echo -e "${YELLOW}Step 1: Checking out $BRANCH branch...${NC}"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Step 2: Build Docker images
echo -e "${YELLOW}Step 2: Building Docker images...${NC}"
docker-compose -f docker/docker-compose.yml build --no-cache

# Tag images for deployment
docker tag warren_frontend:latest ${REGISTRY_URL}${REGISTRY_URL:+/}warren_frontend:${DOCKER_TAG}
docker tag warren_backend:latest ${REGISTRY_URL}${REGISTRY_URL:+/}warren_backend:${DOCKER_TAG}

# Step 3: Push images to registry (if specified)
if [ -n "$REGISTRY_URL" ]; then
    echo -e "${YELLOW}Step 3: Pushing images to registry...${NC}"
    docker push ${REGISTRY_URL}/warren_frontend:${DOCKER_TAG}
    docker push ${REGISTRY_URL}/warren_backend:${DOCKER_TAG}
else
    echo -e "${YELLOW}Step 3: Skipping registry push (no registry specified)${NC}"
    echo -e "${YELLOW}Note: You'll need to transfer images manually or build on the server${NC}"
fi

# Step 4: Create deployment directory structure on Lightsail
echo -e "${YELLOW}Step 4: Preparing Lightsail server...${NC}"
ssh ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST} << 'EOF'
    # Create deployment directory for v3-wiseimport
    mkdir -p ~/deployments/warren-v3-wiseimport
    cd ~/deployments/warren-v3-wiseimport
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p data
EOF

# Step 5: Copy deployment files to Lightsail
echo -e "${YELLOW}Step 5: Copying deployment files...${NC}"
scp docker/docker-compose.yml ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST}:~/deployments/warren-v3-wiseimport/
scp .env.example ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST}:~/deployments/warren-v3-wiseimport/.env

# Step 6: Create production docker-compose override
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  frontend:
    image: ${REGISTRY_URL}${REGISTRY_URL:+/}warren_frontend:${DOCKER_TAG}
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.warren-v3-frontend.rule=Host(`${FRONTEND_HOST}`)"
      - "traefik.http.routers.warren-v3-frontend.entrypoints=websecure"
      - "traefik.http.routers.warren-v3-frontend.tls.certresolver=letsencrypt"
    networks:
      - warren-v3

  backend:
    image: ${REGISTRY_URL}${REGISTRY_URL:+/}warren_backend:${DOCKER_TAG}
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.warren-v3-backend.rule=Host(`${BACKEND_HOST}`)"
      - "traefik.http.routers.warren-v3-backend.entrypoints=websecure"
      - "traefik.http.routers.warren-v3-backend.tls.certresolver=letsencrypt"
    networks:
      - warren-v3

  postgres:
    restart: unless-stopped
    volumes:
      - postgres-v3-data:/var/lib/postgresql/data
    networks:
      - warren-v3

networks:
  warren-v3:
    name: warren-v3-network

volumes:
  postgres-v3-data:
    name: warren-v3-postgres-data
EOF

scp docker-compose.production.yml ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST}:~/deployments/warren-v3-wiseimport/

# Step 7: Create startup script
cat > start-warren-v3.sh << 'EOF'
#!/bin/bash
cd ~/deployments/warren-v3-wiseimport

# Export environment variables
export DOCKER_TAG="v3-wiseimport"
export REGISTRY_URL="${REGISTRY_URL}"
export FRONTEND_HOST="warren-v3.yourdomain.com"  # Update this
export BACKEND_HOST="api-warren-v3.yourdomain.com"  # Update this

# Start the application
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Check status
docker-compose ps
EOF

chmod +x start-warren-v3.sh
scp start-warren-v3.sh ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST}:~/deployments/warren-v3-wiseimport/

# Step 8: Create stop script
cat > stop-warren-v3.sh << 'EOF'
#!/bin/bash
cd ~/deployments/warren-v3-wiseimport
docker-compose -f docker-compose.yml -f docker-compose.production.yml down
EOF

chmod +x stop-warren-v3.sh
scp stop-warren-v3.sh ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST}:~/deployments/warren-v3-wiseimport/

echo -e "${GREEN}=== Deployment files prepared ===${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. SSH into your Lightsail server: ssh ${LIGHTSAIL_USER}@${LIGHTSAIL_HOST}"
echo "2. Navigate to: cd ~/deployments/warren-v3-wiseimport"
echo "3. Update the .env file with production values"
echo "4. Update FRONTEND_HOST and BACKEND_HOST in start-warren-v3.sh"
echo "5. If not using a registry, copy Docker images manually or build on server"
echo "6. Run: ./start-warren-v3.sh"
echo ""
echo -e "${GREEN}This deployment is isolated in ~/deployments/warren-v3-wiseimport${NC}"
echo -e "${GREEN}Your existing deployment remains untouched${NC}"