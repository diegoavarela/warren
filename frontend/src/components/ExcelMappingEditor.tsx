import React, { useState, useEffect } from 'react';
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface MappingField {
  key: string;
  row: number;
  description: string;
  dataType: 'currency' | 'percentage' | 'number' | 'date';
}

interface ExcelMappingEditorProps {
  mapping: any;
  mappingType: 'cashflow' | 'pnl';
  onUpdate: (updatedMapping: any) => void;
  sampleData?: any;
}

export const ExcelMappingEditor: React.FC<ExcelMappingEditorProps> = ({
  mapping,
  mappingType,
  onUpdate,
  sampleData
}) => {
  const [editMode, setEditMode] = useState<string | null>(null);
  const [fields, setFields] = useState<MappingField[]>([]);
  const [dateRow, setDateRow] = useState(mapping.structure.dateRow || '');
  const [dateColumns, setDateColumns] = useState(
    mapping.structure.dateColumns?.join(', ') || ''
  );
  const [editingField, setEditingField] = useState<MappingField | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<MappingField>({
    key: '',
    row: 0,
    description: '',
    dataType: 'currency'
  });

  // Define required fields based on mapping type
  const requiredFields = mappingType === 'cashflow' ? [
    { key: 'totalIncome', label: 'Total Income/Collections', dataType: 'currency' },
    { key: 'totalExpense', label: 'Total Expenses/Outflows', dataType: 'currency' },
    { key: 'finalBalance', label: 'Final Balance', dataType: 'currency' },
    { key: 'lowestBalance', label: 'Lowest Balance', dataType: 'currency' },
    { key: 'monthlyGeneration', label: 'Monthly Cash Generation', dataType: 'currency' }
  ] : [
    { key: 'revenue', label: 'Total Revenue', dataType: 'currency' },
    { key: 'cogs', label: 'Cost of Goods Sold', dataType: 'currency' },
    { key: 'grossProfit', label: 'Gross Profit', dataType: 'currency' },
    { key: 'grossMargin', label: 'Gross Margin %', dataType: 'percentage' },
    { key: 'operatingExpenses', label: 'Operating Expenses', dataType: 'currency' },
    { key: 'netIncome', label: 'Net Income', dataType: 'currency' },
    { key: 'netMargin', label: 'Net Margin %', dataType: 'percentage' }
  ];

  useEffect(() => {
    // Convert mapping structure to editable fields
    const mappedFields: MappingField[] = Object.entries(mapping.structure.metricMappings || {})
      .map(([key, config]: [string, any]) => ({
        key,
        row: config.row,
        description: config.description,
        dataType: config.dataType || 'currency'
      }));
    setFields(mappedFields);
  }, [mapping]);

  const handleSaveField = () => {
    if (!editingField) return;

    const updatedFields = editMode === 'new'
      ? [...fields, editingField]
      : fields.map(f => f.key === editingField.key ? editingField : f);

    setFields(updatedFields);
    updateMapping(updatedFields);
    setEditMode(null);
    setEditingField(null);
    setShowAddField(false);
  };

  const handleDeleteField = (key: string) => {
    const updatedFields = fields.filter(f => f.key !== key);
    setFields(updatedFields);
    updateMapping(updatedFields);
  };

  const updateMapping = (updatedFields: MappingField[]) => {
    const newMapping = {
      ...mapping,
      structure: {
        ...mapping.structure,
        dateRow: parseInt(dateRow) || mapping.structure.dateRow,
        dateColumns: dateColumns.split(',').map(c => parseInt(c.trim())).filter(n => !isNaN(n)),
        metricMappings: updatedFields.reduce((acc, field) => ({
          ...acc,
          [field.key]: {
            row: field.row,
            description: field.description,
            dataType: field.dataType
          }
        }), {})
      }
    };
    onUpdate(newMapping);
  };

  const getSampleValue = (row: number, col?: number) => {
    if (!sampleData?.rows) return 'N/A';
    const rowData = sampleData.rows.find((r: any) => r.rowNumber === row);
    if (!rowData) return 'N/A';
    
    // If specific column requested, return that value
    if (col !== undefined && rowData.cells[col - 1]) {
      return rowData.cells[col - 1].value || 'N/A';
    }
    
    // Otherwise, return first non-empty cell value
    const firstValue = rowData.cells.find((c: any) => c.value)?.value;
    return firstValue || 'N/A';
  };

  const getMissingRequiredFields = () => {
    const mappedKeys = fields.map(f => f.key);
    return requiredFields.filter(req => !mappedKeys.includes(req.key));
  };

  const missingFields = getMissingRequiredFields();

  return (
    <div className="space-y-6">
      {/* Date Configuration */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
          Date Configuration
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Row Number
            </label>
            <input
              type="number"
              value={dateRow}
              onChange={(e) => {
                setDateRow(e.target.value);
                updateMapping(fields);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., 3"
            />
            {sampleData && dateRow && (
              <p className="mt-1 text-xs text-gray-500">
                Sample: {getSampleValue(parseInt(dateRow), 2)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Column Numbers
            </label>
            <input
              type="text"
              value={dateColumns}
              onChange={(e) => {
                setDateColumns(e.target.value);
                updateMapping(fields);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., 2, 3, 4, 5"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated column numbers
            </p>
          </div>
        </div>
      </div>

      {/* Missing Required Fields Warning */}
      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Missing Required Fields</h4>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {missingFields.map(field => (
              <li key={field.key}>{field.label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metric Mappings */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900">Metric Mappings</h4>
          <button
            onClick={() => {
              setShowAddField(true);
              setEditMode('new');
              setEditingField({
                key: '',
                row: 0,
                description: '',
                dataType: 'currency'
              });
            }}
            className="flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Field
          </button>
        </div>

        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.key} className="bg-white border border-gray-200 rounded-lg p-3">
              {editMode === field.key ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editingField?.key || ''}
                      onChange={(e) => setEditingField({ ...editingField!, key: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="Field key"
                    />
                    <input
                      type="number"
                      value={editingField?.row || ''}
                      onChange={(e) => setEditingField({ ...editingField!, row: parseInt(e.target.value) || 0 })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="Row number"
                    />
                    <select
                      value={editingField?.dataType || 'currency'}
                      onChange={(e) => setEditingField({ ...editingField!, dataType: e.target.value as any })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="currency">Currency</option>
                      <option value="percentage">Percentage</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={editingField?.description || ''}
                    onChange={(e) => setEditingField({ ...editingField!, description: e.target.value })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="Description"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditMode(null);
                        setEditingField(null);
                      }}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSaveField}
                      className="px-3 py-1 text-green-600 hover:text-green-800"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-gray-900">{field.key}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                        {field.dataType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Row {field.row}: {field.description}
                    </p>
                    {sampleData && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sample value: {getSampleValue(field.row)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditMode(field.key);
                        setEditingField(field);
                      }}
                      className="text-gray-500 hover:text-purple-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteField(field.key)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Field Form */}
          {showAddField && editMode === 'new' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newField.key}
                    onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="Field key"
                  />
                  <input
                    type="number"
                    value={newField.row || ''}
                    onChange={(e) => setNewField({ ...newField, row: parseInt(e.target.value) || 0 })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="Row number"
                  />
                  <select
                    value={newField.dataType}
                    onChange={(e) => setNewField({ ...newField, dataType: e.target.value as any })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="currency">Currency</option>
                    <option value="percentage">Percentage</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={newField.description}
                  onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                  placeholder="Description (e.g., Total Revenue, Net Income)"
                />
                {sampleData && newField.row > 0 && (
                  <p className="text-xs text-gray-500">
                    Row {newField.row} sample: {getSampleValue(newField.row)}
                  </p>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowAddField(false);
                      setEditMode(null);
                      setNewField({ key: '', row: 0, description: '', dataType: 'currency' });
                    }}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newField.key && newField.row && newField.description) {
                        setEditingField(newField);
                        handleSaveField();
                        setNewField({ key: '', row: 0, description: '', dataType: 'currency' });
                      }
                    }}
                    disabled={!newField.key || !newField.row || !newField.description}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Field
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Helper Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2" />
          Mapping Tips
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use descriptive field keys (e.g., 'totalRevenue', 'operatingExpenses')</li>
          <li>• Check sample values to ensure correct row selection</li>
          <li>• Date columns should contain actual date values</li>
          <li>• Currency fields will be parsed to remove symbols and formatting</li>
        </ul>
      </div>
    </div>
  );
};