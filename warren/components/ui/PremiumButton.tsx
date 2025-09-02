"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useFeatures } from '@/contexts/FeaturesContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from './Button';
import { FeatureTooltip } from './FeatureTooltip';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface PremiumButtonProps {
  featureKey: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  onClick?: () => void;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  showPremiumIcon?: boolean;
  customLabel?: string;
}

export function PremiumButton({
  featureKey,
  children,
  icon,
  variant = 'secondary',
  className = '',
  onClick,
  tooltipPosition = 'top',
  showPremiumIcon = true,
  customLabel
}: PremiumButtonProps) {
  const { hasFeature, getFeature } = useFeatures();
  const { locale } = useLocale();
  const router = useRouter();

  const feature = getFeature(featureKey);
  const isPremium = hasFeature(featureKey);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (!isPremium) {
      router.push('/premium');
    }
  };

  // If user has the feature, render the children normally
  if (isPremium && children) {
    return <>{children}</>;
  }

  // Show premium button
  const featureName = feature?.name || customLabel || (locale?.startsWith('es') ? 'Función Premium' : 'Premium Feature');
  const featureDescription = feature?.description || (locale?.startsWith('es') ? 'Esta función requiere una suscripción premium' : 'This feature requires a premium subscription');
  
  const premiumStyle = variant === 'secondary' 
    ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
    : variant === 'outline'
    ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
    : 'bg-orange-600 text-white hover:bg-orange-700';

  return (
    <FeatureTooltip 
      title={featureName}
      description={featureDescription}
      position={tooltipPosition}
      className={className}
    >
      <Button
        variant={variant}
        onClick={handleClick}
        className={`${premiumStyle} whitespace-nowrap flex items-center text-sm min-h-[2.25rem]`}
      >
        {icon && <span className="mr-1 flex-shrink-0">{icon}</span>}
        {showPremiumIcon && <LockClosedIcon className="w-3 h-3 mr-1 flex-shrink-0" />}
        <span className="flex items-center truncate">
          {featureName}
        </span>
      </Button>
    </FeatureTooltip>
  );
}