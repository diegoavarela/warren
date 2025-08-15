"use client";

import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CloudArrowUpIcon, 
  DocumentChartBarIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  status: 'uploaded' | 'analyzing' | 'completed' | 'error';
  results?: AnalysisResults;
}

interface AnalysisResults {
  // System Information
  systemInfo: {
    aiModel: string;
    analysisEngine: string;
    version: string;
    capabilities: string[];
  };
  // Step 1: File Detection
  fileInfo: {
    sheets: string[];
    selectedSheet: string;
    totalRows: number;
    totalColumns: number;
  };
  
  // Step 2: Period Detection
  periodDetection: {
    detectedPeriods: string[];
    periodFormat: string;
    dateColumns: number[];
    rawHeaders: string[];
    confidence: number;
  };
  
  // Step 3: Account Classification
  accountClassification: {
    totalAccounts: number;
    classifiedAccounts: Array<{
      accountName: string;
      category: string;
      subcategory: string;
      confidence: number;
      isHardcoded: boolean;
      reasoning: string;
      aiClassification?: {
        suggestedCategory: string;
        isInflow: boolean;
        confidence: number;
        reasoning: string;
      };
    }>;
    unclassifiedAccounts: string[];
    aiAnalysisTime?: number;
  };
  
  // Step 4: Data Extraction
  dataExtraction: {
    revenueAccounts: Array<{ name: string; amounts: number[]; total: number }>;
    cogsAccounts: Array<{ name: string; amounts: number[]; total: number }>;
    opexAccounts: Array<{ name: string; amounts: number[]; total: number }>;
    totalsDetected: Array<{ name: string; value: number; calculatedValue: number; match: boolean }>;
  };
  
  // Step 5: Calculations
  calculations: {
    revenue: { calculated: number; fromTotals: number; source: string };
    cogs: { calculated: number; fromTotals: number; source: string };
    grossProfit: { calculated: number; fromTotals: number; source: string };
    opex: { calculated: number; fromTotals: number; source: string };
    netIncome: { calculated: number; fromTotals: number; source: string };
  };
  
  // Step 6: Warning Detection
  warnings: Array<{
    type: 'hardcoded' | 'mismatch' | 'missing' | 'suspicious';
    message: string;
    severity: 'low' | 'medium' | 'high';
    location: string;
  }>;
}

