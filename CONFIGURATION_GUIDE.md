# Warren Multi-Tenant Configuration Guide

## ✅ **Configuration Checklist**

### **1. Database Configuration (REQUIRED)**

Your PostgreSQL database should be running and accessible:

```bash
# Test database connection
psql warren_dev -c "SELECT 'Database OK' as status;"
```

**Current Status:** ✅ Configured and working
- Database: `warren_dev` 
- User: `postgres` (no password needed locally)
- All tables created and migrated

### **2. Environment Variables (REQUIRED)**

**✅ ALREADY CONFIGURED:**
- `ENCRYPTION_MASTER_KEY` - ✅ Generated and set
- `DATABASE_URL` - ✅ Configured for local PostgreSQL
- `JWT_SECRET` - ⚠️ Uses default (should change for production)
- `EMAIL_PROVIDER=console` - ✅ Set for development

**🔧 NEED TO CONFIGURE:**
- `EXCHANGE_RATE_API_KEY` - Your existing API key
- `OPENAI_API_KEY` - Your existing API key

### **3. Email Service (FOR INVITATIONS)**

**Current:** Console logging (development mode)
**For Production:** Choose one option:

#### Option A: AWS SES (Recommended - $0.10/1000 emails)
```env
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

#### Option B: SendGrid (Free tier: 100 emails/day)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
```

#### Option C: SMTP (Any email provider)
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **4. Frontend URL Configuration**

Update for your deployment:
```env
FRONTEND_URL=http://localhost:3000  # Development
# FRONTEND_URL=https://your-domain.com  # Production
```

## 🧪 **Testing Your Configuration**

### **1. Test Backend Startup**
```bash
cd backend
npm run dev
```
Should see: "Warren backend server running on port 3002"

### **2. Test Database Connection**
```bash
curl http://localhost:3002/health
```
Should return: `{"status":"OK","timestamp":"..."}`

### **3. Test Authentication**
```bash
node test-multitenant.js
```

### **4. Test Multi-Tenant Login**
```bash
curl -X POST http://localhost:3002/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vort-ex.com","password":"vortex123"}'
```

## 🎯 **Default Accounts Created**

### Platform Admin (Full Access)
- **Email:** `platform@warren.ai`
- **Password:** `Admin123!`
- **Role:** Platform Administrator
- **Access:** All features, all companies

### Company Admin (Vortex Company)
- **Email:** `admin@vort-ex.com` 
- **Password:** `vortex123`
- **Role:** Company Administrator
- **Access:** Manage Vortex users and data

## 🚀 **Quick Start Commands**

### **Start Backend Server**
```bash
cd backend && npm run dev
```

### **Run All Tests**
```bash
# Test database
psql warren_dev -c "SELECT count(*) as users FROM users;"

# Test backend
curl http://localhost:3002/health

# Test authentication
node test-multitenant.js
```

### **Check Database Status**
```bash
psql warren_dev -c "
SELECT 
  'Companies' as type, count(*) as count FROM companies
UNION ALL
SELECT 'Users', count(*) FROM users  
UNION ALL
SELECT 'Platform Admins', count(*) FROM users WHERE role = 'platform_admin';"
```

## ⚡ **What's Working Right Now**

✅ **Database:** All tables created and populated
✅ **Authentication:** Multi-tenant login system
✅ **2FA:** TOTP setup and verification  
✅ **Email:** Console logging (development)
✅ **Encryption:** All numeric data encrypted
✅ **Permissions:** Role-based access control
✅ **API:** New endpoints `/api/v2/auth` and `/api/v2/users`

## 🔧 **Next Steps Based on Your Needs**

### **For Development/Testing**
- ✅ Everything is ready to go!
- Just start the backend: `npm run dev`

### **For Production Deployment**
1. **Change JWT Secret:**
   ```env
   JWT_SECRET=your-super-secure-random-key-here
   ```

2. **Set up Email Service:**
   - AWS SES (recommended)
   - SendGrid 
   - Or SMTP with your email provider

3. **Update Frontend URL:**
   ```env
   FRONTEND_URL=https://your-production-domain.com
   ```

### **For Email Invitations**
- Choose email provider (see options above)
- Test invitation flow: `POST /api/v2/users/invite`

## 🆘 **If Something Doesn't Work**

### **Database Issues**
```bash
# Recreate database
dropdb warren_dev && createdb warren_dev
./setup-local-db.sh
```

### **Backend Won't Start**
```bash
# Check dependencies
npm install

# Check TypeScript compilation
npm run build

# Check environment
cat backend/.env | grep -E '^[A-Z]'
```

### **Authentication Issues**
```bash
# Check user accounts exist
psql warren_dev -c "SELECT email, role FROM users;"

# Test platform admin login
curl -X POST http://localhost:3002/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"platform@warren.ai","password":"Admin123!"}'
```

---

**🎉 Your multi-tenant Warren system is ready to use!**

**Next step:** Start the backend and test with `node test-multitenant.js`