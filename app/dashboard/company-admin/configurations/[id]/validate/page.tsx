'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Settings, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Configuration {
  id: string;
  name: string;
  type: 'cashflow' | 'pnl';
  version: number;
  configJson: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    row?: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    row?: number;
    message: string;
    severity: 'warning';
  }>;
  mappedData?: any;
  summary: {
    totalFields: number;
    validFields: number;
    missingFields: number;
    invalidFields: number;
  };
  mathValidation?: {
    categoryTotals?: Record<string, {
      expectedTotal: number;
      calculatedTotal: number;
      difference: number;
      differencePercent: number;
      isValid: boolean;
      categories: Array<{
        name: string;
        value: number;
        row: number;
        percentage: number;
      }>;
    }>;
    formulaChecks?: Array<{
      formula: string;
      expected: number;
      actual: number;
      isValid: boolean;
      errorMessage?: string;
    }>;
    balanceValidation?: {
      initialBalance: number;
      finalBalance: number;
      totalInflows: number;
      totalOutflows: number;
      calculatedFinalBalance: number;
      isValid: boolean;
      difference: number;
    };
  };
}

export default function ConfigurationValidatePage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const configId = params.id as string;
  
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (configId) {
      fetchConfigurationAndValidate();
    }
  }, [configId]);

  const fetchConfigurationAndValidate = async () => {
    try {
      setLoading(true);
      
      // Fetch configuration
      const configResponse = await fetch(`/api/configurations/${configId}`);
      if (!configResponse.ok) {
        throw new Error('Failed to fetch configuration');
      }
      
      const configResult = await configResponse.json();
      setConfiguration(configResult.data);
      
      // Validate configuration
      await validateConfiguration();
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = async () => {
    try {
      setValidating(true);
      
      const response = await fetch(`/api/configurations/${configId}/validate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Validation failed');
      }
      
      const result = await response.json();
      setValidationResult(result.data);
      
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Error al validar la configuración');
    } finally {
      setValidating(false);
    }
  };

  const getStatusColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ToastContainer 
        toasts={toast.toasts} 
        onClose={toast.removeToast} 
        position="top-right" 
      />
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/dashboard/company-admin/configurations/${configId}`)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a Configuración
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Validación de Configuración</h1>
            {configuration && (
              <p className="text-muted-foreground mt-2">
                {configuration.name} • Versión {configuration.version} • {configuration.type === 'cashflow' ? 'Cash Flow' : 'P&L'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={validateConfiguration}
              disabled={validating}
              leftIcon={validating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
            >
              {validating ? 'Validando...' : 'Re-validar'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Validation Summary */}
          {validationResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {validationResult.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      Resumen de Validación
                    </CardTitle>
                    <CardDescription>
                      {validationResult.isValid 
                        ? 'La configuración es válida y está lista para usar'
                        : 'Se encontraron problemas en la configuración'
                      }
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={validationResult.isValid ? 'default' : 'destructive'}
                    className={validationResult.isValid ? 'bg-green-100 text-green-800' : ''}
                  >
                    {validationResult.isValid ? 'VÁLIDA' : 'INVÁLIDA'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{validationResult.summary.totalFields}</div>
                    <div className="text-sm text-muted-foreground">Campos Totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{validationResult.summary.validFields}</div>
                    <div className="text-sm text-muted-foreground">Válidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{validationResult.summary.invalidFields}</div>
                    <div className="text-sm text-muted-foreground">Con Errores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{validationResult.summary.missingFields}</div>
                    <div className="text-sm text-muted-foreground">Faltantes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {validationResult && validationResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Errores ({validationResult.errors.length})
                </CardTitle>
                <CardDescription>
                  Los siguientes errores deben ser corregidos antes de usar la configuración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getStatusColor(error.severity)}`}>
                      <div className="flex items-start gap-2">
                        {getStatusIcon(error.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{error.field}</span>
                            {error.row && (
                              <Badge variant="outline" className="text-xs">Fila {error.row}</Badge>
                            )}
                          </div>
                          <p className="text-sm">{error.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {validationResult && validationResult.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Advertencias ({validationResult.warnings.length})
                </CardTitle>
                <CardDescription>
                  Las siguientes advertencias pueden afectar el procesamiento de archivos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getStatusColor(warning.severity)}`}>
                      <div className="flex items-start gap-2">
                        {getStatusIcon(warning.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{warning.field}</span>
                            {warning.row && (
                              <Badge variant="outline" className="text-xs">Fila {warning.row}</Badge>
                            )}
                          </div>
                          <p className="text-sm">{warning.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mathematical Validation Results - Only show if there are actual results */}
          {validationResult && validationResult.mathValidation && (
            (Object.keys(validationResult.mathValidation.categoryTotals || {}).length > 0 ||
             (validationResult.mathValidation.formulaChecks && validationResult.mathValidation.formulaChecks.length > 0) ||
             validationResult.mathValidation.balanceValidation) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  Validación Matemática
                </CardTitle>
                <CardDescription>
                  Verificación de consistencia matemática entre categorías y totales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Totals - Compact version */}
                {validationResult.mathValidation.categoryTotals && Object.entries(validationResult.mathValidation.categoryTotals).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Totales por Categoría</h4>
                    <div className="space-y-2">
                      {Object.entries(validationResult.mathValidation.categoryTotals).map(([sectionName, validation]) => (
                        <div key={sectionName} className={`p-3 rounded border text-sm ${validation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">
                              {sectionName === 'inflows' ? 'Entradas' : sectionName === 'outflows' ? 'Salidas' : sectionName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${validation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                                {validation.isValid 
                                  ? `✓ Coincide (${validation.expectedTotal.toLocaleString()})`
                                  : `✗ Diferencia: ${Math.abs(validation.difference).toLocaleString()} (${validation.differencePercent.toFixed(1)}%)`
                                }
                              </span>
                              {validation.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formula Validation - Compact version */}
                {validationResult.mathValidation.formulaChecks && validationResult.mathValidation.formulaChecks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Fórmulas</h4>
                    <div className="space-y-2">
                      {validationResult.mathValidation.formulaChecks.map((formula, index) => (
                        <div key={index} className={`p-3 rounded border text-sm ${formula.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{formula.formula}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${formula.isValid ? 'text-green-700' : 'text-red-700'}`}>
                                {formula.isValid 
                                  ? `✓ ${formula.expected.toLocaleString()}`
                                  : `✗ ${formula.expected.toLocaleString()} ≠ ${formula.actual.toLocaleString()}`
                                }
                              </span>
                              {formula.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Balance Validation - Compact version */}
                {validationResult.mathValidation.balanceValidation && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Balance de Efectivo</h4>
                    <div className={`p-3 rounded border text-sm ${validationResult.mathValidation.balanceValidation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Balance Final = Balance Inicial + Entradas - Salidas</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${validationResult.mathValidation.balanceValidation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                            {validationResult.mathValidation.balanceValidation.isValid 
                              ? `✓ ${validationResult.mathValidation.balanceValidation.finalBalance.toLocaleString()}`
                              : `✗ Diferencia: ${Math.abs(validationResult.mathValidation.balanceValidation.difference).toLocaleString()}`
                            }
                          </span>
                          {validationResult.mathValidation.balanceValidation.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )
          )}

          {/* Success State */}
          {validationResult && validationResult.isValid && validationResult.errors.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-900 mb-2">
                    ¡Configuración Válida!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Tu configuración ha pasado todas las validaciones y está lista para procesar archivos.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={() => router.push(`/dashboard/company-admin/configurations/${configId}/process`)}
                      leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                    >
                      Procesar Archivo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/company-admin/configurations/${configId}`)}
                    >
                      Ver Configuración
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No validation result yet */}
          {!validationResult && !validating && !loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Ejecutar Validación
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Haz clic en "Re-validar" para verificar tu configuración.
                  </p>
                  <Button
                    onClick={validateConfiguration}
                    leftIcon={<Settings className="h-4 w-4" />}
                  >
                    Validar Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}