export default function DebugExcelAnalyzer() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileId = Math.random().toString(36).substring(7);
    
    const newFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      uploadedAt: new Date(),
      status: 'uploaded'
    };

    setUploadedFiles(prev => [...prev, newFile]);
    setSelectedFile(fileId);
    
    // Start analysis
    await analyzeFile(file, fileId);
  };

  const analyzeFile = async (file: File, fileId: string) => {
    setIsAnalyzing(true);
    
    // Update status to analyzing
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'analyzing' } : f
    ));

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/upload-client', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      const uploadResult = await uploadResponse.json();
      const sessionId = uploadResult.uploadSession;

      // Step 2: Run comprehensive analysis
      const analysisResponse = await fetch('/api/debug-comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          fileName: file.name,
          enableHardcodeDetection: true,
          enableCalculationTracing: true,
          enableWarningDetection: true
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Analysis failed');
      }

      const results: AnalysisResults = await analysisResponse.json();

      // Update file with results
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'completed', results } : f
      ));

    } catch (error) {
      console.error('Analysis error:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' } : f
      ));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedFileData = uploadedFiles.find(f => f.id === selectedFile);

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploaded': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'analyzing': return <MagnifyingGlassIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getWarningColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Excel Analyzer Debug Console
          </h1>
          <p className="text-gray-600">
            Upload multiple Excel files to see exactly how the system processes them step-by-step.
            This will help identify any hardcoded values or calculation issues.
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📁 Upload Excel Files</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Upload Excel files to analyze their processing pipeline
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="mb-4"
              >
                {isAnalyzing ? 'Analyzing...' : 'Choose Excel File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>📋 Uploaded Files</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <div className="space-y-2 p-4">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFile === file.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate">{file.name}</span>
                        {getStatusIcon(file.status)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB • {file.uploadedAt.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {uploadedFiles.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No files uploaded yet
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-3">
            {selectedFileData?.results ? (
              <div className="space-y-6">
                {/* System Information */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MagnifyingGlassIcon className="h-5 w-5 text-blue-600 mr-2" />
                      🤖 AI Analysis Engine Information
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Engine Details</h4>
                        <ul className="text-sm space-y-1">
                          <li><strong>AI Model:</strong> {selectedFileData.results.systemInfo.aiModel}</li>
                          <li><strong>Engine:</strong> {selectedFileData.results.systemInfo.analysisEngine}</li>
                          <li><strong>Version:</strong> {selectedFileData.results.systemInfo.version}</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Capabilities</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedFileData.results.systemInfo.capabilities.map((capability, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Warnings Panel */}
                {selectedFileData.results.warnings.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                        ⚠️ Warnings Detected ({selectedFileData.results.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        {selectedFileData.results.warnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className={`p-3 border rounded-lg ${getWarningColor(warning.severity)}`}
                          >
                            <div className="font-medium text-sm mb-1">
                              {warning.type.toUpperCase()}: {warning.message}
                            </div>
                            <div className="text-xs opacity-75">
                              Location: {warning.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Step 1: File Detection */}
                <Card>
                  <CardHeader>
                    <CardTitle>1️⃣ File Detection</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">File Info</h4>
                        <ul className="text-sm space-y-1">
                          <li>Sheets: {selectedFileData.results.fileInfo.sheets.join(', ')}</li>
                          <li>Selected: {selectedFileData.results.fileInfo.selectedSheet}</li>
                          <li>Rows: {selectedFileData.results.fileInfo.totalRows}</li>
                          <li>Columns: {selectedFileData.results.fileInfo.totalColumns}</li>
                        </ul>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Step 2: Period Detection */}
                <Card>
                  <CardHeader>
                    <CardTitle>2️⃣ Period Detection</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Detected Periods</h4>
                        <div className="text-sm space-y-1">
                          {selectedFileData.results.periodDetection.detectedPeriods.map((period, idx) => (
                            <div key={idx} className="px-2 py-1 bg-gray-100 rounded">{period}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Detection Details</h4>
                        <ul className="text-sm space-y-1">
                          <li>Format: {selectedFileData.results.periodDetection.periodFormat}</li>
                          <li>Confidence: {selectedFileData.results.periodDetection.confidence}%</li>
                          <li>Date Columns: {selectedFileData.results.periodDetection.dateColumns.join(', ')}</li>
                        </ul>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Step 3: Account Classification */}
                <Card>
                  <CardHeader>
                    <CardTitle>3️⃣ Account Classification</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Total Accounts: {selectedFileData.results.accountClassification.totalAccounts}</span>
                        <span>Classified: {selectedFileData.results.accountClassification.classifiedAccounts.length}</span>
                        <span>Unclassified: {selectedFileData.results.accountClassification.unclassifiedAccounts.length}</span>
                        {selectedFileData.results.accountClassification.aiAnalysisTime && (
                          <span className="text-blue-600">🤖 AI Time: {selectedFileData.results.accountClassification.aiAnalysisTime}ms</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Account Name</th>
                            <th className="p-2 text-left">Rule-Based</th>
                            <th className="p-2 text-left">AI Analysis</th>
                            <th className="p-2 text-left">Match?</th>
                            <th className="p-2 text-left">Hardcoded?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFileData.results.accountClassification.classifiedAccounts.map((account, idx) => {
                            const aiMatch = account.aiClassification && 
                              account.aiClassification.suggestedCategory.toLowerCase().includes(account.category.toLowerCase());
                            return (
                              <tr key={idx} className={account.isHardcoded ? 'bg-red-50' : aiMatch === false ? 'bg-yellow-50' : ''}>
                                <td className="p-2 border-b">{account.accountName}</td>
                                <td className="p-2 border-b">
                                  <div className="text-xs">
                                    <div>{account.category}</div>
                                    <div className="text-gray-500">{account.confidence}%</div>
                                  </div>
                                </td>
                                <td className="p-2 border-b">
                                  {account.aiClassification ? (
                                    <div className="text-xs">
                                      <div>{account.aiClassification.suggestedCategory}</div>
                                      <div className="text-gray-500">{account.aiClassification.confidence}%</div>
                                      <div className="text-gray-400">{account.aiClassification.isInflow ? '💰 Inflow' : '💸 Outflow'}</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No AI analysis</span>
                                  )}
                                </td>
                                <td className="p-2 border-b">
                                  {account.aiClassification ? (
                                    aiMatch ? '✅ MATCH' : '⚠️ DIFFER'
                                  ) : '❓ N/A'}
                                </td>
                                <td className="p-2 border-b">
                                  {account.isHardcoded ? '🚨 YES' : '✅ NO'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>

                {/* Step 4: Data Extraction */}
                <Card>
                  <CardHeader>
                    <CardTitle>4️⃣ Data Extraction</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Revenue Accounts</h4>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          {selectedFileData.results.dataExtraction.revenueAccounts.map((acc, idx) => (
                            <div key={idx} className="flex justify-between border-b py-1">
                              <span className="truncate">{acc.name}</span>
                              <span className="font-mono">{acc.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">COGS Accounts</h4>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          {selectedFileData.results.dataExtraction.cogsAccounts.map((acc, idx) => (
                            <div key={idx} className="flex justify-between border-b py-1">
                              <span className="truncate">{acc.name}</span>
                              <span className="font-mono">{acc.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">OpEx Accounts</h4>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          {selectedFileData.results.dataExtraction.opexAccounts.map((acc, idx) => (
                            <div key={idx} className="flex justify-between border-b py-1">
                              <span className="truncate">{acc.name}</span>
                              <span className="font-mono">{acc.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Step 5: Calculations */}
                <Card>
                  <CardHeader>
                    <CardTitle>5️⃣ Final Calculations</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3 text-left">Metric</th>
                            <th className="p-3 text-left">Calculated Value</th>
                            <th className="p-3 text-left">From Totals</th>
                            <th className="p-3 text-left">Source</th>
                            <th className="p-3 text-left">Match?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedFileData.results.calculations).map(([metric, calc]) => (
                            <tr key={metric} className={calc.calculated !== calc.fromTotals ? 'bg-yellow-50' : ''}>
                              <td className="p-3 border-b font-medium">{metric}</td>
                              <td className="p-3 border-b font-mono">{calc.calculated.toLocaleString()}</td>
                              <td className="p-3 border-b font-mono">{calc.fromTotals.toLocaleString()}</td>
                              <td className="p-3 border-b text-xs">{calc.source}</td>
                              <td className="p-3 border-b">
                                {calc.calculated === calc.fromTotals ? '✅' : '⚠️ MISMATCH'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : selectedFileData?.status === 'analyzing' ? (
              <Card>
                <CardBody className="text-center py-12">
                  <MagnifyingGlassIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Excel File...</h3>
                  <p className="text-gray-600">This may take a few moments while we process your file step-by-step.</p>
                </CardBody>
              </Card>
            ) : selectedFileData ? (
              <Card>
                <CardBody className="text-center py-12">
                  <DocumentChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">File Selected</h3>
                  <p className="text-gray-600">Analysis results will appear here once processing is complete.</p>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody className="text-center py-12">
                  <DocumentChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No File Selected</h3>
                  <p className="text-gray-600">Upload an Excel file and select it to see detailed analysis results.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}