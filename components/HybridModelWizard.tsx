"use client";

import { useState, useCallback } from "react";
import { 
  CloudArrowUpIcon, 
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  LightBulbIcon,
  TrophyIcon,
  CpuChipIcon,
  ClockIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import ModelGuide from "./ModelGuide";

type WizardStep = 'welcome' | 'upload' | 'testing' | 'results' | 'recommendation';

interface ModelResult {
  model: 'openai' | 'tapas' | 'local' | 'hybrid';
  classifications: any[];
  confidence: number;
  processingTime: number;
  cost?: number;
  accuracy?: number;
  score?: number;
}

interface FileAnalysis {
  fileName: string;
  fileSize: number;
  sheets: string[];
  rawData: any[][];
  selectedSheet: string;
}

interface HybridModelWizardProps {
  onComplete: (bestModel: ModelResult, allResults: ModelResult[]) => void;
}

const HybridModelWizard: React.FC<HybridModelWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [testResults, setTestResults] = useState<ModelResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bestModel, setBestModel] = useState<ModelResult | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // File upload handling
  const handleFileUpload = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setError(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      
      const firstSheet = sheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null 
      }) as any[][];

      setFileAnalysis({
        fileName: file.name,
        fileSize: file.size,
        sheets: sheetNames,
        rawData: rawData,
        selectedSheet: firstSheet
      });

      setCurrentStep('testing');
      
    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to process Excel file. Please check the file format.');
    }
  }, []);

  // Run model testing
  const runModelTests = async () => {
    if (!fileAnalysis) return;

    setIsProcessing(true);
    setError(null);

    const modelsToTest = ['local', 'openai', 'tapas', 'hybrid'];
    const results: ModelResult[] = [];

    try {
      for (const model of modelsToTest) {
        const startTime = Date.now();
        
        const response = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'hybrid-test',
            rawData: fileAnalysis.rawData.slice(0, 50),
            fileName: fileAnalysis.fileName,
            modelType: model,
            accounts: extractAccountsFromData(fileAnalysis.rawData),
            documentContext: {
              statementType: 'profit_loss',
              currency: 'USD'
            }
          })
        });

        const result = await response.json();
        const processingTime = Date.now() - startTime;

        if (result.success) {
          const modelResult: ModelResult = {
            model: model as any,
            classifications: result.data.classifications || [],
            confidence: result.data.confidence || 0,
            processingTime,
            cost: estimateCost(model as any, fileAnalysis.rawData.length),
            accuracy: calculateAccuracy(result.data.classifications),
            score: 0 // Will be calculated
          };
          
          results.push(modelResult);
        }
      }

      // Calculate scores and find best model
      const scoredResults = calculateModelScores(results);
      const best = scoredResults.reduce((prev, current) => 
        (prev.score || 0) > (current.score || 0) ? prev : current
      );

      setTestResults(scoredResults);
      setBestModel(best);
      setCurrentStep('results');

    } catch (err) {
      console.error('Testing error:', err);
      setError('Failed to complete model testing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions
  const extractAccountsFromData = (rawData: any[][]): any[] => {
    return rawData.slice(1, 26).map((row, index) => ({
      name: row[0] || `Account ${index + 1}`,
      rowIndex: index + 1,
      value: row[1] || 0
    })).filter(acc => acc.name && acc.name.toString().trim().length > 0);
  };

  const estimateCost = (model: string, dataRows: number): number => {
    const costs = {
      openai: dataRows * 0.002,
      tapas: dataRows * 0.001,
      local: 0,
      hybrid: dataRows * 0.003
    };
    return costs[model as keyof typeof costs] || 0;
  };

  const calculateAccuracy = (classifications: any[]): number => {
    if (!classifications.length) return 0;
    const highConfidence = classifications.filter(c => c.confidence >= 80).length;
    return Math.round((highConfidence / classifications.length) * 100);
  };

  const calculateModelScores = (results: ModelResult[]): ModelResult[] => {
    return results.map(result => {
      // Scoring algorithm: 40% confidence, 30% accuracy, 20% speed, 10% cost
      const confidenceScore = result.confidence;
      const accuracyScore = result.accuracy || 0;
      const speedScore = Math.max(0, 100 - (result.processingTime / 100)); // Faster = higher score
      const costScore = result.cost === 0 ? 100 : Math.max(0, 100 - ((result.cost || 0) * 1000)); // Lower cost = higher score
      
      const totalScore = Math.round(
        (confidenceScore * 0.4) + 
        (accuracyScore * 0.3) + 
        (speedScore * 0.2) + 
        (costScore * 0.1)
      );

      return { ...result, score: totalScore };
    });
  };

  const getModelIcon = (model: string) => {
    switch (model) {
      case 'openai': return <CpuChipIcon className="h-5 w-5" />;
      case 'tapas': return <AcademicCapIcon className="h-5 w-5" />;
      case 'local': return <CheckCircleIcon className="h-5 w-5" />;
      case 'hybrid': return <BeakerIcon className="h-5 w-5" />;
      default: return <CpuChipIcon className="h-5 w-5" />;
    }
  };

  const getModelName = (model: string) => {
    switch (model) {
      case 'openai': return 'OpenAI GPT';
      case 'tapas': return 'TAPAS (HuggingFace)';
      case 'local': return 'Local Rules';
      case 'hybrid': return 'Hybrid Model';
      default: return model.toUpperCase();
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <LightBulbIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <div className="flex items-center justify-center space-x-3 mb-4">
          <h2 className="text-3xl font-bold text-gray-900">Find Your Best Hybrid Model</h2>
          <button
            onClick={() => setShowGuide(true)}
            className="text-blue-600 hover:text-blue-700 transition-colors"
            title="Learn about the models"
          >
            <InformationCircleIcon className="h-8 w-8" />
          </button>
        </div>
        <p className="text-lg text-gray-600">
          This wizard will help you test different AI models to find the best approach for parsing your Excel financial documents.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-3">What We'll Test:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            <span><strong>Local Rules:</strong> Fast, pattern-based</span>
          </div>
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="h-5 w-5 text-blue-600" />
            <span><strong>OpenAI GPT:</strong> Advanced AI understanding</span>
          </div>
          <div className="flex items-center space-x-2">
            <AcademicCapIcon className="h-5 w-5 text-blue-600" />
            <span><strong>TAPAS:</strong> Table-specific AI</span>
          </div>
          <div className="flex items-center space-x-2">
            <BeakerIcon className="h-5 w-5 text-blue-600" />
            <span><strong>Hybrid:</strong> Best of all combined</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-left">
        <h3 className="font-semibold text-gray-900">How it works:</h3>
        <div className="space-y-2 text-gray-600">
          <p><strong>Step 1:</strong> Upload your Excel file</p>
          <p><strong>Step 2:</strong> We'll test all models automatically</p>
          <p><strong>Step 3:</strong> Compare results and see recommendations</p>
          <p><strong>Step 4:</strong> Generate your dashboard with the best model</p>
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('upload')}
        className="mt-8 bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2 mx-auto"
      >
        <span>Get Started</span>
        <ArrowRightIcon className="h-5 w-5" />
      </button>
    </div>
  );

  const renderUploadStep = () => (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <CloudArrowUpIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Excel File</h2>
        <p className="text-gray-600">
          Upload a P&L, Balance Sheet, or Cash Flow statement to test the models
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Drag and drop your Excel file here, or</p>
        <label className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
          Browse Files
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-red-900 font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setCurrentStep('welcome')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back</span>
        </button>
      </div>
    </div>
  );

  const renderTestingStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <BeakerIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Test Models</h2>
        <p className="text-gray-600">
          We'll test all 4 models on your file: {fileAnalysis?.fileName}
        </p>
      </div>

      {fileAnalysis && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">File Ready</span>
          </div>
          <div className="text-sm text-green-700">
            <p>File: {fileAnalysis.fileName}</p>
            <p>Size: {(fileAnalysis.fileSize / 1024).toFixed(1)} KB</p>
            <p>Rows: {fileAnalysis.rawData.length}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-3">Testing Process:</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>✓ Local Rules - Pattern matching (fastest, free)</p>
          <p>✓ OpenAI GPT - Advanced AI understanding</p>
          <p>✓ TAPAS - Table-specific machine learning</p>
          <p>✓ Hybrid Model - Combines all approaches</p>
        </div>
        <p className="text-xs text-blue-600 mt-3">
          Testing typically takes 30-60 seconds
        </p>
      </div>

      {isProcessing && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-purple-600 font-medium">Testing models...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full w-1/2 animate-pulse"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-red-900 font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('upload')}
          disabled={isProcessing}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back</span>
        </button>
        <button
          onClick={runModelTests}
          disabled={isProcessing}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
        >
          <BeakerIcon className="h-5 w-5" />
          <span>{isProcessing ? 'Testing...' : 'Start Testing'}</span>
        </button>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Results</h2>
        <p className="text-gray-600">Here's how each model performed on your file</p>
      </div>

      {bestModel && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              {getModelIcon(bestModel.model)}
            </div>
            <div>
              <h3 className="text-xl font-bold">🏆 Best Model: {getModelName(bestModel.model)}</h3>
              <p className="text-green-100">
                Score: {bestModel.score}/100 • Confidence: {bestModel.confidence}% • 
                Accuracy: {bestModel.accuracy}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {testResults.sort((a, b) => (b.score || 0) - (a.score || 0)).map((result, index) => (
          <div key={result.model} className={`border rounded-xl p-6 ${
            result.model === bestModel?.model ? 'border-green-500 bg-green-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getModelIcon(result.model)}
                <div>
                  <h3 className="font-semibold">{getModelName(result.model)}</h3>
                  {index === 0 && <span className="text-sm text-green-600 font-medium">Recommended</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{result.score}/100</div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Confidence:</span>
                <span className="font-medium">{result.confidence}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accuracy:</span>
                <span className="font-medium">{result.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Speed:</span>
                <span className="font-medium">{result.processingTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost:</span>
                <span className="font-medium">${result.cost?.toFixed(3) || '0.000'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Classifications:</span>
                <span className="font-medium">{result.classifications.length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('testing')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Test Again</span>
        </button>
        <button
          onClick={() => setCurrentStep('recommendation')}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
        >
          <span>See Recommendation</span>
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderRecommendationStep = () => (
    <div className="max-w-3xl mx-auto text-center">
      <div className="mb-8">
        <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Recommendation</h2>
      </div>

      {bestModel && (
        <>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                {getModelIcon(bestModel.model)}
              </div>
              <h3 className="text-2xl font-bold">Use {getModelName(bestModel.model)}</h3>
            </div>
            <p className="text-purple-100 mb-4">
              Based on your file, this model achieved the best balance of accuracy, speed, and cost.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{bestModel.confidence}%</div>
                <div className="text-sm text-purple-200">Confidence</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{bestModel.accuracy}%</div>
                <div className="text-sm text-purple-200">Accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{bestModel.score}</div>
                <div className="text-sm text-purple-200">Overall Score</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-left">
            <h4 className="font-semibold text-blue-900 mb-3">Why This Model?</h4>
            <div className="text-sm text-blue-800 space-y-2">
              {bestModel.model === 'hybrid' && (
                <p>✓ <strong>Hybrid Model</strong> combines the strengths of all approaches for maximum accuracy</p>
              )}
              {bestModel.model === 'openai' && (
                <p>✓ <strong>OpenAI GPT</strong> provides advanced understanding of complex financial terminology</p>
              )}
              {bestModel.model === 'local' && (
                <p>✓ <strong>Local Rules</strong> offers fast, reliable processing with zero API costs</p>
              )}
              {bestModel.model === 'tapas' && (
                <p>✓ <strong>TAPAS</strong> specializes in table understanding for structured data</p>
              )}
              <p>✓ High confidence in classifications ({bestModel.confidence}%)</p>
              <p>✓ Good accuracy rate ({bestModel.accuracy}% of accounts classified correctly)</p>
              {bestModel.cost === 0 ? (
                <p>✓ No API costs</p>
              ) : (
                <p>✓ Reasonable processing cost (${(bestModel.cost || 0).toFixed(3)} per file)</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => onComplete(bestModel, testResults)}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-3"
            >
              <ChartBarIcon className="h-6 w-6" />
              <span>Generate Dashboard with {getModelName(bestModel.model)}</span>
            </button>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentStep('results')}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Review All Results
              </button>
              <button
                onClick={() => setCurrentStep('testing')}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Test Different File
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <ModelGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 p-8">
        <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { step: 'welcome', label: 'Start', icon: LightBulbIcon },
              { step: 'upload', label: 'Upload', icon: CloudArrowUpIcon },
              { step: 'testing', label: 'Test', icon: BeakerIcon },
              { step: 'results', label: 'Results', icon: ChartBarIcon },
              { step: 'recommendation', label: 'Recommendation', icon: TrophyIcon }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === item.step 
                    ? 'bg-purple-600 border-purple-600 text-white' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === item.step ? 'text-purple-600' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
                {index < 4 && <ArrowRightIcon className="h-4 w-4 text-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 'welcome' && renderWelcomeStep()}
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'testing' && renderTestingStep()}
          {currentStep === 'results' && renderResultsStep()}
          {currentStep === 'recommendation' && renderRecommendationStep()}
        </div>
      </div>
      </div>
    </>
  );
};

export default HybridModelWizard;