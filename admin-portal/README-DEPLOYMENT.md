# Warren Admin Portal - Vercel Deployment Guide

## 🚀 Deployment Steps

### 1. Create New Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Select your GitHub repository
4. Set **Root Directory** to: `admin-portal`
5. Framework will auto-detect as "Next.js"

### 2. Environment Variables
Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Security Keys (GENERATE NEW ONES!)
JWT_SECRET=your_production_jwt_secret_at_least_32_chars_long
ENCRYPTION_KEY=your_production_encryption_key_32_chars  
API_SECRET_KEY=your_production_api_secret_key_32_chars

# URLs (Update with your actual domain)
NEXTAUTH_URL=https://admin.warren.vort-ex.com
APP_URL=https://admin.warren.vort-ex.com

# Configuration
NODE_ENV=production
MAX_FILE_SIZE=52428800
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000
```

### 3. Generate Production Keys
Run these commands to generate secure keys:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
node -e "console.log('API_SECRET_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Domain Configuration
1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain: `admin.warren.vort-ex.com`
3. Configure DNS A record to point to Vercel

### 5. Build Settings
Vercel will automatically use these settings from `vercel.json`:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm ci`
- **Node Version**: 18.x

## 📁 Files Added for Deployment

- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to ignore during deployment
- `next.config.js` - Updated with production optimizations
- `.env.production.example` - Environment variables template

## 🔒 Security Features

- Security headers (X-Frame-Options, CSP, etc.)
- CORS configuration for API routes
- Rate limiting ready
- JWT authentication

## 🧪 Testing Deployment

After deployment:
1. Check build logs for any errors
2. Test login functionality
3. Verify API endpoints work
4. Check database connectivity
5. Test admin features

## 📊 Monitoring

- Enable Vercel Analytics
- Set up error tracking
- Monitor API performance
- Check database connection health

## 🔄 CI/CD

Vercel will automatically deploy:
- **Main branch** → Production
- **Feature branches** → Preview deployments

## 🆘 Troubleshooting

**Common issues:**
- Build failures: Check Node version compatibility
- Database errors: Verify connection string and SSL settings
- Authentication issues: Confirm JWT_SECRET matches
- API errors: Check CORS and environment variables