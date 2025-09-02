'use client';

import CategoryManagementScreen from '../../../temp-mockups/CategoryManagementScreen';

export default function CategoriesDemo() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Category Management Screen</h1>
          <p className="text-gray-600 mt-1">Chart of accounts customization with country templates</p>
          <div className="mt-2 space-x-4 text-sm">
            <a href="/temp-mockups-demo" className="text-blue-600 hover:underline">← Back to Overview</a>
            <a href="/temp-mockups-demo/direct" className="text-blue-600 hover:underline">← Direct Input</a>
            <a href="/temp-mockups-demo/bulk" className="text-blue-600 hover:underline">← Bulk Entry</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CategoryManagementScreen />
      </div>
    </div>
  );
}