import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  ParserState, 
  ExcelFileMetadata, 
  SheetAnalysis, 
  ColumnMapping, 
  ParseResults,
  ColumnDetection
} from '@/types';

interface ParserStore extends ParserState {
  // Actions
  setCurrentStep: (step: ParserState['currentStep']) => void;
  setUploadedFile: (file: ExcelFileMetadata) => void;
  setSelectedSheet: (sheetName: string) => void;
  setSheetAnalysis: (analysis: SheetAnalysis) => void;
  updateColumnMapping: (columnIndex: number, mapping: Partial<ColumnMapping>) => void;
  setParseResults: (results: ParseResults) => void;
  setValidated: (validated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setLocale: (locale: string) => void;
  setCompanyId: (companyId: string) => void;
  setSaveAsTemplate: (save: boolean, templateName?: string) => void;
  resetState: () => void;
  
  // Derived state
  canProceedToAnalysis: () => boolean;
  canProceedToMapping: () => boolean;
  canProceedToValidation: () => boolean;
  canProceedToPersistence: () => boolean;
  getHighConfidenceMappings: () => ColumnMapping[];
  getLowConfidenceMappings: () => ColumnMapping[];
  getOverallConfidence: () => number;
}

const initialState: ParserState = {
  currentStep: 'upload',
  columnMappings: [],
  isValidated: false,
  isLoading: false,
  progress: 0,
  locale: 'es-MX',
  saveAsTemplate: false
};

export const useParserStore = create<ParserStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Actions
    setCurrentStep: (step) => set({ currentStep: step }),
    
    setUploadedFile: (file) => set({ 
      uploadedFile: file, 
      currentStep: 'select',
      progress: 20 
    }),
    
    setSelectedSheet: (sheetName) => set({ 
      selectedSheet: sheetName,
      currentStep: 'analyze',
      progress: 30
    }),
    
    setSheetAnalysis: (analysis) => {
      // Auto-generate column mappings from analysis
      const mappings: ColumnMapping[] = analysis.columnDetections.map((detection, index) => ({
        columnIndex: index,
        sourceHeader: detection.headerText,
        targetField: detection.detectedType,
        dataType: mapDetectedTypeToDataType(detection.detectedType),
        confidence: detection.confidence,
        validation: generateValidationRules(detection.detectedType)
      }));

      set({ 
        sheetAnalysis: analysis,
        columnMappings: mappings,
        currentStep: 'map',
        progress: 60
      });
    },
    
    updateColumnMapping: (columnIndex, mapping) => {
      const state = get();
      console.log('Store - updateColumnMapping:', { columnIndex, mapping, currentMappings: state.columnMappings });
      
      const updatedMappings = state.columnMappings.map(m => 
        m.columnIndex === columnIndex ? { ...m, ...mapping } : m
      );
      
      console.log('Store - updatedMappings:', updatedMappings);
      set({ columnMappings: updatedMappings });
    },
    
    setParseResults: (results) => set({ 
      parseResults: results,
      currentStep: 'validate',
      progress: 80 
    }),
    
    setValidated: (validated) => set({ 
      isValidated: validated,
      currentStep: validated ? 'persist' : 'validate',
      progress: validated ? 90 : 80
    }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setError: (error) => set({ error: error || undefined }),
    
    setProgress: (progress) => set({ progress }),
    
    setLocale: (locale) => set({ locale }),
    
    setCompanyId: (companyId) => set({ companyId }),
    
    setSaveAsTemplate: (save, templateName) => set({ 
      saveAsTemplate: save, 
      templateName 
    }),
    
    resetState: () => set(initialState),

    // Derived state
    canProceedToAnalysis: () => {
      const state = get();
      return !!(state.uploadedFile && state.selectedSheet);
    },
    
    canProceedToMapping: () => {
      const state = get();
      return !!(state.sheetAnalysis && state.sheetAnalysis.columnDetections.length > 0);
    },
    
    canProceedToValidation: () => {
      const state = get();
      const mappedColumns = state.columnMappings.filter(m => m.targetField !== 'unmapped');
      return mappedColumns.length > 0;
    },
    
    canProceedToPersistence: () => {
      const state = get();
      return !!(state.parseResults && state.isValidated && state.companyId);
    },
    
    getHighConfidenceMappings: () => {
      const state = get();
      return state.columnMappings.filter(m => m.confidence >= 90);
    },
    
    getLowConfidenceMappings: () => {
      const state = get();
      return state.columnMappings.filter(m => m.confidence < 60);
    },
    
    getOverallConfidence: () => {
      const state = get();
      if (state.columnMappings.length === 0) return 0;
      
      const mappedColumns = state.columnMappings.filter(m => m.targetField !== 'unmapped');
      if (mappedColumns.length === 0) return 0;
      
      const totalConfidence = mappedColumns.reduce((sum, m) => sum + m.confidence, 0);
      return Math.round(totalConfidence / mappedColumns.length);
    }
  }))
);

// Helper functions
function mapDetectedTypeToDataType(detectedType: string): 'date' | 'number' | 'currency' | 'text' | 'category' {
  const typeMap: { [key: string]: 'date' | 'number' | 'currency' | 'text' | 'category' } = {
    date: 'date',
    amount: 'currency',
    description: 'text',
    account: 'category',
    unknown: 'text'
  };
  
  return typeMap[detectedType] || 'text';
}

function generateValidationRules(detectedType: string) {
  const rules: { [key: string]: any[] } = {
    date: [
      { type: 'required', message: 'Fecha es requerida' },
      { type: 'format', params: { format: 'date' }, message: 'Formato de fecha inválido' }
    ],
    amount: [
      { type: 'required', message: 'Monto es requerido' },
      { type: 'format', params: { format: 'number' }, message: 'Debe ser un número válido' }
    ],
    description: [
      { type: 'required', message: 'Descripción es requerida' }
    ]
  };
  
  return rules[detectedType] || [];
}

// Selectors for components
export const useCurrentStep = () => useParserStore(state => state.currentStep);
export const useUploadedFile = () => useParserStore(state => state.uploadedFile);
export const useSelectedSheet = () => useParserStore(state => state.selectedSheet);
export const useSheetAnalysis = () => useParserStore(state => state.sheetAnalysis);
export const useColumnMappings = () => useParserStore(state => state.columnMappings);
export const useParseResults = () => useParserStore(state => state.parseResults);
export const useIsLoading = () => useParserStore(state => state.isLoading);
export const useError = () => useParserStore(state => state.error);
export const useProgress = () => useParserStore(state => state.progress);
export const useLocale = () => useParserStore(state => state.locale);

// Action selectors
export const useParserActions = () => {
  return useParserStore(state => ({
    setCurrentStep: state.setCurrentStep,
    setUploadedFile: state.setUploadedFile,
    setSelectedSheet: state.setSelectedSheet,
    setSheetAnalysis: state.setSheetAnalysis,
    updateColumnMapping: state.updateColumnMapping,
    setParseResults: state.setParseResults,
    setValidated: state.setValidated,
    setLoading: state.setLoading,
    setError: state.setError,
    setProgress: state.setProgress,
    setLocale: state.setLocale,
    setCompanyId: state.setCompanyId,
    setSaveAsTemplate: state.setSaveAsTemplate,
    resetState: state.resetState
  }));
};