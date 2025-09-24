import React from 'react';

interface QuickBooksIconProps {
  className?: string;
  size?: number;
}

export function QuickBooksIcon({ className = "", size = 16 }: QuickBooksIconProps) {
  return (
    <div
      className={`inline-flex items-center justify-center font-semibold text-xs ${className}`}
      style={{ width: size, height: size }}
    >
      QB
    </div>
  );
}