'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Grid, MousePointer, Info, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { useExcelPreview } from '@/hooks/useExcelPreview';
import { ExcelGrid } from './ExcelGrid';
import { ExcelSheetSelector } from './ExcelSheetSelector';

interface ExcelGridHelperProps {
  periodsRow: number;
  periodsRange: string;
  categoriesColumn?: string; // Only for P&L
  onPeriodsRowChange: (row: number) => void;
  onPeriodsRangeChange: (range: string) => void;
  onCategoriesColumnChange?: (column: string) => void;
  configurationType: 'cashflow' | 'pnl';
  configurationId?: string; // For fetching Excel preview data
}

export function ExcelGridHelper({
  periodsRow,
  periodsRange,
  categoriesColumn,
  onPeriodsRowChange,
  onPeriodsRangeChange,
  onCategoriesColumnChange,
  configurationType,
  configurationId
}: ExcelGridHelperProps) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const { t } = useTranslation('es');
  const { excelData, loading, error, refreshExcelPreview, fetchExcelPreview } = useExcelPreview(configurationId);

  // Handle sheet selection change
  const handleSheetChange = async (newSheet: string) => {
    console.log('🔄 Changing sheet from', selectedSheet, 'to', newSheet);
    setSelectedSheet(newSheet);
    await fetchExcelPreview(newSheet);
  };

  // Initialize selected sheet when excel data loads
  useEffect(() => {
    if (excelData?.preview?.sheetName && !selectedSheet) {
      setSelectedSheet(excelData.preview.sheetName);
    }
  }, [excelData, selectedSheet]);


  // Generate Excel column letters (A, B, C, ..., Z, AA, AB, etc.)
  const getColumnLetter = (index: number): string => {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode((index % 26) + 65) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  };

  // Parse Excel range (e.g., "B8:M8" -> {startCol: 1, endCol: 12, row: 8})
  const parseRange = (range: string) => {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const [, startColStr, startRowStr, endColStr, endRowStr] = match;
    const startRow = parseInt(startRowStr);
    const endRow = parseInt(endRowStr);
    
    // Convert column letters to numbers (A=0, B=1, etc.)
    const startCol = startColStr.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
    const endCol = endColStr.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
    
    return { startCol, endCol, startRow, endRow };
  };

  // Generate Excel grid with real data or template
  const generateGrid = () => {
    if (excelData?.preview?.rowData) {
      return (
        <ExcelGrid
          excelData={excelData}
          onCellClick={setSelectedCell}
          className="border-2 border-green-500 bg-green-50 rounded-lg p-3"
        />
      );
    } else if (excelData) {
      return (
        <ExcelGrid
          excelData={excelData}
          onCellClick={setSelectedCell}
          className="border-2 border-green-500 bg-green-50 rounded-lg p-3"
        />
      );
    } else {
      return generateTemplateGrid();
    }
  };


  // Generate template grid (fallback when no Excel data is available)
  const generateTemplateGrid = () => {
    const rows = 15; // Show first 15 rows
    const cols = 15; // Show first 15 columns (A-O)
    const gridRows = [];
    
    const parsedRange = parseRange(periodsRange);
    const categoriesColIndex = categoriesColumn ? categoriesColumn.charCodeAt(0) - 65 : -1;

    for (let row = 0; row <= rows; row++) {
      const gridCells = [];
      
      for (let col = 0; col <= cols; col++) {
        if (row === 0 && col === 0) {
          // Top-left corner
          gridCells.push(
            <div key={`${row}-${col}`} className="w-16 h-10 border border-gray-300 bg-gray-100 flex items-center justify-center text-xs font-medium sticky left-0 z-10">
              
            </div>
          );
        } else if (row === 0) {
          // Column headers (A, B, C, ...)
          const colLetter = getColumnLetter(col - 1);
          const isCategoriesColumn = configurationType === 'pnl' && col - 1 === categoriesColIndex;
          const isInPeriodsRange = parsedRange && col - 1 >= parsedRange.startCol && col - 1 <= parsedRange.endCol;
          
          gridCells.push(
            <div 
              key={`${row}-${col}`} 
              className={`min-w-24 w-32 h-10 border border-gray-300 flex items-center justify-center text-xs font-medium cursor-pointer
                ${isCategoriesColumn ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}
                ${isInPeriodsRange ? 'bg-blue-100 text-blue-800' : ''}
              `}
              onClick={() => setSelectedCell(`${colLetter}1`)}
            >
              {colLetter}
            </div>
          );
        } else if (col === 0) {
          // Row numbers (1, 2, 3, ...)
          const isPeriodsRow = row === periodsRow;
          
          gridCells.push(
            <div 
              key={`${row}-${col}`} 
              className={`w-16 h-10 border border-gray-300 flex items-center justify-center text-xs font-medium cursor-pointer sticky left-0 z-10
                ${isPeriodsRow ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}
              `}
              onClick={() => setSelectedCell(`A${row}`)}
            >
              {row}
            </div>
          );
        } else {
          // Regular cells
          const colLetter = getColumnLetter(col - 1);
          const cellAddress = `${colLetter}${row}`;
          const isPeriodsRow = row === periodsRow;
          const isCategoriesColumn = configurationType === 'pnl' && col - 1 === categoriesColIndex;
          const isInPeriodsRange = parsedRange && row >= parsedRange.startRow && row <= parsedRange.endRow && 
                                 col - 1 >= parsedRange.startCol && col - 1 <= parsedRange.endCol;
          
          let cellClass = 'min-w-24 w-32 h-10 border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-center text-xs px-2';
          let cellContent = '';
          
          if (isInPeriodsRange) {
            cellClass += ' bg-blue-50 border-blue-200';
            cellContent = row === periodsRow ? 'Period' : '';
          }
          
          if (isCategoriesColumn && row !== periodsRow) {
            cellClass += ' bg-purple-50 border-purple-200';
            cellContent = row <= 5 ? 'Category' : '';
          }
          
          if (selectedCell === cellAddress) {
            cellClass += ' ring-2 ring-blue-500';
          }
          
          gridCells.push(
            <div 
              key={`${row}-${col}`} 
              className={cellClass}
              onClick={() => setSelectedCell(cellAddress)}
              title={cellAddress}
            >
              {cellContent}
            </div>
          );
        }
      }
      
      gridRows.push(
        <div key={row} className="flex">
          {gridCells}
        </div>
      );
    }
    
    return (
      <div className="excel-grid template-grid w-full" style={{ 
        border: '2px solid red', 
        backgroundColor: '#fff0f0',
        padding: '12px',
        borderRadius: '8px'
      }}>
        <div style={{ 
          backgroundColor: '#f44336', 
          color: 'white', 
          padding: '6px 12px', 
          marginBottom: '12px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 'bold'
        }}>
          🔧 TEMPLATE GRID (No Excel data available)
        </div>
        <div className="overflow-x-auto w-full">
          <div className="inline-block min-w-full">
            {gridRows}
          </div>
        </div>
      </div>
    );
  };

  const updatePeriodsRange = (startCol: string, endCol: string) => {
    const newRange = `${startCol}${periodsRow}:${endCol}${periodsRow}`;
    onPeriodsRangeChange(newRange);
  };

  return (
    <div className="space-y-6">
      {/* Structure Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            {t('config.excel.structureTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodsRow">{t('config.excel.periodsRow')} *</Label>
              <Input
                id="periodsRow"
                type="number"
                min="1"
                max="1000"
                value={periodsRow}
                onChange={(e) => onPeriodsRowChange(parseInt(e.target.value) || 1)}
                placeholder="8"
              />
              <p className="text-xs text-muted-foreground">
                {t('config.excel.periodsRowDesc')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodsRange">{t('config.excel.periodsRange')} *</Label>
              <Input
                id="periodsRange"
                value={periodsRange}
                onChange={(e) => onPeriodsRangeChange(e.target.value)}
                placeholder="B8:M8"
                pattern="[A-Z]+\\d+:[A-Z]+\\d+"
              />
              <p className="text-xs text-muted-foreground">
                {t('config.excel.periodsRangeDesc')}
              </p>
            </div>

            {configurationType === 'pnl' && (
              <div className="space-y-2">
                <Label htmlFor="categoriesColumn">{t('config.excel.categoriesColumn')} *</Label>
                <Select 
                  value={categoriesColumn || ''} 
                  onValueChange={onCategoriesColumnChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.excel.selectColumn')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const letter = getColumnLetter(i);
                      return (
                        <SelectItem key={letter} value={letter}>
                          {t('config.excel.column')} {letter}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('config.excel.categoriesColumnDesc')}
                </p>
              </div>
            )}
          </div>

          {/* Quick Range Builders */}
          <div className="space-y-3">
            <Label>{t('config.excel.quickRangeBuilders')}</Label>
            <div className="flex flex-wrap gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => updatePeriodsRange('B', 'M')}
              >
                B-M ({t('config.excel.12months')})
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => updatePeriodsRange('C', 'N')}
              >
                C-N ({t('config.excel.12months')})
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => updatePeriodsRange('B', 'E')}
              >
                B-E ({t('config.excel.4quarters')})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Excel Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              {t('config.excel.layoutPreview')}
              {excelData?.preview?.filename && (
                <Badge variant="secondary" className="ml-2">
                  {excelData.preview.filename}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {configurationId && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={refreshExcelPreview}
                  disabled={loading}
                  leftIcon={loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                >
                  {loading ? t('common.loading') : t('common.refresh')}
                </Button>
              )}
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => setShowGrid(!showGrid)}
              >
                {showGrid ? t('common.hide') : t('common.show')} {t('config.excel.grid')}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showGrid && (
          <CardContent>
            <div className="space-y-4">
              {/* Error State */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">Error loading Excel data</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                  <p className="text-red-600 text-xs mt-2">
                    Showing template grid instead. Upload an Excel file to see real data.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">{t('common.loading')} Excel data...</span>
                </div>
              )}

              {/* Success State Info */}
              {excelData && !error && !loading && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 text-sm">
                    <Info className="h-4 w-4" />
                    <span>
                      Showing data from: <strong>{excelData.preview?.filename}</strong>
                      {excelData.preview?.totalRows && (
                        <span className="ml-2">
                          ({excelData.preview.totalRows} rows × {excelData.preview.totalCols} columns)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}


              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>{t('config.excel.periodsRangeLegend')}</span>
                </div>
                {configurationType === 'pnl' && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
                    <span>{t('config.excel.categoriesColumnLegend')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>{t('config.excel.headers')}</span>
                </div>
              </div>

              {/* Grid */}
              <div className="w-full">
                {generateGrid()}
              </div>

              {/* Selected Cell Info */}
              {selectedCell && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    {t('config.excel.selectedCell')}: <Badge variant="secondary">{selectedCell}</Badge>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}