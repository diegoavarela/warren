# Warren v2-Analysis Release Plan for AWS Lightsail

## Overview
This document outlines the deployment process for Warren v2-analysis to an AWS Lightsail server, including all necessary steps for database setup, application deployment, and security configuration.

## Prerequisites

### Lightsail Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **Instance Size**: Minimum 2GB RAM, 1 vCPU
- **Storage**: At least 20GB SSD
- **Ports**: 80 (HTTP), 443 (HTTPS), 22 (SSH), 5432 (PostgreSQL - internal only)

### Required Software on Server
- Node.js 18+ and npm
- PostgreSQL 14+
- Nginx (reverse proxy)
- PM2 (process manager)
- Git
- SSL Certificate (Let's Encrypt recommended)

## Pre-Deployment Checklist

- [ ] Backup existing data (if any)
- [ ] Verify Lightsail instance is running
- [ ] Ensure domain is pointed to Lightsail IP
- [ ] Have SSH access to the server
- [ ] Create environment variables file

## Deployment Steps

### 1. Server Preparation

```bash
# Connect to your Lightsail instance
ssh -i your-key.pem ubuntu@your-lightsail-ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx git

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should be 18+
npm --version
psql --version  # Should be 14+
```

### 2. PostgreSQL Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE warren_db;
CREATE USER warren_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE warren_db TO warren_user;
\q

# Configure PostgreSQL for local connections
sudo nano /etc/postgresql/14/main/postgresql.conf
# Ensure: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: local all warren_user md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/warren
sudo chown -R $USER:$USER /var/www/warren

# Clone the repository
cd /var/www/warren
git clone https://github.com/your-repo/warren.git .
git checkout v2-analysis

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install && npm run build
```

### 4. Database Migrations

```bash
# Run database schemas
cd /var/www/warren
psql -U warren_user -d warren_db -f database/users_schema.sql
psql -U warren_user -d warren_db -f database/file_uploads_schema.sql
```

### 5. Environment Configuration

Create `/var/www/warren/backend/.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=warren_db
DB_USER=warren_user
DB_PASSWORD=your-secure-password

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key-here

# API URLs
FRONTEND_URL=https://your-domain.com
API_URL=https://your-domain.com/api

# Office365 (if using)
OFFICE365_CLIENT_ID=your-client-id
OFFICE365_CLIENT_SECRET=your-client-secret
OFFICE365_TENANT_ID=your-tenant-id
```

### 6. Nginx Configuration

Create `/etc/nginx/sites-available/warren`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Force HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration (update paths after Let's Encrypt setup)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        root /var/www/warren/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size limit
    client_max_body_size 50M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/warren /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### 8. PM2 Process Management

Create `/var/www/warren/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'warren-backend',
    script: '/var/www/warren/backend/dist/index.js',
    instances: 2,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/warren/error.log',
    out_file: '/var/log/warren/out.log',
    log_file: '/var/log/warren/combined.log',
    time: true
  }]
};
```

Start the application:
```bash
# Create log directory
sudo mkdir -p /var/log/warren
sudo chown -R $USER:$USER /var/log/warren

# Build backend
cd /var/www/warren/backend
npm run build

# Start with PM2
pm2 start /var/www/warren/ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
```

### 9. Security Hardening

```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create backup script
cat > /home/ubuntu/backup-warren.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U warren_user warren_db > $BACKUP_DIR/warren_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-warren.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-warren.sh") | crontab -
```

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check PM2 status
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql

# Test API endpoint
curl https://your-domain.com/api/health

# Check logs
pm2 logs warren-backend --lines 50
```

### 2. Functional Testing
- [ ] Access the application at https://your-domain.com
- [ ] Test user login/registration
- [ ] Upload a test Excel file
- [ ] Verify cashflow visualizations
- [ ] Check P&L reports
- [ ] Test language switching (ES/EN)

### 3. Performance Monitoring
```bash
# Monitor resources
htop

# Monitor PM2
pm2 monit

# Check disk space
df -h

# Database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## Rollback Plan

If deployment fails:

1. **Quick Rollback**:
```bash
cd /var/www/warren
git checkout previous-commit-hash
cd backend && npm install && npm run build
pm2 restart warren-backend
```

2. **Database Rollback**:
```bash
# Restore from backup
psql -U warren_user warren_db < /home/ubuntu/backups/warren_db_YYYYMMDD.sql
```

## Maintenance Tasks

### Weekly
- Review application logs
- Check disk space
- Verify backups are running

### Monthly
- Update system packages
- Review security logs
- SSL certificate renewal check
- Database optimization: `sudo -u postgres vacuumdb -z warren_db`

### Quarterly
- Review and update dependencies
- Security audit
- Performance optimization review

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend is running: `pm2 status`
   - Check logs: `pm2 logs warren-backend`
   - Verify port configuration

2. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check credentials in .env
   - Test connection: `psql -U warren_user -d warren_db -h localhost`

3. **File Upload Failures**
   - Check disk space: `df -h`
   - Verify upload directory permissions
   - Check Nginx client_max_body_size

4. **SSL Certificate Issues**
   - Renew certificate: `sudo certbot renew`
   - Check Nginx configuration: `sudo nginx -t`

## Support Contacts

- **Application Issues**: [Your contact]
- **Server/Infrastructure**: [AWS Support]
- **Emergency**: [Emergency contact]

## Version Information

- **Release**: v2-analysis
- **Backend API Version**: Check /api/version endpoint
- **Database Schema Version**: 2.0
- **Deployment Date**: [To be filled]

---

Remember to update this document with any changes made during deployment!