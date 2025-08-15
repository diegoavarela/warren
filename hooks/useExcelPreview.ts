import { useState, useEffect } from 'react';

interface ExcelPreviewData {
  filename: string;
  sheetName: string;
  availableSheets: string[];
  columnHeaders: string[];
  rowData: any[][];
  highlights: any;
  totalRows: number;
  totalCols: number;
}

interface UseExcelPreviewReturn {
  excelData: { preview: ExcelPreviewData } | null;
  loading: boolean;
  error: string | null;
  fetchExcelPreview: () => Promise<void>;
  refreshExcelPreview: () => Promise<void>;
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

  const fetchExcelPreview = async (forceRefresh = false) => {
    if (!configurationId) return;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh && excelPreviewCache.has(configurationId)) {
      const cachedData = excelPreviewCache.get(configurationId);
      setExcelData(cachedData || null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/configurations/${configurationId}/excel-preview`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific 404 case for no Excel file
        if (response.status === 404) {
          throw new Error('No Excel file found. Upload an Excel file when creating a new configuration to see data preview.');
        }
        
        throw new Error(errorData.message || 'Failed to fetch Excel preview');
      }
      
      const result = await response.json();
      
      // Cache the result
      excelPreviewCache.set(configurationId, result.data);
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

  const refreshExcelPreview = () => fetchExcelPreview(true);

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