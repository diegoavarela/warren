# Warren Container for AWS LightSail Container Service
# Multi-stage build for production deployment

# Frontend build stage
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# Backend build stage  
FROM node:18-alpine AS backend-build

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --silent

COPY backend/ ./
RUN npm run build

# Production stage with nginx + node
FROM nginx:alpine

# Install Node.js for the backend
RUN apk add --no-cache nodejs npm curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend build to nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Setup backend
WORKDIR /app
COPY --from=backend-build /app/backend/dist ./backend
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./

# Create startup script  
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "🚀 Starting Warren backend..."' >> /start.sh && \
    echo 'cd /app && node backend/index.js &' >> /start.sh && \
    echo 'sleep 2' >> /start.sh && \
    echo 'echo "🌐 Starting nginx..."' >> /start.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# Expose port 80 (LightSail Container Service requirement)
EXPOSE 80

# Health check for LightSail
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start both services
CMD ["/start.sh"]