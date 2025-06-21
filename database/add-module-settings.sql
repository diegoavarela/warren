-- Add separate settings for P&L and Cashflow modules
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pnl_settings JSONB DEFAULT jsonb_build_object(
    'currency', 'ARS',
    'unit', 'thousands',
    'enableCurrencyConversion', true,
    'showCurrencySelector', true
),
ADD COLUMN IF NOT EXISTS cashflow_settings JSONB DEFAULT jsonb_build_object(
    'currency', 'ARS', 
    'unit', 'units',
    'enableCurrencyConversion', true,
    'showCurrencySelector', true
);

-- Update existing company with current settings
UPDATE companies 
SET 
    pnl_settings = jsonb_build_object(
        'currency', COALESCE(currency, default_currency, 'ARS'),
        'unit', COALESCE(scale, default_unit, 'thousands'),
        'enableCurrencyConversion', COALESCE(enable_currency_conversion, true),
        'showCurrencySelector', COALESCE(show_currency_selector, true)
    ),
    cashflow_settings = jsonb_build_object(
        'currency', COALESCE(currency, default_currency, 'ARS'),
        'unit', 'units', -- Cashflow in units as you mentioned
        'enableCurrencyConversion', COALESCE(enable_currency_conversion, true),
        'showCurrencySelector', COALESCE(show_currency_selector, true)
    )
WHERE is_active = true;