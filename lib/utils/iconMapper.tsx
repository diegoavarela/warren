import React from 'react';
import {
  StarIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  BanknotesIcon,
  CalculatorIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  LockClosedIcon,
  CloudIcon,
  BellIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  PlayIcon,
  RocketLaunchIcon,
  TrophyIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

// Map of icon name strings to Heroicon components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Basic icons
  'star': StarIcon,
  'check': CheckIcon,
  'clock': ClockIcon,
  'warning': ExclamationTriangleIcon,
  'chat': ChatBubbleLeftIcon,
  'external-link': ArrowTopRightOnSquareIcon,
  'sparkles': SparklesIcon,
  'shield': ShieldCheckIcon,
  'info': InformationCircleIcon,
  'lightbulb': LightBulbIcon,
  'search': MagnifyingGlassIcon,
  'paint': PaintBrushIcon,
  'play': PlayIcon,
  'rocket': RocketLaunchIcon,
  'trophy': TrophyIcon,
  'tools': WrenchScrewdriverIcon,

  // Financial & business icons
  'chart-bar': ChartBarIcon,
  'chart-pie': ChartPieIcon,
  'document': DocumentTextIcon,
  'document-chart': DocumentChartBarIcon,
  'calculator': CalculatorIcon,
  'banknotes': BanknotesIcon,
  'credit-card': CreditCardIcon,
  'currency': CurrencyDollarIcon,
  'presentation': PresentationChartLineIcon,
  'building': BuildingOfficeIcon,

  // Technical icons
  'cog': CogIcon,
  'settings': CogIcon,
  'cloud': CloudIcon,
  'lock': LockClosedIcon,
  'bell': BellIcon,
  'envelope': EnvelopeIcon,
  'phone': PhoneIcon,
  'globe': GlobeAltIcon,

  // Team icons
  'users': UserGroupIcon,
  'team': UserGroupIcon,
};

export interface IconProps {
  name?: string;
  className?: string;
  fallback?: React.ComponentType<{ className?: string }>;
}

export function DynamicIcon({ 
  name, 
  className = "w-5 h-5", 
  fallback = StarIcon 
}: IconProps) {
  if (!name) {
    const FallbackIcon = fallback;
    return <FallbackIcon className={className} />;
  }

  const IconComponent = iconMap[name.toLowerCase()];
  
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // If no matching icon found, use fallback
  const FallbackIcon = fallback;
  return <FallbackIcon className={className} />;
}

export { iconMap };