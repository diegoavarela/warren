"use client";

import { Header } from "@/components/Header";

export default function DebugHeaderPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Header Debug Page</h1>
        <p className="mb-4">This page is specifically for debugging the header component.</p>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Expected Behavior:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Warren logo should be visible on the left</li>
            <li>Language selector should be visible</li>
            <li>Sign In and Sign Up buttons should be visible on the right</li>
            <li>Check browser console for debug logs</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg shadow mt-4">
          <h2 className="text-lg font-semibold mb-2">Debug Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open browser developer tools (F12)</li>
            <li>Check the Console tab for any errors or debug messages</li>
            <li>Check the Elements tab to inspect the header HTML</li>
            <li>Try different browser window sizes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}