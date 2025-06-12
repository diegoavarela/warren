#!/bin/bash

# Warren Deployment Script for AWS LightSail Container Service
# Usage: ./deploy-lightsail.sh [service-name]

set -e

# Configuration
SERVICE_NAME=${1:-warren-app}
REGION="us-east-1"  # Change if needed
IMAGE_TAG="warren:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Warren to AWS LightSail Container Service${NC}"
echo -e "${YELLOW}Service Name: ${SERVICE_NAME}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first:${NC}"
    echo "curl 'https://awscli.amazonaws.com/AWSCLIV2.pkg' -o 'AWSCLIV2.pkg'"
    echo "sudo installer -pkg AWSCLIV2.pkg -target /"
    exit 1
fi

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured. Run: aws configure${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met!${NC}"
echo ""

# Build the container (multi-platform for M1/M2/M3/M4 Macs)
echo -e "${YELLOW}📦 Building container for AMD64...${NC}"
docker buildx build --platform linux/amd64 -t $IMAGE_TAG --load .

# Test container locally
echo -e "${YELLOW}🧪 Testing container locally...${NC}"
docker run -d --name warren-test -p 8080:80 $IMAGE_TAG

# Wait for container to be ready
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 15

# Health check
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Container is healthy!${NC}"
else
    echo -e "${RED}❌ Container health check failed${NC}"
    docker logs warren-test
    docker stop warren-test && docker rm warren-test
    exit 1
fi

# Clean up test container
docker stop warren-test && docker rm warren-test

# Check if service exists
echo -e "${YELLOW}🔍 Checking if LightSail container service exists...${NC}"
if aws lightsail get-container-services --service-name $SERVICE_NAME --region $REGION > /dev/null 2>&1; then
    echo -e "${BLUE}📋 Service '$SERVICE_NAME' already exists, will update deployment${NC}"
    SERVICE_EXISTS=true
else
    echo -e "${BLUE}🆕 Service '$SERVICE_NAME' doesn't exist, will create it${NC}"
    SERVICE_EXISTS=false
fi

# Create service if it doesn't exist
if [ "$SERVICE_EXISTS" = false ]; then
    echo -e "${YELLOW}🏗️  Creating LightSail container service...${NC}"
    aws lightsail create-container-service \
        --service-name $SERVICE_NAME \
        --power nano \
        --scale 1 \
        --region $REGION
    
    echo -e "${YELLOW}⏳ Waiting for service to be ready (this takes 2-3 minutes)...${NC}"
    
    # Wait for service to be ready (manual check since wait command isn't available)
    for i in {1..12}; do
        STATUS=$(aws lightsail get-container-services --service-name $SERVICE_NAME --region $REGION --query 'containerServices[0].state' --output text 2>/dev/null || echo "PENDING")
        if [ "$STATUS" = "READY" ]; then
            echo -e "${GREEN}✅ Service is ready!${NC}"
            break
        elif [ "$STATUS" = "FAILED" ]; then
            echo -e "${RED}❌ Service creation failed${NC}"
            exit 1
        else
            echo -e "${YELLOW}⏳ Service status: $STATUS (attempt $i/12)${NC}"
            sleep 15
        fi
    done
fi

# Push image to LightSail
echo -e "${YELLOW}📤 Pushing container to LightSail...${NC}"
aws lightsail push-container-image \
    --service-name $SERVICE_NAME \
    --label warren-app \
    --image $IMAGE_TAG \
    --region $REGION

# Get the image reference
IMAGE_REF=$(aws lightsail get-container-images --service-name $SERVICE_NAME --region $REGION --query 'containerImages[0].image' --output text)

# Create deployment configuration
echo -e "${YELLOW}⚙️  Creating deployment configuration...${NC}"
cat > containers.json << EOF
{
  "warren": {
    "image": "$IMAGE_REF",
    "ports": {
      "80": "HTTP"
    },
    "environment": {
      "NODE_ENV": "production",
      "PORT": "3002"
    }
  }
}
EOF

cat > public-endpoint.json << EOF
{
  "containerName": "warren",
  "containerPort": 80,
  "healthCheck": {
    "path": "/health"
  }
}
EOF

# Deploy the container
echo -e "${YELLOW}🚢 Deploying container...${NC}"
aws lightsail create-container-service-deployment \
    --service-name $SERVICE_NAME \
    --containers file://containers.json \
    --public-endpoint file://public-endpoint.json \
    --region $REGION

# Clean up temp files
rm containers.json public-endpoint.json

echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

# Wait for deployment to complete (manual check)
for i in {1..20}; do
    DEPLOYMENT_STATE=$(aws lightsail get-container-services --service-name $SERVICE_NAME --region $REGION --query 'containerServices[0].currentDeployment.state' --output text 2>/dev/null || echo "PENDING")
    if [ "$DEPLOYMENT_STATE" = "ACTIVE" ]; then
        echo -e "${GREEN}✅ Deployment is active!${NC}"
        break
    elif [ "$DEPLOYMENT_STATE" = "FAILED" ]; then
        echo -e "${RED}❌ Deployment failed${NC}"
        aws lightsail get-container-services --service-name $SERVICE_NAME --region $REGION --query 'containerServices[0].currentDeployment'
        exit 1
    else
        echo -e "${YELLOW}⏳ Deployment status: $DEPLOYMENT_STATE (attempt $i/20)${NC}"
        sleep 15
    fi
done

# Get service URL
SERVICE_URL=$(aws lightsail get-container-services --service-name $SERVICE_NAME --region $REGION --query 'containerServices[0].url' --output text)

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Service Details:${NC}"
echo -e "Service Name: ${SERVICE_NAME}"
echo -e "Region: ${REGION}"
echo -e "Service URL: ${SERVICE_URL}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Test your app: ${SERVICE_URL}"
echo "2. Configure custom domain in LightSail console:"
echo "   - Go to LightSail > Container Services > ${SERVICE_NAME}"
echo "   - Click 'Custom domains' tab"
echo "   - Add domain: warren.vort-ex.com"
echo "   - Follow the DNS configuration instructions"
echo ""
echo -e "${GREEN}🔐 Login Credentials:${NC}"
echo "Email: admin@vort-ex.com"
echo "Password: admin123"
echo ""
echo -e "${BLUE}💰 Estimated Cost: ~\$7-15/month${NC}"
echo ""
echo -e "${GREEN}✨ Warren is now live on AWS LightSail Container Service!${NC}"