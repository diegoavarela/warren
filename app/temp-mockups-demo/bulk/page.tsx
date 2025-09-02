'use client';

import BulkEntryInterface from '../../../temp-mockups/BulkEntryInterface';

export default function BulkEntryDemo() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Entry Interface</h1>
          <p className="text-gray-600 mt-1">Spreadsheet-like interface for multiple transactions</p>
          <div className="mt-2 space-x-4 text-sm">
            <a href="/temp-mockups-demo" className="text-blue-600 hover:underline">← Back to Overview</a>
            <a href="/temp-mockups-demo/direct" className="text-blue-600 hover:underline">← Direct Input</a>
            <a href="/temp-mockups-demo/categories" className="text-blue-600 hover:underline">Categories →</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BulkEntryInterface />
      </div>
    </div>
  );
}