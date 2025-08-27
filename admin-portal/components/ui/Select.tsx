"use client";

import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
  extra?: string; // For showing additional info like counts
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className = "",
  disabled = false,
  loading = false
}: SelectProps) {
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={clsx("relative", className)}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={clsx(
          "w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          {
            "cursor-not-allowed bg-gray-50 text-gray-500": disabled || loading,
            "cursor-pointer hover:border-gray-400": !disabled && !loading
          }
        )}
      >
        <option value="" disabled>
          {loading ? "Loading..." : placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.extra && ` (${option.extra})`}
          </option>
        ))}
      </select>
      
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDownIcon 
          className={clsx("h-4 w-4", {
            "text-gray-400": disabled || loading,
            "text-gray-500": !disabled && !loading
          })} 
        />
      </div>
    </div>
  );
}