# Neon Database Setup Guide

## Prerequisites
- Node.js installed
- A Neon account (free tier is fine)

## Step 1: Create Your Neon Database

1. Go to [https://neon.tech](https://neon.tech) and sign up
2. Click "Create a project"
3. Name it: `warren-financial` (or your preferred name)
4. Select a region close to you
5. Click "Create project"

## Step 2: Get Your Connection String

1. In your Neon dashboard, go to the "Connection Details" section
2. Copy the connection string (it looks like this):
   ```
   postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Configure Environment Variables

1. Generate secure keys:
   ```bash
   node scripts/generate-keys.js
   ```

2. Update your `.env.local` file with:
   - Your Neon connection string
   - The generated keys

## Step 4: Create Database Schema

Run these commands in order:

```bash
# Generate migration files from schema
npm run db:generate

# Run migrations to create tables
npm run db:migrate
```

## Step 5: Verify Connection

Test your database connection:

```bash
# This should show your database tables
npm run db:push
```

## Step 6: (Optional) Seed Initial Data

Create an admin user and sample data:

```bash
node scripts/seed-database.js
```

## Troubleshooting

### Connection Refused
- Check your connection string is correct
- Ensure your IP is allowed in Neon settings

### Migration Errors
- Make sure all migrations ran successfully
- Check the `drizzle` folder for migration files

### Environment Variable Issues
- Ensure `.env.local` is not committed to git
- Restart your dev server after changing env vars

## Security Reminders

⚠️ **IMPORTANT**:
- Never commit `.env.local` to git
- Regenerate your OpenAI API key if it was exposed
- Use strong, unique passwords for database users
- Enable 2FA on your Neon account

## Next Steps

After setup is complete:
1. Start your dev server: `npm run dev`
2. Test creating users and companies
3. Verify data persists across restarts