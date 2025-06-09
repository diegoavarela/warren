interface VortexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'iso' | 'icon';
}

export function VortexLogo({ className = '', size = 'md', variant = 'horizontal' }: VortexLogoProps) {
  const sizeClasses = {
    sm: variant === 'horizontal' ? 'h-6' : 'w-6 h-6',
    md: variant === 'horizontal' ? 'h-8' : 'w-8 h-8',
    lg: variant === 'horizontal' ? 'h-12' : 'w-12 h-12',
    xl: variant === 'horizontal' ? 'h-16' : 'w-16 h-16'
  };

  if (variant === 'horizontal') {
    return (
      <img
        src="/vortex-horizontal.png"
        alt="Vortex"
        className={`${sizeClasses[size]} ${className} object-contain`}
      />
    );
  }

  if (variant === 'iso') {
    return (
      <img
        src="/vortex-iso.png"
        alt="Vortex"
        className={`${sizeClasses[size]} ${className} object-contain`}
      />
    );
  }

  // Fallback icon variant (simplified version)
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <img
        src="/vortex-iso.png"
        alt="Vortex"
        className="w-full h-full object-contain"
      />
    </div>
  );
}