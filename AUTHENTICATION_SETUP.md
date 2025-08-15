# Warren V2 Authentication Setup

## 🔐 Problem: No Companies Showing

**Issue**: API endpoints work, but no companies are returned because you're not authenticated or not associated with the right organization.

## 📊 Available Test Data in Database:

### **Organizations:**
1. **Vortex** (`a70129ac-4b7d-4872-ad42-ea230825f333`)
2. **Demo Corporation** (`5af5804f-42fb-4d73-a634-cff83f49bb05`)  
3. **Warren Platform** (`e349d434-fb43-4ebd-96ed-a10199754a2e`)

### **Companies:**
1. **VTEX Solutions SRL** (`b1dea3ff-cac4-45cc-be78-5488e612c2a8`) - **HAS FINANCIAL DATA** ✅
2. **ReydeCopasSRL** (`277eb244-1885-4942-a40c-3d6fa3812c26`)
3. **Diego's Company** (`b00f41e8-53f7-4350-8e98-94e818d7c542`)
4. **Demo Company Inc** (`b72e7581-3a7a-4799-b4cf-ce2e24bb179e`)

### **Available Users:**
1. **admin@demo.com** (company_admin, Demo Corporation)
2. **user@demo.com** (user, Demo Corporation)
3. **admin@warren.com** (super_admin, Warren Platform)
4. **platform@warren.com** (super_admin, Warren Platform)
5. **mario.aguero@vort-ex.com** (user, Vortex)

## 🚀 **Solution: Use Development Authentication**

### **Option 1: Quick Setup (Recommended)**
1. **Open browser** at: `http://localhost:4000`
2. **Open browser console** (F12) and run:
   ```javascript
   // Authenticate as super admin (can see all companies)
   await devLogin('admin@warren.com', 'super_admin');
   
   // Refresh to load companies
   window.location.reload();
   ```

### **Option 2: Use Vortex User (Has the Test Data)**
```javascript
// Login as Vortex user (has access to company with financial data)
await devLogin('mario.aguero@vort-ex.com', 'user', 'a70129ac-4b7d-4872-ad42-ea230825f333');

// Set the company with financial data
sessionStorage.setItem('selectedCompanyId', 'b1dea3ff-cac4-45cc-be78-5488e612c2a8');
sessionStorage.setItem('selectedCompanyName', 'VTEX Solutions SRL');

// Go to Cash Flow dashboard
window.location.href = '/dashboard/company-admin/cashflow';
```

### **Option 3: Use Demo Admin (Clean Access)**
```javascript
// Login as demo admin
await devLogin('admin@demo.com', 'company_admin', '5af5804f-42fb-4d73-a634-cff83f49bb05');

// Refresh to see Demo Company
window.location.reload();
```

## 🧪 **Step-by-Step Testing:**

### **Step 1: Authenticate**
1. Go to: `http://localhost:4000`
2. Open browser console (F12)
3. Run: `await devLogin('admin@warren.com', 'super_admin');`
4. Refresh the page

### **Step 2: Verify Companies Load**
1. Navigate to: `/dashboard/company-admin`
2. **Expected**: Should show 4 companies available
3. **If still empty**: Check browser console for errors

### **Step 3: Test with Financial Data**
1. **In browser console**:
   ```javascript
   // Set the company that has verified financial data
   sessionStorage.setItem('selectedCompanyId', 'b1dea3ff-cac4-45cc-be78-5488e612c2a8');
   
   // Navigate to Cash Flow dashboard
   window.location.href = '/dashboard/company-admin/cashflow';
   ```

2. **Expected Results**:
   - Final Balance: 13,308,616.55 ARS (August 2025)
   - Monthly Generation: 5,484,958.97 ARS
   - Total Inflows: 60,201,807.32 ARS
   - 12 months of verified data

## 🔧 **Troubleshooting:**

### **If Still No Companies:**
```javascript
// Check authentication status
await devAuthStatus();

// Check what the API returns
fetch('/api/companies').then(r => r.json()).then(d => console.log('Companies:', d));

// Check current user
fetch('/api/auth/me').then(r => r.json()).then(d => console.log('Current user:', d));
```

### **If 401 Unauthorized:**
```javascript
// Clear auth and retry
devLogout();
await devLogin('admin@warren.com', 'super_admin');
window.location.reload();
```

## 📋 **Success Checklist:**
- [ ] Authenticated successfully
- [ ] Companies appear in company admin dashboard
- [ ] Can select company with financial data
- [ ] Cash Flow dashboard shows real data (13.3M ARS final balance)
- [ ] No console errors

## 🎯 **Target Company for Testing:**
**VTEX Solutions SRL** (`b1dea3ff-cac4-45cc-be78-5488e612c2a8`)
- ✅ Has processed financial data
- ✅ 100% verified accuracy 
- ✅ 12 months of Cash Flow data
- ✅ All dashboard widgets will populate

---

**Ready to authenticate and test the full system! 🚀**