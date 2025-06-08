# Warren - Vortex Cashflow Dashboard

A secure, modern web application for managing and visualizing cashflow data designed for C-level executives.

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with secure session management
- 📊 **Executive Dashboard** - Beautiful, responsive dashboard with key financial metrics
- 📈 **Cashflow Analysis** - Advanced analytics including 6-month projections and YTD summaries
- 📤 **Excel Integration** - Support for Office365 Excel files and manual file uploads
- 🌍 **Multi-language** - Spanish and English support
- 📱 **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- 🎨 **Vortex Branding** - Custom branded experience with company colors and logo

## Key Metrics Displayed

- Lowest and highest cash points (6-month forecast)
- Biggest and smallest cash gains (6-month forecast)  
- Revenue and costs year-to-date
- Financial highlights for past 3 months and next 6 months
- Interactive cashflow trend charts

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for modern styling
- Chart.js for data visualization
- React Router for navigation
- i18next for internationalization

### Backend
- Node.js with Express and TypeScript
- JWT authentication
- ExcelJS for Excel file processing
- Winston for logging
- Helmet for security headers
- Rate limiting and CORS protection

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:3000 and the backend at http://localhost:3001.

## Demo Credentials

- **Email:** admin@vortex.com
- **Password:** vortex123

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm run test
```

## Excel File Format

The application expects Excel files (.xlsx) with the following columns:

- **Column A:** Date
- **Column B:** Description  
- **Column C:** Revenue
- **Column D:** Costs

## Docker Development

```bash
cd docker
docker-compose up
```

## Security Features

- JWT authentication with secure token storage
- Input validation and sanitization
- Rate limiting to prevent abuse
- Helmet.js for security headers
- CORS protection
- Audit logging for data access

## Deployment

The application is containerized and ready for deployment with Docker. Update environment variables in production and ensure proper SSL/TLS configuration.

## Future Enhancements

- P&L by project analysis
- Office365 direct integration
- Advanced forecasting algorithms
- Additional data visualization options
- Mobile app companion

## License

MIT License - See LICENSE file for details