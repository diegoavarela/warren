# Monday.com Integration Guide

## Overview
Warren integrates with Monday.com to automatically create leads from license requests. When users submit the license request form, the data is sent to your Monday.com board.

## Setup Instructions

### 1. Get Your Monday.com API Key
1. Log in to your Monday.com account
2. Click on your profile picture → **Developers**
3. Click on **My Access Tokens**
4. Generate a new token with the following scopes:
   - `boards:read`
   - `boards:write`
   - `webhooks:write` (optional, for future webhooks)

### 2. Get Your Board ID
1. Open the board where you want to create leads
2. Click on the three dots menu → **Copy board link**
3. The board ID is the number in the URL: `https://yourcompany.monday.com/boards/123456789`

### 3. Configure Environment Variables
Add the following to your backend `.env` file:
```env
MONDAY_API_KEY=your-api-key-here
MONDAY_BOARD_ID=your-board-id-here
```

### 4. Set Up Your Monday.com Board
Ensure your board has the following columns:

| Column Name | Type | Maps To |
|------------|------|---------|
| Name | Text | Full name (firstName + lastName) |
| Email | Email | workEmail |
| Phone | Phone | phone |
| Company | Text | companyName |
| Job Title | Text | jobTitle |
| Company Size | Dropdown | companySize |
| Industry | Text | industry |
| Use Case | Long Text | useCase |
| Timeline | Status | timeline |
| Additional Info | Long Text | additionalInfo |
| Source | Text | Always "Warren License Request" |
| Date | Date | Request submission date |

### 5. Column Mapping
The integration maps form fields to Monday.com columns:

- **Company Size Dropdown Values:**
  - `small` → 1-10 employees
  - `medium` → 11-50 employees
  - `large` → 51-200 employees
  - `xlarge` → 201-500 employees
  - `enterprise` → 500+ employees

- **Timeline Status Labels:**
  - `hot` → Immediately
  - `warm` → Within 1 week
  - `qualified` → Within 1 month
  - `nurture` → 1-3 months
  - `cold` → Just exploring

## Testing the Integration

### 1. Test Connection
```bash
curl http://localhost:3002/api/monday/test-connection
```

### 2. Submit a Test Lead
Visit `/request-license` on your Warren instance and submit a test request.

### 3. Check Monday.com
The lead should appear in your board within seconds.

## Webhook Configuration (Optional)

To receive updates from Monday.com:

1. In Monday.com, go to **Integrations Center**
2. Search for **Webhooks**
3. Add a new webhook with:
   - URL: `https://your-domain.com/api/monday/webhook`
   - Events: Choose what events you want to track

## Troubleshooting

### Lead Not Appearing in Monday.com
1. Check backend logs for errors
2. Verify API key has correct permissions
3. Ensure board ID is correct
4. Check column names match exactly

### API Key Not Working
- Regenerate the token in Monday.com
- Ensure no extra spaces in the `.env` file
- Restart the backend server after updating environment variables

### Column Mapping Issues
- Column IDs in Monday.com are case-sensitive
- Use the Monday.com API playground to verify column names
- Check that dropdown/status values exist in your board

## Without Monday.com Configuration
If Monday.com is not configured, the system will:
1. Log all lead data to the backend console
2. Return a success response to the frontend
3. Store leads in memory (lost on server restart)

This allows testing the form without a Monday.com account.