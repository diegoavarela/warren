import { useState, useEffect } from 'react';

interface ExcelPreviewData {
  filename: string;
  sheetName: string;
  detectedSheetName: string;
  availableSheets: string[];
  columnHeaders: string[];
  rowData: any[][];
  highlights: any;
  totalRows: number;
  totalCols: number;
  isManualSelection: boolean;
}

interface UseExcelPreviewReturn {
  excelData: { preview: ExcelPreviewData } | null;
  loading: boolean;
  error: string | null;
  fetchExcelPreview: (selectedSheet?: string) => Promise<void>;
  refreshExcelPreview: (selectedSheet?: string) => Promise<void>;
}

// Global cache for Excel preview data
const excelPreviewCache = new Map<string, { preview: ExcelPreviewData }>();

// Clear cache function for development/testing
export const clearExcelPreviewCache = () => {
  excelPreviewCache.clear();
};

export function useExcelPreview(configurationId?: string): UseExcelPreviewReturn {
  const [excelData, setExcelData] = useState<{ preview: ExcelPreviewData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExcelPreview = async (selectedSheet?: string, forceRefresh = false) => {
    if (!configurationId) return;
    
    // Create cache key including selected sheet
    const cacheKey = selectedSheet ? `${configurationId}:${selectedSheet}` : configurationId;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh && excelPreviewCache.has(cacheKey)) {
      const cachedData = excelPreviewCache.get(cacheKey);
      setExcelData(cachedData || null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with optional sheet parameter
      const url = new URL(`/api/configurations/${configurationId}/excel-preview`, window.location.origin);
      if (selectedSheet) {
        url.searchParams.set('sheet', selectedSheet);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific 404 case for no Excel file
        if (response.status === 404) {
          throw new Error('No Excel file found. Upload an Excel file when creating a new configuration to see data preview.');
        }
        
        throw new Error(errorData.message || 'Failed to fetch Excel preview');
      }
      
      const result = await response.json();
      
      // Cache the result with sheet-specific key
      excelPreviewCache.set(cacheKey, result.data);
      setExcelData(result.data);
      
    } catch (err) {
      console.error('Error fetching Excel preview:', err);
      
      let errorMessage = 'Failed to load Excel data';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setExcelData(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshExcelPreview = (selectedSheet?: string) => fetchExcelPreview(selectedSheet, true);

  useEffect(() => {
    if (configurationId) {
      fetchExcelPreview();
    }
  }, [configurationId]);

  return {
    excelData,
    loading,
    error,
    fetchExcelPreview,
    refreshExcelPreview
  };
}