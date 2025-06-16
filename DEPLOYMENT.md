# Warren Deployment Guide

## Frontend Deployment to Vercel

### Prerequisites
- Vercel account (https://vercel.com)
- Backend deployed somewhere (Heroku, Railway, etc.)

### Step 1: Prepare for Deployment

1. Update frontend services to use environment variables:
   ```typescript
   // In all service files, replace hardcoded URLs:
   // OLD: fetch('http://localhost:3002/api/...')
   // NEW: fetch(`${API_BASE_URL}/api/...`)
   ```

2. Create `.env.production` in frontend folder:
   ```env
   VITE_API_URL=https://your-backend-url.com
   ```

### Step 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Follow prompts to:
# - Create new project
# - Use existing settings
# - Deploy
```

### Step 3: Deploy via GitHub Integration

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Configure:
   - Branch: `v1-stable`
   - Root Directory: `.` (keep as is)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
5. Add Environment Variables:
   - `VITE_API_URL`: Your backend URL
6. Deploy

### Step 4: Configure Backend CORS

Update backend to allow Vercel domain:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-app.vercel.app',
    /\.vercel\.app$/  // Allow all Vercel preview URLs
  ],
  credentials: true
}))
```

## Backend Deployment Options

### Option 1: Heroku (Recommended for Quick Setup)

1. Install Heroku CLI
2. Create `Procfile` in backend folder:
   ```
   web: node dist/index.js
   ```
3. Deploy:
   ```bash
   cd backend
   heroku create warren-backend
   heroku config:set JWT_SECRET=your-secret-key
   git push heroku main
   ```

### Option 2: Railway (Easiest)

1. Go to https://railway.app
2. Connect GitHub repo
3. Select backend folder
4. Add environment variables
5. Deploy

### Option 3: Render

1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index.js`
5. Add environment variables
6. Deploy

## Environment Variables Needed

### Frontend (Vercel)
- `VITE_API_URL`: Backend API URL

### Backend (Any platform)
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Port number (usually provided by platform)
- `NODE_ENV`: production
- `ADMIN_EMAIL`: admin@vort-ex.com
- `ADMIN_PASSWORD`: vortex123
- `CORS_ORIGIN`: Your Vercel app URL

## Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Can access demo mode (/demo/cashflow)
- [ ] Login works with demo account
- [ ] API calls succeed (check Network tab)
- [ ] CORS is properly configured
- [ ] Environment variables are set
- [ ] Custom domain configured (optional)

## Troubleshooting

### API calls failing
- Check VITE_API_URL is set correctly
- Verify backend is running
- Check CORS configuration

### 404 errors on refresh
- Ensure rewrites are configured in vercel.json

### Build failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node version compatibility