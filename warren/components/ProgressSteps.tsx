"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import { ProgressStepsProps } from "@/types";

export function ProgressSteps({ currentStep, completedSteps, steps }: ProgressStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Progreso del Procesamiento</h3>
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isUpcoming = index > currentStepIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium
                    ${isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                
                {/* Step Info */}
                <div className="ml-4 min-w-0">
                  <p
                    className={`
                      text-sm font-medium
                      ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}
                    `}
                  >
                    {step.name}
                  </p>
                  <p
                    className={`
                      text-xs
                      ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'}
                    `}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-4
                    ${index < currentStepIndex ? 'bg-green-600' : 'bg-gray-300'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>Progreso</span>
          <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}