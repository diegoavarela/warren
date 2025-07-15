"use client";

import React from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export interface BreadcrumbStep {
  label: string;
  href?: string;
  current?: boolean;
  completed?: boolean;
}

interface BreadcrumbsProps {
  steps: BreadcrumbStep[];
  className?: string;
}

export function Breadcrumbs({ steps, className = "" }: BreadcrumbsProps) {
  const router = useRouter();

  const handleStepClick = (step: BreadcrumbStep) => {
    if (step.href && !step.current) {
      router.push(step.href);
    }
  };

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2 flex-shrink-0" />
          )}
          
          <button
            onClick={() => handleStepClick(step)}
            disabled={step.current || !step.href}
            className={`
              font-medium transition-colors truncate
              ${step.current 
                ? 'text-blue-600 cursor-default' 
                : step.completed
                  ? 'text-gray-700 hover:text-blue-600 cursor-pointer'
                  : step.href
                    ? 'text-gray-500 hover:text-gray-700 cursor-pointer'
                    : 'text-gray-400 cursor-default'
              }
            `}
            title={step.label}
          >
            {step.label}
          </button>
        </div>
      ))}
    </nav>
  );
}

interface WorkflowBreadcrumbsProps {
  currentStep: 'upload' | 'select-sheet' | 'map-accounts' | 'save';
  fileName?: string;
  className?: string;
}

export function WorkflowBreadcrumbs({ 
  currentStep, 
  fileName, 
  className = "" 
}: WorkflowBreadcrumbsProps) {
  const getStepNumber = (step: string) => {
    const steps = ['upload', 'select-sheet', 'map-accounts', 'save'];
    return steps.indexOf(step) + 1;
  };

  const isCompleted = (step: string) => {
    const steps = ['upload', 'select-sheet', 'map-accounts', 'save'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    return stepIndex < currentIndex;
  };

  const steps: BreadcrumbStep[] = [
    {
      label: "Dashboard",
      href: "/dashboard/company-admin",
      completed: true
    },
    {
      label: "Upload",
      href: currentStep === 'upload' ? undefined : "/upload",
      current: currentStep === 'upload',
      completed: isCompleted('upload')
    },
    {
      label: "Select Sheet",
      href: currentStep === 'select-sheet' ? undefined : (isCompleted('select-sheet') ? "/select-sheet" : undefined),
      current: currentStep === 'select-sheet',
      completed: isCompleted('select-sheet')
    },
    {
      label: "Map Accounts",
      href: currentStep === 'map-accounts' ? undefined : (isCompleted('map-accounts') ? "/enhanced-mapper" : undefined),
      current: currentStep === 'map-accounts',
      completed: isCompleted('map-accounts')
    },
    {
      label: "Save",
      current: currentStep === 'save',
      completed: isCompleted('save')
    }
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <Breadcrumbs steps={steps} />
      
      {/* Progress indicator */}
      <div className="flex items-center space-x-3 text-xs text-gray-500">
        <span>Step {getStepNumber(currentStep)} of 4</span>
        {fileName && (
          <>
            <span>•</span>
            <span className="font-medium text-gray-700 truncate max-w-48" title={fileName}>
              {fileName}
            </span>
          </>
        )}
      </div>
    </div>
  );
}