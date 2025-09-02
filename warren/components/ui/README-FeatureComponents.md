# Feature UI Components

This document explains how to use the feature-related UI components for displaying premium features with proper descriptions and tooltips.

## Components

### 1. FeatureTooltip
A reusable tooltip component that shows feature information on hover.

```tsx
import { FeatureTooltip } from '@/components/ui/FeatureTooltip';

<FeatureTooltip 
  title="Feature Name"
  description="Detailed description of what this feature does"
  position="top" // top, bottom, left, right
>
  <button>Your Button</button>
</FeatureTooltip>
```

### 2. PremiumButton
A generic button component for premium features that automatically handles:
- Feature detection
- Premium state display
- Tooltips with feature information
- Navigation to premium page

```tsx
import { PremiumButton } from '@/components/ui/PremiumButton';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

<PremiumButton
  featureKey="ADVANCED_EXPORT"
  icon={<DocumentArrowDownIcon className="w-4 h-4" />}
  variant="secondary"
  tooltipPosition="top"
  customLabel="Custom Label" // Optional override
>
  {/* Optional: Content to show when feature is enabled */}
  <YourEnabledComponent />
</PremiumButton>
```

### 3. ExportButton (Updated)
The export button now uses the feature system to show proper information:

```tsx
import { ExportButton } from '@/components/ui/ExportButton';

<ExportButton
  dashboardType="cashflow"
  companyId="company-id"
  companyName="Company Name"
  period="2025-08"
/>
```

## Feature Display Logic

The system follows this logic for feature visibility:

1. **Baseline features**: Always visible and usable
2. **Public + granted**: Visible and usable  
3. **Public + not granted**: Visible with premium button + tooltip
4. **Private + granted**: Visible and usable
5. **Private + not granted**: Not visible at all

## Feature Data Structure

Each feature includes:
- `key`: Unique identifier
- `name`: Display name
- `description`: What the feature does
- `enabled`: Whether user has access
- `isPublic`: Whether feature is visible to all
- `isBaseline`: Whether feature is free for everyone

## Usage Examples

### Simple Premium Feature
```tsx
<PremiumButton
  featureKey="CUSTOM_BRANDING"
  variant="outline"
/>
```

### Premium Feature with Custom Action
```tsx
<PremiumButton
  featureKey="API_ACCESS"
  onClick={() => setShowAPIDialog(true)}
  customLabel="API Settings"
>
  <APISettingsButton />
</PremiumButton>
```

### Feature with Custom Tooltip
```tsx
<FeatureTooltip
  title="Financial Manual"
  description="Comprehensive financial guide and best practices"
>
  <Button onClick={openManual}>
    📖 Financial Guide
  </Button>
</FeatureTooltip>
```

## Best Practices

1. Always use feature keys from `@/lib/constants/features`
2. Provide meaningful descriptions that explain the value
3. Use appropriate tooltip positions to avoid UI clipping
4. Test with both enabled and disabled states
5. Consider mobile responsiveness for tooltips