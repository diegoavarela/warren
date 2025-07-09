# CLAUDE.md - Warren V2 Development Guidelines

## Project Overview
Warren V2 is a financial analytics platform that helps organizations manage and analyze their P&L and Cash Flow data through an intuitive dashboard interface.

## Key Reference Documents
- **User_Journey_Maps.md** - CRITICAL: Defines all user flows, requirements, and expected behaviors
- **lib/db/schema.ts** - Database schema and relationships
- **lib/auth/rbac.ts** - Role-based access control definitions

## User Roles (Per User_Journey_Maps.md)
1. **Platform Admin** - Manages companies and organization admins
2. **Organization Admin** - Manages companies, users, and templates within their organization
3. **Regular User** - Views P&L and Cash Flow data only

## Critical Requirements

### UI/UX Standards
- **Font Readability**: All financial data must be clearly readable with appropriate font sizes
- **Card Structure**: Consistent, well-structured cards for all widgets
- **Help System**: Every card/widget must have a "?" help icon with multilingual explanations
- **Button Consistency**: Same text and styling for similar actions
- **No Page Refreshes**: Smooth SPA experience without unexpected refreshes

### Multilingual Support
- All UI elements must support multiple languages
- Use translations from `lib/translations.ts`
- Currency selector must show country flags
- Help content must be available in all supported languages

### Navigation Flow
1. **Upload Flow**: Upload → Template Selection → Mapping → Save → P&L Dashboard
2. **Dashboard Access**: Only P&L and Cash Flow (NO Executive Dashboard)
3. **Company Context**: Must persist throughout all pages

### Dashboard Requirements

#### P&L Dashboard Must Include:
1. Company - Period - Last update (at top)
2. Filters: Period, Compare with, Currency, Units
3. YTD Section (improved design)
4. Revenue Section (readable fonts)
5. Costs Section (readable fonts)
6. Personnel Costs widget
7. Revenue Growth Analysis widget
8. Profitability Section
9. Operating Expenses Analysis (hide if no data)
10. Cost Efficiency & Tax Summary
11. Trends Analysis with proper 6-month view
12. Heatmaps with labels and click-to-recalculate
13. Bank Summary & Investment Portal with titles
14. Key Insights

#### Cash Flow Dashboard:
- To be defined (pending in User_Journey_Maps.md)

### Upload Process Requirements
1. Template selection at start (organization-wide templates)
2. Auto-detect units immediately
3. Clear instructions for Visual Mapper
4. Show AI analysis progress
5. Consistent button naming
6. Filter empty rows
7. Improved validation summary UI
8. Navigate to P&L after save

### Security & Authentication
- Platform Admin: Mandatory 2FA
- Organizations: Optional 2FA configuration
- Email invites for new users
- Proper session management

### Technical Requirements
- Database: NEON PostgreSQL
- Deployment: Vercel
- Email: AWS SES Lambda
- Testing: Jest + Playwright (80% coverage)
- Export: Professional PDF/Excel formats

## Development Guidelines

### Component Standards
```typescript
// Every dashboard widget must follow this pattern
interface WidgetProps {
  data: any;
  onHelp?: () => void;
  locale: string;
  companyId: string;
  period: string;
}

// Help modal for every widget
<HelpIcon onClick={() => showHelp('widget.help.key')} />
```

### State Management
- Company context in sessionStorage and React Context
- Persist user preferences (language, currency, units)
- Clear loading and error states

### API Patterns
```typescript
// All API calls must handle:
- Loading states
- Error messages (multilingual)
- Success notifications
- Proper type safety
```

### Testing Requirements
- Unit tests for all components
- Integration tests for flows
- E2E tests for user journeys
- Visual regression tests for dashboards

## Common Issues to Avoid
1. Don't create new dashboards - only P&L and Cash Flow
2. Don't add features not in User_Journey_Maps.md
3. Don't skip help icons or multilingual support
4. Don't create inconsistent UI patterns
5. Don't ignore readability issues

## When Implementing:
1. Always check User_Journey_Maps.md first
2. Ensure multilingual support
3. Add help content
4. Test with different screen sizes
5. Verify role-based access
6. Check loading states
7. Ensure smooth navigation without refreshes

## Questions to Ask:
- Does this match the User Journey?
- Is it multilingual?
- Does it have help?
- Is the data readable?
- Does it work for all 3 user types?
- Is the navigation clear?