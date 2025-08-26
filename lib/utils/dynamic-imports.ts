/**
 * Dynamic Import Utilities
 * 
 * Centralized dynamic imports for heavy dependencies to improve bundle splitting
 * and reduce initial page load size.
 */

// Chart.js dynamic imports for better code splitting
export const loadChartJS = async () => {
  const { Chart } = await import('chart.js');
  return Chart;
};

export const loadChartJSComponents = async () => {
  const [
    { CategoryScale, LinearScale },
    { PointElement, LineElement, BarElement, ArcElement },
    { Title, Tooltip, Legend, Filler }
  ] = await Promise.all([
    import('chart.js').then(m => ({ CategoryScale: m.CategoryScale, LinearScale: m.LinearScale })),
    import('chart.js').then(m => ({ 
      PointElement: m.PointElement, 
      LineElement: m.LineElement, 
      BarElement: m.BarElement,
      ArcElement: m.ArcElement 
    })),
    import('chart.js').then(m => ({ 
      Title: m.Title, 
      Tooltip: m.Tooltip, 
      Legend: m.Legend, 
      Filler: m.Filler 
    }))
  ]);
  
  return {
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
  };
};

// Recharts dynamic import (for components that specifically need it)
export const loadRecharts = async () => {
  const [
    { BarChart, LineChart, PieChart, AreaChart },
    { Bar, Line, Pie, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer }
  ] = await Promise.all([
    import('recharts').then(m => ({
      BarChart: m.BarChart,
      LineChart: m.LineChart, 
      PieChart: m.PieChart,
      AreaChart: m.AreaChart
    })),
    import('recharts').then(m => ({
      Bar: m.Bar,
      Line: m.Line,
      Pie: m.Pie,
      Area: m.Area,
      XAxis: m.XAxis,
      YAxis: m.YAxis,
      CartesianGrid: m.CartesianGrid,
      Tooltip: m.Tooltip,
      Legend: m.Legend,
      ResponsiveContainer: m.ResponsiveContainer
    }))
  ]);
  
  return {
    BarChart,
    LineChart, 
    PieChart,
    AreaChart,
    Bar,
    Line,
    Pie,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
  };
};

// Excel processing - only load when needed
export const loadXLSXProcessor = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// PDF generation - only load when needed (commented out - jspdf not installed)
// export const loadPDFGenerator = async () => {
//   const jsPDF = await import('jspdf');
//   return jsPDF;
// };

// Heavy UI components - load on demand (commented out - react-datepicker not installed)
// export const loadDatePicker = async () => {
//   const DatePicker = await import('react-datepicker');
//   return DatePicker;
// };

// Image processing - only load when needed
export const loadImageProcessor = async () => {
  // If we add image processing libraries later
  console.log('Loading image processor...');
  return null;
};

// Analytics/tracking - load asynchronously after page load
export const loadAnalytics = async () => {
  // Google Analytics or other tracking
  if (typeof window !== 'undefined') {
    console.log('Loading analytics...');
  }
  return null;
};

// Performance monitoring
const trackDynamicImportTime = (importName: string, startTime: number) => {
  if (process.env.NODE_ENV === 'development') {
    const loadTime = Date.now() - startTime;
    console.log(`📦 Dynamic import: ${importName} loaded in ${loadTime}ms`);
  }
};

// Wrapper function to add performance tracking
export const createTrackedImport = (importFn: Function, name: string) => {
  return async (...args: any[]) => {
    const startTime = Date.now();
    const result = await importFn(...args);
    trackDynamicImportTime(name, startTime);
    return result;
  };
};

// Pre-optimized dynamic imports with tracking
export const trackedLoadChartJS = createTrackedImport(loadChartJS, 'Chart.js');
export const trackedLoadRecharts = createTrackedImport(loadRecharts, 'Recharts');
export const trackedLoadXLSX = createTrackedImport(loadXLSXProcessor, 'XLSX');

// Bundle size monitoring
export const getBundleInfo = () => {
  if (typeof window !== 'undefined') {
    return {
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      memory: (navigator as any).deviceMemory || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
  return null;
};