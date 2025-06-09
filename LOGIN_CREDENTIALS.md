# Warren Login Credentials

## Default Admin Credentials

**Email:** admin@vort-ex.com
**Password:** vortex123

## How to Change Credentials

To change the default credentials, update the following environment variables in `backend/.env`:

```
ADMIN_EMAIL=your-email@company.com
ADMIN_PASSWORD=your-secure-password
```

After changing, restart the backend server for the changes to take effect.

## Security Note

These are demo credentials. In a production environment:
1. Use a proper database to store user credentials
2. Implement proper password hashing with bcrypt
3. Use strong, unique passwords
4. Consider implementing OAuth2 or SSO integration