import { CheckCircleIcon } from '@heroicons/react/24/solid';

export interface Step {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: string;
  variant?: 'horizontal' | 'vertical';
}

export function ProgressIndicator({ steps, currentStep, variant = 'horizontal' }: ProgressIndicatorProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  
  if (variant === 'vertical') {
    return (
      <nav aria-label="Progress">
        <ol className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;
            
            return (
              <li key={step.id} className="relative">
                <div className={`flex items-start ${index !== steps.length - 1 ? 'pb-4' : ''}`}>
                  {/* Connector line */}
                  {index !== steps.length - 1 && (
                    <div className={`absolute left-4 top-8 -ml-px h-full w-0.5 ${
                      isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                  
                  {/* Step indicator */}
                  <div className="relative flex items-center">
                    {isCompleted ? (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                    ) : isCurrent ? (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">{index + 1}</span>
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-semibold">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Step content */}
                  <div className="ml-4">
                    <h3 className={`text-sm font-medium ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </h3>
                    {step.description && (
                      <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
  
  // Horizontal variant
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;
          
          return (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex items-center">
                {/* Step indicator */}
                <div className="relative flex items-center justify-center">
                  {isCompleted ? (
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-blue-100">
                      {step.icon ? (
                        <span className="text-white">{step.icon}</span>
                      ) : (
                        <span className="text-white text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {step.icon ? (
                        <span className="text-gray-500">{step.icon}</span>
                      ) : (
                        <span className="text-gray-500 text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Connector line */}
                {index !== steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              
              {/* Step label */}
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className={`text-xs font-medium ${
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}