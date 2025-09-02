'use client';

import DirectInputForm from '../../../temp-mockups/DirectInputForm';

export default function DirectInputDemo() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Direct Input Form</h1>
          <p className="text-gray-600 mt-1">Single transaction entry form with bilingual support</p>
          <div className="mt-2 space-x-4 text-sm">
            <a href="/temp-mockups-demo" className="text-blue-600 hover:underline">← Back to Overview</a>
            <a href="/temp-mockups-demo/bulk" className="text-blue-600 hover:underline">Bulk Entry →</a>
            <a href="/temp-mockups-demo/categories" className="text-blue-600 hover:underline">Categories →</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DirectInputForm />
      </div>
    </div>
  );
}