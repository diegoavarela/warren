"use client";

import { useState } from "react";
import { 
  TrophyIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from "@heroicons/react/24/outline";

interface ModelResult {
  model: 'openai' | 'tapas' | 'local' | 'hybrid';
  classifications: any[];
  processingTime: number;
  cost: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface AccountComparison {
  accountName: string;
  value: number;
  hasDisagreement: boolean;
  impactLevel: 'high' | 'medium' | 'low';
  userValidation?: 'correct' | 'incorrect' | null;
  correctModel?: string;
}

interface RecommendationEngineProps {
  modelResults: ModelResult[];
  validatedAccounts: AccountComparison[];
  fileContext: {
    fileName: string;
    accountCount: number;
    totalValue: number;
  };
}

const ModelRecommendationEngine: React.FC<RecommendationEngineProps> = ({
  modelResults,
  validatedAccounts,
  fileContext
}) => {
  const [selectedScenario, setSelectedScenario] = useState<'accuracy' | 'speed' | 'cost' | 'balanced'>('balanced');

  // Calculate real accuracy from user validations
  const calculateRealAccuracy = (model: string) => {
    const modelValidations = validatedAccounts.filter(acc => 
      acc.correctModel === model || (acc.userValidation === 'correct' && !acc.correctModel)
    );
    const totalValidations = validatedAccounts.filter(acc => acc.userValidation !== null);
    
    return totalValidations.length > 0 ? (modelValidations.length / totalValidations.length) * 100 : 0;
  };

  // Calculate business impact metrics
  const getBusinessImpact = () => {
    const highImpactErrors = validatedAccounts.filter(acc => 
      acc.hasDisagreement && acc.impactLevel === 'high' && acc.userValidation === 'incorrect'
    ).length;

    const revenueVariation = Math.abs(
      Math.max(...modelResults.map(r => r.totalRevenue)) - 
      Math.min(...modelResults.map(r => r.totalRevenue))
    );

    const costOfErrors = highImpactErrors * 15; // $15 per manual correction
    const totalDisagreements = validatedAccounts.filter(acc => acc.hasDisagreement).length;

    return {
      highImpactErrors,
      revenueVariation,
      costOfErrors,
      totalDisagreements,
      errorRate: validatedAccounts.length > 0 ? (totalDisagreements / validatedAccounts.length) * 100 : 0
    };
  };

  // Get recommendation based on scenario
  const getRecommendation = () => {
    const businessImpact = getBusinessImpact();
    
    const recommendations = {
      accuracy: {
        title: "Maximum Accuracy Priority",
        recommended: "hybrid",
        reasoning: "When classification errors are costly and accuracy is critical",
        description: "Best for: Financial audits, regulatory compliance, critical business decisions"
      },
      speed: {
        title: "Speed Priority", 
        recommended: "local",
        reasoning: "When you need fast processing and can accept some classification errors",
        description: "Best for: Quick analysis, bulk processing, preliminary reviews"
      },
      cost: {
        title: "Cost Priority",
        recommended: "local", 
        reasoning: "When budget is limited and manual review is acceptable",
        description: "Best for: High-volume processing, internal analysis, budget-conscious projects"
      },
      balanced: {
        title: "Balanced Approach",
        recommended: businessImpact.errorRate > 20 ? "openai" : "local",
        reasoning: businessImpact.errorRate > 20 
          ? "High error rate detected - AI assistance recommended"
          : "Low error rate - local rules sufficient",
        description: "Automatically chooses based on your file's complexity and error patterns"
      }
    };

    return recommendations[selectedScenario];
  };

  // Calculate ROI for each model
  const calculateROI = (model: ModelResult) => {
    const businessImpact = getBusinessImpact();
    const realAccuracy = calculateRealAccuracy(model.model);
    
    // Estimate time saved vs cost
    const manualReviewTime = (100 - realAccuracy) / 100 * fileContext.accountCount * 2; // 2 minutes per wrong classification
    const timeCostSaved = manualReviewTime * 0.5; // $30/hour = $0.5/minute
    const roi = timeCostSaved > model.cost ? ((timeCostSaved - model.cost) / model.cost) * 100 : -100;
    
    return {
      timeSaved: manualReviewTime,
      costSaved: timeCostSaved,
      roi: roi,
      paybackTime: model.cost > 0 ? model.cost / (timeCostSaved || 0.01) : 0
    };
  };

  const recommendation = getRecommendation();
  const businessImpact = getBusinessImpact();

  return (
    <div className="space-y-8">
      {/* Scenario Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Most Important to You?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'balanced', label: 'Balanced', desc: 'Best overall choice', icon: TrophyIcon },
            { id: 'accuracy', label: 'Accuracy', desc: 'Minimize errors', icon: CheckCircleIcon },
            { id: 'speed', label: 'Speed', desc: 'Fast processing', icon: ClockIcon },
            { id: 'cost', label: 'Cost', desc: 'Low expenses', icon: CurrencyDollarIcon }
          ].map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id as any)}
              className={`p-4 border rounded-lg text-center transition-colors ${
                selectedScenario === scenario.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <scenario.icon className="h-6 w-6 mx-auto mb-2" />
              <div className="font-medium">{scenario.label}</div>
              <div className="text-xs text-gray-600">{scenario.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Recommendation */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-8">
        <div className="flex items-start space-x-4">
          <TrophyIcon className="h-12 w-12 text-yellow-300 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold mb-2">{recommendation.title}</h2>
            <h3 className="text-xl font-semibold mb-3">
              Recommended: {recommendation.recommended.toUpperCase()} Model
            </h3>
            <p className="text-blue-100 mb-3">{recommendation.reasoning}</p>
            <p className="text-sm text-blue-200">{recommendation.description}</p>
          </div>
        </div>
      </div>

      {/* Business Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          businessImpact.errorRate > 25 ? 'border-red-200 bg-red-50' :
          businessImpact.errorRate > 15 ? 'border-yellow-200 bg-yellow-50' :
          'border-green-200 bg-green-50'
        }`}>
          <div className="text-2xl font-bold mb-1">
            {Math.round(businessImpact.errorRate)}%
          </div>
          <div className="text-sm font-medium">Error Rate</div>
          <div className="text-xs text-gray-600 mt-1">
            {businessImpact.totalDisagreements} of {validatedAccounts.length} accounts
          </div>
        </div>

        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <div className="text-2xl font-bold text-blue-900 mb-1">
            ${businessImpact.revenueVariation.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-blue-700">Revenue Variation</div>
          <div className="text-xs text-blue-600 mt-1">
            Between different models
          </div>
        </div>

        <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
          <div className="text-2xl font-bold text-orange-900 mb-1">
            {businessImpact.highImpactErrors}
          </div>
          <div className="text-sm font-medium text-orange-700">Critical Errors</div>
          <div className="text-xs text-orange-600 mt-1">
            High-impact misclassifications
          </div>
        </div>

        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
          <div className="text-2xl font-bold text-purple-900 mb-1">
            ${businessImpact.costOfErrors}
          </div>
          <div className="text-sm font-medium text-purple-700">Manual Review Cost</div>
          <div className="text-xs text-purple-600 mt-1">
            Estimated correction time
          </div>
        </div>
      </div>

      {/* Detailed Model Comparison */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Practical Model Comparison</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Model</th>
                <th className="text-right py-3">Real Accuracy</th>
                <th className="text-right py-3">Processing Time</th>
                <th className="text-right py-3">Cost per File</th>
                <th className="text-right py-3">Time Saved</th>
                <th className="text-right py-3">ROI</th>
                <th className="text-center py-3">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {modelResults.map((model) => {
                const realAccuracy = calculateRealAccuracy(model.model);
                const roi = calculateROI(model);
                const isRecommended = model.model === recommendation.recommended;
                
                return (
                  <tr key={model.model} className={`border-b ${isRecommended ? 'bg-blue-50' : ''}`}>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{model.model.toUpperCase()}</span>
                        {isRecommended && <TrophyIcon className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </td>
                    <td className="text-right py-3">
                      <div className={`inline-flex items-center space-x-1 ${
                        realAccuracy >= 90 ? 'text-green-600' :
                        realAccuracy >= 75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {realAccuracy >= 90 ? <CheckCircleIcon className="h-4 w-4" /> :
                         realAccuracy >= 75 ? <ExclamationTriangleIcon className="h-4 w-4" /> :
                         <XCircleIcon className="h-4 w-4" />}
                        <span>{Math.round(realAccuracy)}%</span>
                      </div>
                    </td>
                    <td className="text-right py-3">{model.processingTime}ms</td>
                    <td className="text-right py-3">${model.cost.toFixed(3)}</td>
                    <td className="text-right py-3">{Math.round(roi.timeSaved)}min</td>
                    <td className="text-right py-3">
                      <div className={`flex items-center justify-end space-x-1 ${
                        roi.roi > 100 ? 'text-green-600' :
                        roi.roi > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {roi.roi > 0 ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />}
                        <span>{Math.round(roi.roi)}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      {isRecommended ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Recommended
                        </span>
                      ) : realAccuracy < 70 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⚠ High Error Rate
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Practical Guidelines */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-2">Practical Guidelines</h4>
            <div className="text-sm text-yellow-800 space-y-2">
              <p><strong>When to use LOCAL:</strong> Standard financial statements, budget constraints, high volume processing</p>
              <p><strong>When to use OPENAI:</strong> Complex formats, unusual account names, multi-language documents</p>
              <p><strong>When to use HYBRID:</strong> Critical accuracy needed, regulatory compliance, high-value decisions</p>
              <p><strong>Cost-Benefit Rule:</strong> If error rate &gt; 20%, the cost of AI is usually justified by time savings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelRecommendationEngine;