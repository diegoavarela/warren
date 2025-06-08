# Warren - Cashflow Management Dashboard

## Project Overview
Warren is a secure web application for managing and visualizing cashflow data for C-level executives. The platform supports both Office365 Excel integration and file uploads to provide comprehensive financial insights.

## Key Features
- **Secure Data Management**: All sensitive financial information is encrypted and protected
- **Dual Data Sources**: Office365 Excel integration + manual file upload
- **Executive Dashboard**: Beautiful, modern interface designed for C-level users
- **Key Metrics Display**:
  - Lowest/highest cash points (6-month forecast)
  - Biggest/smallest cash gains (6-month forecast)
  - Revenue YTD
  - Cost YTD
  - Financial highlights (last 3 months + next 6 months)
- **Multi-platform Support**: Responsive design for mobile, tablet, and desktop
- **Internationalization**: Spanish and English support
- **Vortex Branding**: Custom branded experience

## Technical Stack
- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with encryption
- **Authentication**: JWT with secure sessions
- **File Processing**: ExcelJS for .xlsx parsing
- **Styling**: Tailwind CSS
- **Deployment**: Docker containerization

## Project Structure
```
warren/
├── frontend/           # React TypeScript application
├── backend/           # Node.js API server
├── database/          # PostgreSQL schemas and migrations
├── docker/           # Containerization configs
├── Vortex/           # Branding assets and sample data
└── docs/             # Additional documentation
```

## Branding Assets
- **Logo**: Vortex horizontal and ISO versions (green spiral design)
- **Colors**: Primary green (#7CB342), black text
- **Sample Data**: Cashflow_2025.xlsx in Vortex folder

## Security Requirements
- All financial data encrypted at rest and in transit
- Secure authentication and authorization
- Input validation and sanitization
- Rate limiting and DDOS protection
- Audit logging for data access

## Development Commands
- `npm run dev`: Start development servers
- `npm run build`: Build production bundle
- `npm run test`: Run test suite
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript validation

## Future Phases
- P&L by project analysis
- Advanced financial forecasting
- Additional data visualization options