/**
 * Bundle Size and Performance Monitor
 * 
 * Tracks bundle loading performance and provides insights for optimization.
 * Only active in development mode to avoid production overhead.
 */

'use client';

import { useEffect, useState } from 'react';

interface BundleMetrics {
  pageLoadTime: number;
  bundleSize: number;
  chunkCount: number;
  cacheHitRate: number;
  connectionType: string;
  deviceMemory: number;
}

interface BundleMonitorProps {
  enabled?: boolean;
  showDebugInfo?: boolean;
}

export function BundleMonitor({ enabled = false, showDebugInfo = false }: BundleMonitorProps) {
  const [metrics, setMetrics] = useState<BundleMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development' || !enabled) {
      return;
    }

    const collectMetrics = async () => {
      try {
        // Performance timing
        const perfTiming = performance.timing;
        const pageLoadTime = perfTiming.loadEventEnd - perfTiming.navigationStart;

        // Network information
        const connection = (navigator as any).connection;
        const connectionType = connection?.effectiveType || 'unknown';

        // Device memory (if available)
        const deviceMemory = (navigator as any).deviceMemory || 0;

        // Bundle size estimation (approximate)
        const bundleSize = await estimateBundleSize();

        // Chunk count from webpack
        const chunkCount = getChunkCount();

        // Cache hit rate (from performance entries)
        const cacheHitRate = getCacheHitRate();

        setMetrics({
          pageLoadTime,
          bundleSize,
          chunkCount,
          cacheHitRate,
          connectionType,
          deviceMemory,
        });

        // Log to console for debugging
        console.log('📊 Bundle Performance Metrics:', {
          pageLoadTime: `${pageLoadTime}ms`,
          bundleSize: `${Math.round(bundleSize / 1024)}KB`,
          chunkCount,
          cacheHitRate: `${Math.round(cacheHitRate * 100)}%`,
          connectionType,
          deviceMemory: deviceMemory ? `${deviceMemory}GB` : 'unknown',
        });

      } catch (error) {
        console.error('Bundle monitor error:', error);
      }
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
    }

    // Keyboard shortcut to toggle visibility
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('load', collectMetrics);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled]);

  // Helper functions
  const estimateBundleSize = async (): Promise<number> => {
    try {
      const entries = performance.getEntriesByType('resource');
      const jsFiles = entries.filter((entry: any) => 
        entry.name.includes('/_next/static/chunks/') && entry.name.endsWith('.js')
      );
      
      return jsFiles.reduce((total: number, entry: any) => {
        return total + (entry.transferSize || entry.encodedBodySize || 0);
      }, 0);
    } catch {
      return 0;
    }
  };

  const getChunkCount = (): number => {
    try {
      const scripts = document.querySelectorAll('script[src*="_next/static/chunks"]');
      return scripts.length;
    } catch {
      return 0;
    }
  };

  const getCacheHitRate = (): number => {
    try {
      const entries = performance.getEntriesByType('resource');
      const totalRequests = entries.length;
      const cachedRequests = entries.filter((entry: any) => 
        entry.transferSize === 0 && entry.decodedBodySize > 0
      ).length;
      
      return totalRequests > 0 ? cachedRequests / totalRequests : 0;
    } catch {
      return 0;
    }
  };

  const getPerformanceGrade = (loadTime: number): string => {
    if (loadTime < 1000) return 'A';
    if (loadTime < 2000) return 'B';  
    if (loadTime < 3000) return 'C';
    if (loadTime < 5000) return 'D';
    return 'F';
  };

  const getBundleSizeGrade = (size: number): string => {
    const sizeKB = size / 1024;
    if (sizeKB < 250) return 'A';
    if (sizeKB < 500) return 'B';
    if (sizeKB < 1000) return 'C';
    if (sizeKB < 2000) return 'D';
    return 'F';
  };

  // Don't render in production or when disabled
  if (process.env.NODE_ENV !== 'development' || !enabled || !metrics) {
    return null;
  }

  // Only show when toggled on
  if (!isVisible && !showDebugInfo) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-50 hover:opacity-100 transition-opacity">
        Ctrl+Shift+B for bundle info
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm z-50 max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-800">Bundle Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Load Time:</span>
          <span className={`font-mono ${
            getPerformanceGrade(metrics.pageLoadTime) === 'A' ? 'text-green-600' :
            getPerformanceGrade(metrics.pageLoadTime) === 'B' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {metrics.pageLoadTime}ms ({getPerformanceGrade(metrics.pageLoadTime)})
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Bundle Size:</span>
          <span className={`font-mono ${
            getBundleSizeGrade(metrics.bundleSize) === 'A' ? 'text-green-600' :
            getBundleSizeGrade(metrics.bundleSize) === 'B' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {Math.round(metrics.bundleSize / 1024)}KB ({getBundleSizeGrade(metrics.bundleSize)})
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>JS Chunks:</span>
          <span className="font-mono">{metrics.chunkCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Cache Hit:</span>
          <span className="font-mono text-green-600">
            {Math.round(metrics.cacheHitRate * 100)}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Connection:</span>
          <span className="font-mono capitalize">{metrics.connectionType}</span>
        </div>
        
        {metrics.deviceMemory > 0 && (
          <div className="flex justify-between">
            <span>Device RAM:</span>
            <span className="font-mono">{metrics.deviceMemory}GB</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          💡 {metrics.pageLoadTime > 3000 ? 'Consider more lazy loading' :
               metrics.bundleSize > 500000 ? 'Bundle size could be optimized' :
               'Performance looks good!'}
        </div>
      </div>
    </div>
  );
}

export default BundleMonitor;