/**
 * QuickBooks Sandbox Setup Endpoint
 *
 * This endpoint helps examine and populate the sandbox company with test data
 */

import { NextRequest, NextResponse } from 'next/server';
import { callQuickBooksAPI } from '@/lib/services/quickbooks-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realmId = searchParams.get('realmId');
    const action = searchParams.get('action') || 'examine';

    if (!realmId) {
      return NextResponse.json({
        error: 'realmId parameter is required'
      }, { status: 400 });
    }

    console.log('🔍 [QuickBooks Sandbox] Starting sandbox setup for realm:', realmId);
    console.log('🔍 [QuickBooks Sandbox] Action:', action);

    if (action === 'examine') {
      return await examineCompanyData(realmId);
    } else if (action === 'create-transactions') {
      return await createSampleTransactions(realmId);
    } else {
      return NextResponse.json({
        error: 'Invalid action. Use: examine, create-transactions'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [QuickBooks Sandbox] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function examineCompanyData(realmId: string) {
  console.log('🔍 [QuickBooks Sandbox] Examining company data...');

  // Get company info
  const companyInfo = await callQuickBooksAPI(realmId, `companyinfo/${realmId}`);

  // Get accounts
  const accountsResponse = await callQuickBooksAPI(
    realmId,
    `query?query=SELECT * FROM Account`
  );
  const accounts = accountsResponse?.QueryResponse?.Account || [];

  // Filter revenue accounts (Income type)
  const incomeAccounts = accounts.filter((acc: any) =>
    acc.AccountType === 'Income' || acc.AccountSubType === 'ServiceFeeIncome'
  );

  // Get existing invoices
  const invoicesResponse = await callQuickBooksAPI(
    realmId,
    `query?query=SELECT * FROM Invoice`
  );
  const invoices = invoicesResponse?.QueryResponse?.Invoice || [];

  // Get customers
  const customersResponse = await callQuickBooksAPI(
    realmId,
    `query?query=SELECT * FROM Customer MAXRESULTS 5`
  );
  const customers = customersResponse?.QueryResponse?.Customer || [];

  // Get items/services
  const itemsResponse = await callQuickBooksAPI(
    realmId,
    `query?query=SELECT * FROM Item WHERE Type='Service' MAXRESULTS 10`
  );
  const items = itemsResponse?.QueryResponse?.Item || [];

  console.log('📊 [QuickBooks Sandbox] Company analysis:', {
    totalAccounts: accounts.length,
    incomeAccounts: incomeAccounts.length,
    totalInvoices: invoices.length,
    totalCustomers: customers.length,
    totalItems: items.length
  });

  return NextResponse.json({
    success: true,
    analysis: {
      company: {
        name: companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName,
        realmId
      },
      accounts: {
        total: accounts.length,
        incomeAccounts: incomeAccounts.map((acc: any) => ({
          id: acc.Id,
          name: acc.Name,
          type: acc.AccountType,
          subType: acc.AccountSubType
        }))
      },
      transactions: {
        totalInvoices: invoices.length,
        recentInvoices: invoices.slice(0, 3).map((inv: any) => ({
          id: inv.Id,
          docNumber: inv.DocNumber,
          totalAmt: inv.TotalAmt,
          txnDate: inv.TxnDate
        }))
      },
      customers: {
        total: customers.length,
        list: customers.slice(0, 5).map((cust: any) => ({
          id: cust.Id,
          name: cust.Name
        }))
      },
      items: {
        total: items.length,
        services: items.map((item: any) => ({
          id: item.Id,
          name: item.Name,
          type: item.Type,
          unitPrice: item.UnitPrice
        }))
      }
    }
  });
}

async function createSampleTransactions(realmId: string) {
  console.log('🔍 [QuickBooks Sandbox] Creating sample transactions...');

  // First examine what we have to work with
  const examineResult = await examineCompanyData(realmId);
  const analysis = JSON.parse(await examineResult.text()).analysis;

  if (analysis.customers.total === 0) {
    throw new Error('No customers found. Cannot create invoices without customers.');
  }

  if (analysis.items.total === 0) {
    throw new Error('No service items found. Cannot create invoices without items.');
  }

  const customer = analysis.customers.list[0];
  const serviceItem = analysis.items.services[0];

  console.log('🔍 [QuickBooks Sandbox] Using customer:', customer.name);
  console.log('🔍 [QuickBooks Sandbox] Using service:', serviceItem.name);

  // Create a sample invoice
  const invoiceData = {
    Line: [{
      Amount: 1000.00,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: {
          value: serviceItem.id,
          name: serviceItem.name
        },
        Qty: 1,
        UnitPrice: 1000.00
      }
    }],
    CustomerRef: {
      value: customer.id
    },
    TxnDate: "2024-12-01", // Use a date that should show up in reports
    DueDate: "2024-12-31"
  };

  console.log('🔍 [QuickBooks Sandbox] Creating invoice with data:', JSON.stringify(invoiceData, null, 2));

  try {
    const newInvoice = await callQuickBooksAPI(
      realmId,
      'invoice',
      'POST',
      invoiceData
    );

    console.log('✅ [QuickBooks Sandbox] Created invoice:', newInvoice?.Invoice?.Id);

    return NextResponse.json({
      success: true,
      message: 'Sample invoice created successfully',
      invoice: {
        id: newInvoice?.Invoice?.Id,
        amount: newInvoice?.Invoice?.TotalAmt,
        customer: customer.name,
        service: serviceItem.name,
        date: invoiceData.TxnDate
      },
      nextSteps: [
        'Wait a moment for QuickBooks to process the transaction',
        'Then test the P&L report endpoints again',
        'The ProfitAndLossDetail should now show individual account names'
      ]
    });

  } catch (error) {
    console.error('❌ [QuickBooks Sandbox] Error creating invoice:', error);
    throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}