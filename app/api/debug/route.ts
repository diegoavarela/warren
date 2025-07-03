import { NextRequest, NextResponse } from "next/server";
import { detectColumnTypes, detectFinancialStatementType } from "@/lib/financial-intelligence";

export async function POST(request: NextRequest) {
  try {
    const { sheetName = "Estado de Resultados", locale = "es-MX" } = await request.json();

    // Generate simple mock data for testing
    const mockData = [
      ['Cuenta', 'Descripción', 'Enero 2024', 'Febrero 2024', 'Marzo 2024'],
      ['4010', 'Ingresos por Ventas', '$125,000', '$132,000', '$128,000'],
      ['5010', 'Costo de Ventas', '-$75,000', '-$78,000', '-$76,000'],
      ['6010', 'Gastos Administrativos', '-$25,000', '-$26,000', '-$25,500'],
      ['6020', 'Gastos de Ventas', '-$15,000', '-$16,000', '-$15,200']
    ];

    const headers = mockData[0];
    const dataRows = mockData.slice(1);

    // Test financial detection
    const financialDetection = detectFinancialStatementType(dataRows, headers, locale as any);
    
    // Test column detection
    const columnDetections = detectColumnTypes(headers, dataRows, locale as any);

    return NextResponse.json({
      success: true,
      data: {
        headers,
        dataRows,
        financialDetection,
        columnDetections,
        mockData
      }
    });

  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Debug endpoint - use POST with sheetName and locale"
  });
}