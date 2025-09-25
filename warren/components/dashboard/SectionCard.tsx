import React from 'react';
import { HelpIcon } from '../HelpIcon';

interface SectionCardProps {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  backgroundColor: 'green' | 'red' | 'blue';
  children: React.ReactNode;
  helpTopic?: string;
}

const backgroundColors = {
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500'
};

const textColors = {
  green: 'text-white',
  red: 'text-white',
  blue: 'text-white'
};

export function SectionCard({
  title,
  icon: Icon,
  backgroundColor,
  children,
  helpTopic
}: SectionCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      {/* Section Header - Only this has color */}
      <div className={`${backgroundColors[backgroundColor]} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h2 className={`text-lg font-semibold ${textColors[backgroundColor]}`}>
              {title}
            </h2>
          </div>

          {helpTopic && (
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <HelpIcon topic={helpTopic} className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Content area - White background, no additional styling */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}