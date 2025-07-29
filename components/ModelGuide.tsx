"use client";

import { useState } from "react";
import { 
  InformationCircleIcon, 
  XMarkIcon,
  CpuChipIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  BeakerIcon,
  LightBulbIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

interface ModelGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModelGuide: React.FC<ModelGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'scoring' | 'tips'>('models');

  if (!isOpen) return null;

  const models = [
    {
      id: 'local',
      name: 'Local Rules',
      icon: CheckCircleIcon,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      description: 'Pattern-based classification using predefined rules',
      pros: [
        'Fastest processing (typically under 100ms)',
        'Zero API costs',
        'Works offline',
        'Consistent results',
        'Good for standard account naming'
      ],
      cons: [
        'Limited understanding of context',
        'May miss unusual account names',
        'Cannot handle complex descriptions',
        'Less accurate for non-standard formats'
      ],
      bestFor: 'Standard financial statements with conventional account names',
      accuracy: '70-85%',
      speed: 'Very Fast',
      cost: 'Free'
    },
    {
      id: 'openai',
      name: 'OpenAI GPT',
      icon: CpuChipIcon,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Advanced AI with deep understanding of financial terminology',
      pros: [
        'Excellent context understanding',
        'Handles unusual account names',
        'Understands multiple languages',
        'Can interpret complex descriptions',
        'High accuracy on varied formats'
      ],
      cons: [
        'Higher API costs',
        'Slower processing (1-3 seconds)',
        'Requires internet connection',
        'Results may vary slightly',
        'Rate limits may apply'
      ],
      bestFor: 'Complex or non-standard financial documents',
      accuracy: '85-95%',
      speed: 'Moderate',
      cost: '$0.002-0.01 per file'
    },
    {
      id: 'tapas',
      name: 'TAPAS (HuggingFace)',
      icon: AcademicCapIcon,
      color: 'text-green-600 bg-green-50 border-green-200',
      description: 'Table-specific AI trained on structured data understanding',
      pros: [
        'Specialized for table data',
        'Good at finding relationships',
        'Moderate API costs',
        'Understands table structure',
        'Good validation tool'
      ],
      cons: [
        'Limited financial knowledge',
        'May struggle with context',
        'Requires structured input',
        'Less accurate than OpenAI',
        'Better for validation than classification'
      ],
      bestFor: 'Well-structured tables and validation of other models',
      accuracy: '75-85%',
      speed: 'Fast',
      cost: '$0.001-0.005 per file'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Model',
      icon: BeakerIcon,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      description: 'Combines all models for optimal accuracy and reliability',
      pros: [
        'Best overall accuracy',
        'Uses strengths of each model',
        'Fallback when one model fails',
        'Confidence scoring',
        'Self-validating results'
      ],
      cons: [
        'Highest processing time',
        'Combined API costs',
        'More complex implementation',
        'May be overkill for simple files'
      ],
      bestFor: 'Critical applications requiring maximum accuracy',
      accuracy: '90-98%',
      speed: 'Slow',
      cost: '$0.003-0.015 per file'
    }
  ];

  const renderModelsTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <LightBulbIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900">Understanding the Models</h3>
        <p className="text-gray-600">Each model has different strengths and use cases</p>
      </div>

      {models.map((model) => (
        <div key={model.id} className={`border rounded-xl p-6 ${model.color}`}>
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-white rounded-lg">
              <model.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold">{model.name}</h4>
                <div className="flex space-x-4 text-sm">
                  <span><strong>Accuracy:</strong> {model.accuracy}</span>
                  <span><strong>Speed:</strong> {model.speed}</span>
                  <span><strong>Cost:</strong> {model.cost}</span>
                </div>
              </div>
              <p className="text-gray-700 mb-4">{model.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-medium text-green-800 mb-2">✅ Strengths:</h5>
                  <ul className="text-sm space-y-1">
                    {model.pros.map((pro, index) => (
                      <li key={index} className="text-green-700">• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-red-800 mb-2">❌ Limitations:</h5>
                  <ul className="text-sm space-y-1">
                    {model.cons.map((con, index) => (
                      <li key={index} className="text-red-700">• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <p className="text-sm"><strong>Best for:</strong> {model.bestFor}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderScoringTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <ChartBarIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900">How We Score Models</h3>
        <p className="text-gray-600">Understanding the scoring algorithm and metrics</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-4">Overall Score Formula</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span>Confidence Score</span>
            <span className="font-medium">40% weight</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Accuracy Score</span>
            <span className="font-medium">30% weight</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Speed Score</span>
            <span className="font-medium">20% weight</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Cost Score</span>
            <span className="font-medium">10% weight</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Confidence Score</h4>
          <p className="text-sm text-gray-600 mb-3">
            Average confidence level across all account classifications (0-100%)
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>90-100%:</span>
              <span className="text-green-600 font-medium">Excellent</span>
            </div>
            <div className="flex justify-between">
              <span>80-89%:</span>
              <span className="text-blue-600 font-medium">Good</span>
            </div>
            <div className="flex justify-between">
              <span>70-79%:</span>
              <span className="text-yellow-600 font-medium">Fair</span>
            </div>
            <div className="flex justify-between">
              <span>Below 70%:</span>
              <span className="text-red-600 font-medium">Poor</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Accuracy Score</h4>
          <p className="text-sm text-gray-600 mb-3">
            Percentage of accounts classified with high confidence (≥80%)
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>90%+ high conf.:</span>
              <span className="text-green-600 font-medium">Excellent</span>
            </div>
            <div className="flex justify-between">
              <span>80-89% high conf.:</span>
              <span className="text-blue-600 font-medium">Good</span>
            </div>
            <div className="flex justify-between">
              <span>70-79% high conf.:</span>
              <span className="text-yellow-600 font-medium">Fair</span>
            </div>
            <div className="flex justify-between">
              <span>Below 70%:</span>
              <span className="text-red-600 font-medium">Poor</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Speed Score</h4>
          <p className="text-sm text-gray-600 mb-3">
            Processing time - faster is better
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>&lt; 500ms:</span>
              <span className="text-green-600 font-medium">Excellent</span>
            </div>
            <div className="flex justify-between">
              <span>500-2000ms:</span>
              <span className="text-blue-600 font-medium">Good</span>
            </div>
            <div className="flex justify-between">
              <span>2-5 seconds:</span>
              <span className="text-yellow-600 font-medium">Fair</span>
            </div>
            <div className="flex justify-between">
              <span>&gt; 5 seconds:</span>
              <span className="text-red-600 font-medium">Poor</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Cost Score</h4>
          <p className="text-sm text-gray-600 mb-3">
            API costs per file - lower is better
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Free:</span>
              <span className="text-green-600 font-medium">Excellent</span>
            </div>
            <div className="flex justify-between">
              <span>&lt; $0.005:</span>
              <span className="text-blue-600 font-medium">Good</span>
            </div>
            <div className="flex justify-between">
              <span>$0.005-0.01:</span>
              <span className="text-yellow-600 font-medium">Fair</span>
            </div>
            <div className="flex justify-between">
              <span>&gt; $0.01:</span>
              <span className="text-red-600 font-medium">Expensive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTipsTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <LightBulbIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900">Best Practices & Tips</h3>
        <p className="text-gray-600">How to get the best results from each model</p>
      </div>

      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h4 className="font-semibold text-green-900 mb-4">🎯 Choosing the Right Model</h4>
          <div className="space-y-3 text-sm text-green-800">
            <p><strong>Use Local Rules when:</strong> You have standard financial statements with conventional account names like "Sales Revenue", "Cost of Goods Sold", etc.</p>
            <p><strong>Use OpenAI when:</strong> You have complex, non-standard, or multi-language financial documents that need contextual understanding.</p>
            <p><strong>Use TAPAS when:</strong> You want to validate results from other models or have well-structured table data.</p>
            <p><strong>Use Hybrid when:</strong> Accuracy is critical and you need the most reliable results possible.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-4">📊 Preparing Your Excel Files</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Clear Headers:</strong> Use descriptive column headers like "Account Name", "Amount", "Period"</p>
            <p>• <strong>Consistent Format:</strong> Keep account names in one column, values in adjacent columns</p>
            <p>• <strong>Remove Empty Rows:</strong> Clean up extra spaces and empty rows between data</p>
            <p>• <strong>Standard Names:</strong> Use conventional financial terminology when possible</p>
            <p>• <strong>Single Currency:</strong> Keep all values in the same currency within one file</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h4 className="font-semibold text-yellow-900 mb-4">⚡ Performance Tips</h4>
          <div className="space-y-2 text-sm text-yellow-800">
            <p>• <strong>Start with Local:</strong> Test local rules first - they're fast and free</p>
            <p>• <strong>Use Hybrid Sparingly:</strong> Only when maximum accuracy is needed</p>
            <p>• <strong>Batch Processing:</strong> For multiple files, consider processing in batches</p>
            <p>• <strong>Monitor Costs:</strong> Keep track of API usage for OpenAI and TAPAS</p>
            <p>• <strong>Cache Results:</strong> Save successful mappings as templates for similar files</p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h4 className="font-semibold text-purple-900 mb-4">🔍 Interpreting Results</h4>
          <div className="space-y-2 text-sm text-purple-800">
            <p>• <strong>Confidence &gt; 80%:</strong> Usually reliable, can use directly</p>
            <p>• <strong>Confidence 60-80%:</strong> Review and validate manually</p>
            <p>• <strong>Confidence &lt; 60%:</strong> Likely needs correction</p>
            <p>• <strong>Check Method:</strong> In hybrid results, see which technique was used</p>
            <p>• <strong>Validate Totals:</strong> Ensure revenue/expense classifications make sense</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <InformationCircleIcon className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Model Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'models', label: 'Model Overview', icon: CpuChipIcon },
            { id: 'scoring', label: 'Scoring System', icon: ChartBarIcon },
            { id: 'tips', label: 'Best Practices', icon: LightBulbIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'models' && renderModelsTab()}
          {activeTab === 'scoring' && renderScoringTab()}
          {activeTab === 'tips' && renderTipsTab()}
        </div>
      </div>
    </div>
  );
};

export default ModelGuide;