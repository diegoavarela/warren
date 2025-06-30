import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { auditService } from './saas/AuditService';
import { CashflowService } from './CashflowService';
import { PnLService } from './PnLService';
import { encryptionService } from '../utils/encryption';

// Extended cashflow entry that might come from database
interface ExtendedCashflowEntry {
  date: string | Date;
  description?: string;
  income?: number;
  expenses?: number;
  cashflow?: number;
  cumulativeCash?: number;
  amount?: number;
  ending_balance?: number;
}

export interface WidgetDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  defaultSize: any;
  minSize: any;
  maxSize: any;
  configSchema?: any;
  dataRequirements?: any;
  tierRequirement?: string;
  isActive: boolean;
}

export interface DashboardLayout {
  id: string;
  companyId: string;
  userId: number;
  name: string;
  description?: string;
  isDefault: boolean;
  isShared: boolean;
  roleTemplate?: string;
  gridColumns: number;
  gridRowHeight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  layoutId: string;
  widgetDefinitionId: string;
  position: any;
  config: any;
  dataSourceId?: string;
  refreshInterval?: number;
  widgetDefinition?: WidgetDefinition;
}

export class WidgetService {
  private static instance: WidgetService;
  private pool: Pool;
  private cashflowService: CashflowService;
  private pnlService: PnLService;

  private constructor(pool: Pool) {
    this.pool = pool;
    this.cashflowService = CashflowService.getInstance();
    this.pnlService = PnLService.getInstance();
  }

  static getInstance(pool: Pool): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService(pool);
    }
    return WidgetService.instance;
  }

  /**
   * Get widget definitions available to company
   */
  async getWidgetDefinitions(companyId: string): Promise<WidgetDefinition[]> {
    const query = `
      SELECT wd.*, 
        CASE 
          WHEN wd.tier_requirement IS NULL THEN true
          ELSE can_access_widget($1, wd.code)
        END as is_accessible
      FROM widget_definitions wd
      WHERE wd.is_active = true
      ORDER BY wd.category, wd.name
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      defaultSize: row.default_size,
      minSize: row.min_size,
      maxSize: row.max_size,
      configSchema: row.config_schema,
      dataRequirements: row.data_requirements,
      tierRequirement: row.tier_requirement,
      isActive: row.is_active,
      isAccessible: row.is_accessible
    }));
  }

  /**
   * Get dashboard layouts
   */
  async getDashboardLayouts(userId: number, companyId: string): Promise<DashboardLayout[]> {
    const query = `
      SELECT dl.* 
      FROM dashboard_layouts dl
      WHERE dl.company_id = $1
      AND (
        dl.user_id = $2 
        OR dl.is_shared = true
        OR EXISTS (
          SELECT 1 FROM dashboard_shares ds 
          WHERE ds.layout_id = dl.id 
          AND (ds.shared_with_user_id = $2 OR ds.shared_with_role = (
            SELECT role FROM users WHERE id = $2
          ))
        )
      )
      ORDER BY dl.is_default DESC, dl.created_at DESC
    `;

    const result = await this.pool.query(query, [companyId, userId]);
    return result.rows.map(row => this.mapToDashboardLayout(row));
  }

  /**
   * Get specific dashboard with widgets
   */
  async getDashboard(layoutId: string, userId: number, companyId: string): Promise<{
    layout: DashboardLayout;
    widgets: DashboardWidget[];
  } | null> {
    // Verify access
    const layoutQuery = `
      SELECT dl.* 
      FROM dashboard_layouts dl
      WHERE dl.id = $1 AND dl.company_id = $2
      AND (
        dl.user_id = $3 
        OR dl.is_shared = true
        OR EXISTS (
          SELECT 1 FROM dashboard_shares ds 
          WHERE ds.layout_id = dl.id 
          AND (ds.shared_with_user_id = $3 OR ds.shared_with_role = (
            SELECT role FROM users WHERE id = $3
          ))
        )
      )
    `;

    const layoutResult = await this.pool.query(layoutQuery, [layoutId, companyId, userId]);
    
    if (layoutResult.rows.length === 0) {
      return null;
    }

    const layout = this.mapToDashboardLayout(layoutResult.rows[0]);

    // Get widgets
    const widgetsQuery = `
      SELECT 
        dw.id as widget_id,
        dw.layout_id,
        dw.widget_definition_id,
        dw.position,
        dw.config,
        dw.data_source_id,
        dw.refresh_interval,
        wd.id as definition_id,
        wd.code,
        wd.name,
        wd.description,
        wd.category,
        wd.default_size,
        wd.min_size,
        wd.max_size,
        wd.tier_requirement,
        wd.is_active
      FROM dashboard_widgets dw
      JOIN widget_definitions wd ON dw.widget_definition_id = wd.id
      WHERE dw.layout_id = $1
      ORDER BY dw.position->>'y', dw.position->>'x'
    `;

    const widgetsResult = await this.pool.query(widgetsQuery, [layoutId]);
    const widgets = widgetsResult.rows.map(row => ({
      id: row.widget_id,
      layoutId: row.layout_id,
      widgetDefinitionId: row.widget_definition_id,
      position: row.position,
      config: row.config,
      dataSourceId: row.data_source_id,
      refreshInterval: row.refresh_interval,
      widgetDefinition: {
        id: row.widget_definition_id,
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category,
        defaultSize: row.default_size,
        minSize: row.min_size,
        maxSize: row.max_size,
        tierRequirement: row.tier_requirement,
        isActive: row.is_active
      }
    }));

    return { layout, widgets };
  }

  /**
   * Create dashboard
   */
  async createDashboard(params: {
    userId: number;
    companyId: string;
    name: string;
    description?: string;
  }): Promise<DashboardLayout> {
    const query = `
      INSERT INTO dashboard_layouts (company_id, user_id, name, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      params.companyId,
      params.userId,
      params.name,
      params.description
    ]);

    const dashboard = this.mapToDashboardLayout(result.rows[0]);

    // Audit log
    await auditService.log({
      userId: params.userId,
      companyId: params.companyId,
      action: 'dashboard.created',
      entityType: 'dashboard',
      entityId: dashboard.id,
      newValues: { name: params.name }
    });

    logger.info(`Created dashboard: ${dashboard.id} for user: ${params.userId}`);
    return dashboard;
  }

  /**
   * Create dashboard from template
   */
  async createDashboardFromTemplate(
    userId: number,
    companyId: string,
    templateRole: string,
    dashboardName: string
  ): Promise<string> {
    const query = `SELECT create_dashboard_from_template($1, $2, $3, $4)`;
    const result = await this.pool.query(query, [userId, companyId, templateRole, dashboardName]);
    return result.rows[0].create_dashboard_from_template;
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    layoutId: string,
    userId: number,
    companyId: string,
    updates: Partial<DashboardLayout>
  ): Promise<DashboardLayout> {
    // Verify ownership
    const verifyQuery = `
      SELECT 1 FROM dashboard_layouts 
      WHERE id = $1 AND company_id = $2 AND user_id = $3
    `;
    const verifyResult = await this.pool.query(verifyQuery, [layoutId, companyId, userId]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error('Dashboard not found or access denied');
    }

    const allowedUpdates = ['name', 'description', 'is_default', 'is_shared'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid updates provided');
    }

    values.push(layoutId);
    const updateQuery = `
      UPDATE dashboard_layouts
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(updateQuery, values);
    return this.mapToDashboardLayout(result.rows[0]);
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(layoutId: string, userId: number, companyId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Verify ownership
      const verifyQuery = `
        SELECT name FROM dashboard_layouts 
        WHERE id = $1 AND company_id = $2 AND user_id = $3
      `;
      const verifyResult = await client.query(verifyQuery, [layoutId, companyId, userId]);
      
      if (verifyResult.rows.length === 0) {
        throw new Error('Dashboard not found or access denied');
      }

      const dashboardName = verifyResult.rows[0].name;

      // Delete dashboard (cascades to widgets and shares)
      await client.query('DELETE FROM dashboard_layouts WHERE id = $1', [layoutId]);

      await client.query('COMMIT');

      // Audit log
      await auditService.log({
        userId,
        companyId,
        action: 'dashboard.deleted',
        entityType: 'dashboard',
        entityId: layoutId,
        oldValues: { name: dashboardName }
      });

      logger.info(`Deleted dashboard: ${layoutId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(params: {
    layoutId: string;
    userId: number;
    companyId: string;
    widgetDefinitionId: string;
    position: any;
    config?: any;
    dataSourceId?: string;
  }): Promise<DashboardWidget> {
    // Verify dashboard access and widget tier
    const verifyQuery = `
      SELECT 
        dl.id,
        wd.code,
        can_access_widget($1, wd.code) as can_access
      FROM dashboard_layouts dl
      CROSS JOIN widget_definitions wd
      WHERE dl.id = $2 
      AND dl.company_id = $1
      AND wd.id = $3
      AND (dl.user_id = $4 OR dl.is_shared = true)
    `;

    const verifyResult = await this.pool.query(verifyQuery, [
      params.companyId,
      params.layoutId,
      params.widgetDefinitionId,
      params.userId
    ]);

    if (verifyResult.rows.length === 0 || !verifyResult.rows[0].can_access) {
      throw new Error('Cannot add widget - access denied or tier requirement not met');
    }

    const insertQuery = `
      INSERT INTO dashboard_widgets (
        layout_id, widget_definition_id, position, config, data_source_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.pool.query(insertQuery, [
      params.layoutId,
      params.widgetDefinitionId,
      JSON.stringify(params.position),
      JSON.stringify(params.config || {}),
      params.dataSourceId
    ]);

    logger.info(`Added widget to dashboard: ${params.layoutId}`);
    return this.mapToDashboardWidget(result.rows[0]);
  }

  /**
   * Update widget
   */
  async updateWidget(
    widgetId: string,
    userId: number,
    companyId: string,
    updates: {
      position?: any;
      config?: any;
      dataSourceId?: string;
    }
  ): Promise<DashboardWidget> {
    // Verify access
    const verifyQuery = `
      SELECT dw.id
      FROM dashboard_widgets dw
      JOIN dashboard_layouts dl ON dw.layout_id = dl.id
      WHERE dw.id = $1 
      AND dl.company_id = $2
      AND (dl.user_id = $3 OR dl.is_shared = true)
    `;

    const verifyResult = await this.pool.query(verifyQuery, [widgetId, companyId, userId]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error('Widget not found or access denied');
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.position !== undefined) {
      updateFields.push(`position = $${paramCount}`);
      values.push(JSON.stringify(updates.position));
      paramCount++;
    }

    if (updates.config !== undefined) {
      updateFields.push(`config = $${paramCount}`);
      values.push(JSON.stringify(updates.config));
      paramCount++;
    }

    if (updates.dataSourceId !== undefined) {
      updateFields.push(`data_source_id = $${paramCount}`);
      values.push(updates.dataSourceId);
      paramCount++;
    }

    if (updateFields.length === 0) {
      throw new Error('No valid updates provided');
    }

    values.push(widgetId);
    const updateQuery = `
      UPDATE dashboard_widgets
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(updateQuery, values);
    return this.mapToDashboardWidget(result.rows[0]);
  }

  /**
   * Delete widget
   */
  async deleteWidget(widgetId: string, userId: number, companyId: string): Promise<void> {
    // Verify access
    const deleteQuery = `
      DELETE FROM dashboard_widgets
      WHERE id = $1
      AND EXISTS (
        SELECT 1 FROM dashboard_layouts dl
        WHERE dl.id = dashboard_widgets.layout_id
        AND dl.company_id = $2
        AND (dl.user_id = $3 OR dl.is_shared = true)
      )
    `;

    const result = await this.pool.query(deleteQuery, [widgetId, companyId, userId]);
    
    if (result.rowCount === 0) {
      throw new Error('Widget not found or access denied');
    }

    logger.info(`Deleted widget: ${widgetId}`);
  }

  /**
   * Get widget data
   */
  async getWidgetData(widgetId: string, userId: number, companyId: string): Promise<any> {
    // Get widget details
    const widgetQuery = `
      SELECT dw.*, wd.code, wd.data_requirements
      FROM dashboard_widgets dw
      JOIN widget_definitions wd ON dw.widget_definition_id = wd.id
      JOIN dashboard_layouts dl ON dw.layout_id = dl.id
      WHERE dw.id = $1 
      AND dl.company_id = $2
      AND (dl.user_id = $3 OR dl.is_shared = true)
    `;

    const widgetResult = await this.pool.query(widgetQuery, [widgetId, companyId, userId]);
    
    if (widgetResult.rows.length === 0) {
      throw new Error('Widget not found or access denied');
    }

    const widget = widgetResult.rows[0];
    const widgetCode = widget.code;
    const config = widget.config || {};
    const dataSourceId = widget.data_source_id;

    // Generate data based on widget type
    switch (widgetCode) {
      case 'cash_flow_trend':
        return this.getCashFlowTrendData(companyId, config, dataSourceId);
      
      case 'revenue_chart':
        return this.getRevenueChartData(companyId, config, dataSourceId);
      
      case 'kpi_card':
        return this.getKPICardData(companyId, config, dataSourceId);
        
      case 'expense_breakdown':
        return this.getExpenseBreakdownData(companyId, config, dataSourceId);
        
      case 'profit_margin':
        return this.getProfitMarginData(companyId, config, dataSourceId);
        
      case 'burn_rate':
        return this.getBurnRateData(companyId, config, dataSourceId);
        
      case 'data_table':
        return this.getDataTableData(companyId, config, dataSourceId);
        
      case 'recent_transactions':
        return this.getRecentTransactionsData(companyId, config, dataSourceId);
      
      case 'alerts_feed':
        return this.getAlertsFeedData(companyId, config, dataSourceId);
        
      case 'kpi_comparison':
        return this.getKPIComparisonData(companyId, config, dataSourceId);
        
      case 'target_gauge':
        return this.getTargetGaugeData(companyId, config, dataSourceId);
        
      case 'executive_summary':
        return this.getExecutiveSummaryData(companyId, config, dataSourceId);
      
      // For enterprise/advanced widgets, return enhanced placeholder for now
      case 'forecast_chart':
      case 'scenario_planner':
      case 'anomaly_detector':
        return this.getEnhancedPlaceholderData(widgetCode, companyId, dataSourceId);
      
      default:
        return this.getPlaceholderData(widgetCode);
    }
  }

  /**
   * Refresh widget data
   */
  async refreshWidgetData(widgetId: string, userId: number, companyId: string): Promise<any> {
    // Clear cache if exists
    await this.pool.query(
      'DELETE FROM widget_data_cache WHERE widget_id = $1',
      [widgetId]
    );

    // Get fresh data
    return this.getWidgetData(widgetId, userId, companyId);
  }

  /**
   * Get financial records from database with decryption
   */
  private async getFinancialRecords(companyId: string, startDate?: Date, endDate?: Date, dataSourceId?: string): Promise<any[]> {
    let query = `
      SELECT 
        date,
        description,
        amount_encrypted,
        record_type,
        category,
        subcategory,
        currency,
        metadata
      FROM financial_records 
      WHERE company_id = $1
    `;
    
    const params = [companyId];
    
    if (dataSourceId) {
      query += ` AND data_source_id = $${params.length + 1}`;
      params.push(dataSourceId);
    }
    
    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate.toISOString().split('T')[0]);
    }
    
    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate.toISOString().split('T')[0]);
    }
    
    query += ` ORDER BY date ASC`;
    
    const result = await this.pool.query(query, params);
    
    // Decrypt amounts
    const decryptedRecords = [];
    for (const record of result.rows) {
      try {
        const amount = await encryptionService.decryptNumber(record.amount_encrypted, companyId);
        decryptedRecords.push({
          ...record,
          amount: record.record_type === 'expense' ? -amount : amount,
          date: record.date.toISOString().split('T')[0]
        });
      } catch (error) {
        logger.error('Error decrypting financial record:', error);
        // Skip corrupted records
      }
    }
    
    return decryptedRecords;
  }

  /**
   * Get cash flow trend data
   */
  private async getCashFlowTrendData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    const period = config.period || '6months';
    const monthsCount = period === '1month' ? 1 : 
                       period === '3months' ? 3 : 
                       period === '6months' ? 6 : 
                       period === '1year' ? 12 : 24;

    try {
      // First try to get data from cashflow_data table
      let query = `
        SELECT 
          date,
          cash_inflows,
          cash_outflows,
          net_cash_flow,
          ending_balance,
          burn_rate,
          runway_months
        FROM cashflow_data
        WHERE company_id = $1
        AND date >= $2
      `;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsCount);
      
      const params: any[] = [companyId, startDate.toISOString().split('T')[0]];
      
      if (dataSourceId) {
        query += ` AND data_source_id = $${params.length + 1}`;
        params.push(dataSourceId);
      }
      
      query += ` ORDER BY date ASC`;
      
      const cashflowResult = await this.pool.query(query, params);
      
      if (cashflowResult.rows.length > 0) {
        // Process cashflow data
        const labels = cashflowResult.rows.map(row => {
          const date = new Date(row.date);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        
        const totalInflow = cashflowResult.rows.reduce((sum, row) => sum + parseFloat(row.cash_inflows), 0);
        const totalOutflow = cashflowResult.rows.reduce((sum, row) => sum + parseFloat(row.cash_outflows), 0);
        const avgBalance = cashflowResult.rows.reduce((sum, row) => sum + parseFloat(row.ending_balance), 0) / cashflowResult.rows.length;
        
        return {
          labels,
          datasets: [
            {
              label: 'Inflow',
              data: cashflowResult.rows.map(row => parseFloat(row.cash_inflows)),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)'
            },
            {
              label: 'Outflow',
              data: cashflowResult.rows.map(row => parseFloat(row.cash_outflows)),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)'
            },
            {
              label: 'Balance',
              data: cashflowResult.rows.map(row => parseFloat(row.ending_balance)),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              yAxisID: 'balance'
            }
          ],
          summary: {
            totalInflow,
            totalOutflow,
            netFlow: totalInflow - totalOutflow,
            averageBalance: avgBalance,
            lastRunway: cashflowResult.rows[cashflowResult.rows.length - 1]?.runway_months || 0
          }
        };
      }
      
      // Fallback to financial_records if no cashflow data
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      
      if (!financialRecords || financialRecords.length === 0) {
        return this.getPlaceholderData('cash_flow_trend');
      }

      // Aggregate by month
      const monthlyData = new Map<string, { inflow: number; outflow: number; balance: number }>();
      let runningBalance = 0;
      
      financialRecords.forEach((item: any) => {
        const monthKey = item.date.slice(0, 7); // YYYY-MM format
        const current = monthlyData.get(monthKey) || { inflow: 0, outflow: 0, balance: 0 };
        
        if (item.amount > 0) {
          current.inflow += item.amount;
        } else {
          current.outflow += Math.abs(item.amount);
        }
        
        runningBalance += item.amount;
        current.balance = runningBalance;
        
        monthlyData.set(monthKey, current);
      });

      const sortedMonths = Array.from(monthlyData.keys()).sort();
      
      return {
        labels: sortedMonths.map(month => {
          const date = new Date(month + '-01');
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [
          {
            label: 'Inflow',
            data: sortedMonths.map(month => monthlyData.get(month)!.inflow),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          },
          {
            label: 'Outflow',
            data: sortedMonths.map(month => monthlyData.get(month)!.outflow),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
          }
        ],
        summary: {
          totalInflow: Array.from(monthlyData.values()).reduce((sum, m) => sum + m.inflow, 0),
          totalOutflow: Array.from(monthlyData.values()).reduce((sum, m) => sum + m.outflow, 0),
          netFlow: Array.from(monthlyData.values()).reduce((sum, m) => sum + m.inflow - m.outflow, 0),
          averageBalance: Array.from(monthlyData.values()).reduce((sum, m) => sum + m.balance, 0) / monthlyData.size
        }
      };
    } catch (error) {
      logger.error('Error getting cash flow trend data:', error);
      return this.getPlaceholderData('cash_flow_trend');
    }
  }

  /**
   * Get revenue chart data
   */
  private async getRevenueChartData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const period = config.period || '6months';
      const monthsCount = period === '1month' ? 1 : 
                         period === '3months' ? 3 : 
                         period === '6months' ? 6 : 
                         period === '1year' ? 12 : 24;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsCount);
      
      // First try to get data from new pnl_data table
      let query = `
        SELECT month, revenue
        FROM pnl_data
        WHERE company_id = $1
      `;
      
      const params: any[] = [companyId];
      
      if (dataSourceId) {
        query += ` AND data_source_id = $${params.length + 1}`;
        params.push(dataSourceId);
      }
      
      if (startDate) {
        query += ` AND month >= $${params.length + 1}`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND month <= $${params.length + 1}`;
        params.push(endDate);
      }
      
      query += ` ORDER BY month ASC`;
      
      const pnlResult = await this.pool.query(query, params);
      
      if (pnlResult.rows.length > 0) {
        // Use P&L data
        return {
          labels: pnlResult.rows.map(row => {
            const date = new Date(row.month);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }),
          datasets: [{
            label: 'Revenue',
            data: pnlResult.rows.map(row => parseFloat(row.revenue)),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true
          }],
          summary: {
            totalRevenue: pnlResult.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0),
            averageMonthly: pnlResult.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0) / pnlResult.rows.length,
            growth: this.calculateGrowthRate(pnlResult.rows.map(row => parseFloat(row.revenue)))
          }
        };
      }
      
      // Fallback to financial_records table
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      const revenueRecords = financialRecords.filter(record => record.record_type === 'revenue');
      
      if (revenueRecords.length === 0) {
        return this.getPlaceholderData('revenue_chart');
      }
      
      // Aggregate revenue by month
      const monthlyRevenue = new Map<string, number>();
      
      revenueRecords.forEach((record: any) => {
        const monthKey = record.date.slice(0, 7);
        const current = monthlyRevenue.get(monthKey) || 0;
        monthlyRevenue.set(monthKey, current + record.amount);
      });
      
      const sortedMonths = Array.from(monthlyRevenue.keys()).sort();
      
      return {
        labels: sortedMonths.map(month => {
          const date = new Date(month + '-01');
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [{
          label: 'Revenue',
          data: sortedMonths.map(month => monthlyRevenue.get(month)!),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        }],
        summary: {
          totalRevenue: Array.from(monthlyRevenue.values()).reduce((sum, rev) => sum + rev, 0),
          averageMonthly: Array.from(monthlyRevenue.values()).reduce((sum, rev) => sum + rev, 0) / monthlyRevenue.size,
          growth: this.calculateGrowthRate(Array.from(monthlyRevenue.values()))
        }
      };
    } catch (error) {
      logger.error('Error getting revenue chart data:', error);
      return this.getPlaceholderData('revenue_chart');
    }
  }

  /**
   * Get KPI card data
   */
  private async getKPICardData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    const metric = config.metric || 'revenue';
    
    try {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7);
      
      
      let currentValue = 0;
      let previousValue = 0;

      // Try to get data from pnl_data table first for revenue/expenses/profit metrics
      if (metric === 'revenue' || metric === 'expenses' || metric === 'profit') {
        // Query P&L data for current and previous month
        let query = `
          SELECT month, revenue, operating_expenses as total_expenses,
            net_income
          FROM pnl_data
          WHERE company_id = $1
          AND (month = $2 OR month = $3)
        `;
        
        const params: any[] = [companyId, currentMonth + '-01', previousMonth + '-01'];
        
        if (dataSourceId) {
          query += ` AND data_source_id = $${params.length + 1}`;
          params.push(dataSourceId);
        }
        
        query += ` ORDER BY month DESC`;
        
        const pnlResult = await this.pool.query(query, params);
        
        
        if (pnlResult.rows.length > 0) {
          // Process P&L data - use latest available month as current
          const sortedRows = pnlResult.rows.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
          
          // Use the most recent month as "current" and the one before as "previous"
          if (sortedRows.length >= 1) {
            const latestRow = sortedRows[0];
            const revenue = parseFloat(latestRow.revenue) || 0;
            const expenses = parseFloat(latestRow.total_expenses) || 0;
            const netIncome = parseFloat(latestRow.net_income) || 0;
            
            switch (metric) {
              case 'revenue':
                currentValue = revenue;
                break;
              case 'expenses':
                currentValue = expenses;
                break;
              case 'profit':
                currentValue = netIncome;
                break;
            }
          }
          
          // Get previous month value if available
          if (sortedRows.length >= 2) {
            const previousRow = sortedRows[1];
            const revenue = parseFloat(previousRow.revenue) || 0;
            const expenses = parseFloat(previousRow.total_expenses) || 0;
            const netIncome = parseFloat(previousRow.net_income) || 0;
            
            switch (metric) {
              case 'revenue':
                previousValue = revenue;
                break;
              case 'expenses':
                previousValue = expenses;
                break;
              case 'profit':
                previousValue = netIncome;
                break;
            }
          }
          
          const trend = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
          
          
          return {
            value: currentValue,
            previousValue,
            trend,
            format: 'currency'
          };
        }
      }
      
      // Fallback to financial_records table
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, undefined, dataSourceId);
      
      if (!financialRecords || financialRecords.length === 0) {
        return { value: 0, trend: 0, format: 'currency' };
      }

      switch (metric) {
        case 'cashBalance':
          // Calculate running balance
          let balance = 0;
          let currentMonthBalance = 0;
          let previousMonthBalance = 0;
          
          financialRecords.forEach(record => {
            balance += record.amount;
            if (record.date.startsWith(currentMonth)) {
              currentMonthBalance = balance;
            } else if (record.date.startsWith(previousMonth)) {
              previousMonthBalance = balance;
            }
          });
          
          currentValue = currentMonthBalance;
          previousValue = previousMonthBalance;
          break;
        
        case 'revenue':
          currentValue = financialRecords
            .filter(record => record.date.startsWith(currentMonth) && record.record_type === 'revenue')
            .reduce((sum, record) => sum + record.amount, 0);
          previousValue = financialRecords
            .filter(record => record.date.startsWith(previousMonth) && record.record_type === 'revenue')
            .reduce((sum, record) => sum + record.amount, 0);
          break;
          
        case 'expenses':
          currentValue = Math.abs(financialRecords
            .filter(record => record.date.startsWith(currentMonth) && record.record_type === 'expense')
            .reduce((sum, record) => sum + record.amount, 0));
          previousValue = Math.abs(financialRecords
            .filter(record => record.date.startsWith(previousMonth) && record.record_type === 'expense')
            .reduce((sum, record) => sum + record.amount, 0));
          break;
          
        case 'profit':
          const currentRevenue = financialRecords
            .filter(record => record.date.startsWith(currentMonth) && record.record_type === 'revenue')
            .reduce((sum, record) => sum + record.amount, 0);
          const currentExpenses = Math.abs(financialRecords
            .filter(record => record.date.startsWith(currentMonth) && record.record_type === 'expense')
            .reduce((sum, record) => sum + record.amount, 0));
          currentValue = currentRevenue - currentExpenses;
          
          const previousRevenue = financialRecords
            .filter(record => record.date.startsWith(previousMonth) && record.record_type === 'revenue')
            .reduce((sum, record) => sum + record.amount, 0);
          const previousExpenses = Math.abs(financialRecords
            .filter(record => record.date.startsWith(previousMonth) && record.record_type === 'expense')
            .reduce((sum, record) => sum + record.amount, 0));
          previousValue = previousRevenue - previousExpenses;
          break;
        
        default:
          return { value: 0, trend: 0, format: 'currency' };
      }

      const trend = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

      return {
        value: currentValue,
        previousValue,
        trend,
        format: 'currency'
      };
    } catch (error) {
      logger.error('Error getting KPI card data:', error);
      return { value: 0, trend: 0, format: 'currency' };
    }
  }
  
  /**
   * Calculate growth rate from array of values
   */
  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    if (first === 0) return 0;
    
    return ((last - first) / first) * 100;
  }

  /**
   * Get expense breakdown data
   */
  private async getExpenseBreakdownData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      const expenseRecords = financialRecords.filter(record => record.record_type === 'expense');
      
      if (expenseRecords.length === 0) {
        return this.getPlaceholderData('expense_breakdown');
      }
      
      // Group by category
      const categoryTotals = new Map<string, number>();
      
      expenseRecords.forEach(record => {
        const category = record.category || 'Other';
        const current = categoryTotals.get(category) || 0;
        categoryTotals.set(category, current + Math.abs(record.amount));
      });
      
      const categories = Array.from(categoryTotals.keys());
      const values = Array.from(categoryTotals.values());
      const total = values.reduce((sum, val) => sum + val, 0);
      
      // Transform to match frontend ExpenseBreakdownWidget structure
      const categoriesData = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by amount descending
        .map(([name, value], idx) => ({
          name,
          value,
          amount: value,
          percentage: (value / total) * 100,
          color: [
            '#ef4444', '#f97316', '#f59e0b', '#eab308',
            '#84cc16', '#22c55e', '#10b981', '#14b8a6',
            '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
          ][idx % 12]
        }));
      
      return {
        categories: categoriesData,
        total,
        period: `${startDate.toLocaleDateString('en-US', { month: 'short' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
      };
    } catch (error) {
      logger.error('Error getting expense breakdown data:', error);
      return this.getPlaceholderData('expense_breakdown');
    }
  }

  /**
   * Get profit margin data
   */
  private async getProfitMarginData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Last month
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      
      const revenue = financialRecords
        .filter(record => record.record_type === 'revenue')
        .reduce((sum, record) => sum + record.amount, 0);
        
      const expenses = Math.abs(financialRecords
        .filter(record => record.record_type === 'expense')
        .reduce((sum, record) => sum + record.amount, 0));
      
      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      return {
        value: margin,
        profit,
        revenue,
        expenses,
        format: 'percentage',
        status: margin > 20 ? 'excellent' : margin > 10 ? 'good' : margin > 0 ? 'warning' : 'critical'
      };
    } catch (error) {
      logger.error('Error getting profit margin data:', error);
      return { value: 0, status: 'unknown' };
    }
  }

  /**
   * Get burn rate data
   */
  private async getBurnRateData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
      
      // First try to get data from cashflow_data table
      let query = `
        SELECT 
          date,
          cash_inflows,
          cash_outflows,
          net_cash_flow,
          ending_balance,
          burn_rate,
          runway_months
        FROM cashflow_data
        WHERE company_id = $1
        AND date >= $2
      `;
      
      const params: any[] = [companyId, startDate.toISOString().split('T')[0]];
      
      if (dataSourceId) {
        query += ` AND data_source_id = $${params.length + 1}`;
        params.push(dataSourceId);
      }
      
      query += ` ORDER BY date ASC`;
      
      const cashflowResult = await this.pool.query(query, params);
      
      if (cashflowResult.rows.length > 0) {
        // Process cashflow data for burn rate
        const months = cashflowResult.rows;
        const latestMonth = months[months.length - 1];
        const previousMonth = months[months.length - 2] || latestMonth;
        
        const currentBurn = parseFloat(latestMonth.burn_rate) || parseFloat(latestMonth.cash_outflows);
        const previousBurn = parseFloat(previousMonth.burn_rate) || parseFloat(previousMonth.cash_outflows);
        const currentBalance = parseFloat(latestMonth.ending_balance);
        const runway = parseFloat(latestMonth.runway_months) || (currentBalance > 0 && currentBurn > 0 ? currentBalance / currentBurn : 0);
        
        // Calculate average burn
        const avgBurn = months.reduce((sum, row) => {
          return sum + (parseFloat(row.burn_rate) || parseFloat(row.cash_outflows));
        }, 0) / months.length;
        
        const trend = previousBurn > 0 ? ((currentBurn - previousBurn) / previousBurn) * 100 : 0;
        
        return {
          currentBurnRate: currentBurn,
          previousBurnRate: previousBurn,
          averageBurnRate: avgBurn,
          runway,
          currentBalance,
          trend: {
            direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
            percentage: Math.abs(trend),
            data: months.map(row => ({
              month: new Date(row.date).toLocaleDateString('en-US', { month: 'short' }),
              burn: parseFloat(row.burn_rate) || parseFloat(row.cash_outflows)
            }))
          },
          breakdown: {
            categories: [
              { name: 'Cash Outflows', value: currentBurn, percentage: 100 }
            ]
          }
        };
      }
      
      // Fallback to financial_records
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      
      // Calculate monthly burn (expenses - revenue)
      const monthlyData = new Map<string, { revenue: number; expenses: number; burn: number }>();
      
      financialRecords.forEach(record => {
        const monthKey = record.date.slice(0, 7);
        const current = monthlyData.get(monthKey) || { revenue: 0, expenses: 0, burn: 0 };
        
        if (record.record_type === 'revenue') {
          current.revenue += record.amount;
        } else {
          current.expenses += Math.abs(record.amount);
        }
        
        current.burn = current.expenses - current.revenue;
        monthlyData.set(monthKey, current);
      });
      
      const months = Array.from(monthlyData.keys()).sort();
      const burnRates = months.map(month => monthlyData.get(month)!.burn);
      const averageBurn = burnRates.reduce((sum, burn) => sum + burn, 0) / burnRates.length;
      
      // Calculate current cash balance from all transactions
      let currentBalance = 0;
      financialRecords.forEach(record => {
        currentBalance += record.amount;
      });
      
      const lastMonthBurn = burnRates[burnRates.length - 1] || 0;
      const previousMonthBurn = burnRates[burnRates.length - 2] || lastMonthBurn;
      const runway = currentBalance > 0 && lastMonthBurn > 0 ? Math.floor(currentBalance / lastMonthBurn) : 0;
      
      // Calculate trend
      const trendDirection = lastMonthBurn > previousMonthBurn ? 'up' : 
                           lastMonthBurn < previousMonthBurn ? 'down' : 'stable';
      const trendPercentage = previousMonthBurn !== 0 
        ? Math.abs(((lastMonthBurn - previousMonthBurn) / previousMonthBurn) * 100)
        : 0;
      
      // Calculate breakdown by category for last month
      const lastMonthKey = months[months.length - 1];
      const lastMonthExpenses = financialRecords.filter(
        record => record.date.slice(0, 7) === lastMonthKey && record.record_type === 'expense'
      );
      
      const breakdown = {
        salaries: 0,
        operations: 0,
        marketing: 0,
        other: 0
      };
      
      lastMonthExpenses.forEach(expense => {
        const category = expense.category?.toLowerCase() || 'other';
        const amount = Math.abs(expense.amount);
        
        if (category.includes('salary') || category.includes('payroll')) {
          breakdown.salaries += amount;
        } else if (category.includes('operation') || category.includes('office')) {
          breakdown.operations += amount;
        } else if (category.includes('marketing') || category.includes('advertising')) {
          breakdown.marketing += amount;
        } else {
          breakdown.other += amount;
        }
      });
      
      // Calculate runway date
      const runwayDate = new Date();
      runwayDate.setMonth(runwayDate.getMonth() + runway);
      
      return {
        monthlyBurn: lastMonthBurn,
        previousMonthlyBurn: previousMonthBurn,
        monthlyBurnRate: lastMonthBurn,
        currentCash: currentBalance,
        cashBalance: currentBalance,
        runway,
        runwayMonths: runway,
        runwayDate: runwayDate.toISOString(),
        trend: {
          direction: trendDirection,
          percentage: trendPercentage
        },
        breakdown,
        // For chart display
        chartData: months.map((month, idx) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
          burn: burnRates[idx]
        }))
      };
    } catch (error) {
      logger.error('Error getting burn rate data:', error);
      return this.getPlaceholderData('burn_rate');
    }
  }

  /**
   * Get data table data
   */
  private async getDataTableData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const limit = config.limit || 50;
      const offset = config.offset || 0;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      
      // Sort by date descending and apply pagination
      const sortedRecords = financialRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(offset, offset + limit);
      
      return {
        columns: [
          { key: 'date', label: 'Date', type: 'date', sortable: true },
          { key: 'description', label: 'Description', type: 'text', sortable: true },
          { key: 'category', label: 'Category', type: 'text', sortable: true },
          { key: 'type', label: 'Type', type: 'text', sortable: true },
          { key: 'amount', label: 'Amount', type: 'currency', sortable: true, align: 'right' }
        ],
        rows: sortedRecords.map(record => ({
          date: record.date,
          description: record.description,
          amount: Math.abs(record.amount),
          category: record.category,
          type: record.record_type === 'revenue' ? 'Income' : 'Expense'
        })),
        totalRows: financialRecords.length,
        pageSize: limit
      };
    } catch (error) {
      logger.error('Error getting data table data:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * Get recent transactions data
   */
  private async getRecentTransactionsData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const limit = config.limit || 10;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      
      const recentTransactions = financialRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
        .map(record => ({
          id: `${record.date}-${record.description}`,
          date: record.date,
          description: record.description,
          amount: record.amount,
          category: record.category,
          type: record.record_type,
          status: 'completed'
        }));
      
      return {
        transactions: recentTransactions,
        summary: {
          totalTransactions: recentTransactions.length,
          totalAmount: recentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
          revenueCount: recentTransactions.filter(t => t.type === 'revenue').length,
          expenseCount: recentTransactions.filter(t => t.type === 'expense').length
        }
      };
    } catch (error) {
      logger.error('Error getting recent transactions data:', error);
      return { transactions: [] };
    }
  }

  /**
   * Get alerts feed data
   */
  private async getAlertsFeedData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      // Generate alerts based on financial data analysis
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      const alerts = [];
      
      // Calculate key metrics for alert generation
      const totalRevenue = financialRecords
        .filter(r => r.record_type === 'revenue')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const totalExpenses = Math.abs(financialRecords
        .filter(r => r.record_type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0));
      
      const cashFlow = totalRevenue - totalExpenses;
      
      // Generate contextual alerts
      if (cashFlow > 0) {
        alerts.push({
          type: 'positive',
          message: `Positive cash flow of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cashFlow)} this month`,
          time: '1 hour ago'
        });
      } else {
        alerts.push({
          type: 'warning',
          message: `Negative cash flow of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(cashFlow))} this month`,
          time: '1 hour ago'
        });
      }
      
      if (totalRevenue > 200000) {
        alerts.push({
          type: 'positive',
          message: 'Revenue exceeded $200K milestone this month',
          time: '2 hours ago'
        });
      }
      
      // Add some informational alerts
      alerts.push({
        type: 'info',
        message: `${financialRecords.length} transactions processed this month`,
        time: '3 hours ago'
      });
      
      return { alerts: alerts.slice(0, 5) }; // Return top 5 alerts
    } catch (error) {
      logger.error('Error getting alerts feed data:', error);
      return {
        alerts: [
          { type: 'info', message: 'No alerts at this time', time: 'now' }
        ]
      };
    }
  }

  /**
   * Get KPI comparison data
   */
  private async getKPIComparisonData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const metrics = config.metrics || ['revenue', 'expenses', 'profit'];
      const period = config.period || 'month';
      
      const endDate = new Date();
      const currentStartDate = new Date();
      const previousStartDate = new Date();
      
      if (period === 'month') {
        currentStartDate.setMonth(currentStartDate.getMonth() - 1);
        previousStartDate.setMonth(previousStartDate.getMonth() - 2);
      } else if (period === 'quarter') {
        currentStartDate.setMonth(currentStartDate.getMonth() - 3);
        previousStartDate.setMonth(previousStartDate.getMonth() - 6);
      } else {
        currentStartDate.setFullYear(currentStartDate.getFullYear() - 1);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 2);
      }
      
      const currentRecords = await this.getFinancialRecords(companyId, currentStartDate, endDate, dataSourceId);
      const previousRecords = await this.getFinancialRecords(companyId, previousStartDate, currentStartDate, dataSourceId);
      
      const comparisonData = metrics.map((metric: string) => {
        let currentValue = 0;
        let previousValue = 0;
        
        switch (metric) {
          case 'revenue':
            currentValue = currentRecords
              .filter(r => r.record_type === 'revenue')
              .reduce((sum, r) => sum + r.amount, 0);
            previousValue = previousRecords
              .filter(r => r.record_type === 'revenue')
              .reduce((sum, r) => sum + r.amount, 0);
            break;
          case 'expenses':
            currentValue = Math.abs(currentRecords
              .filter(r => r.record_type === 'expense')
              .reduce((sum, r) => sum + r.amount, 0));
            previousValue = Math.abs(previousRecords
              .filter(r => r.record_type === 'expense')
              .reduce((sum, r) => sum + r.amount, 0));
            break;
          case 'profit':
            const currentRevenue = currentRecords
              .filter(r => r.record_type === 'revenue')
              .reduce((sum, r) => sum + r.amount, 0);
            const currentExpenses = Math.abs(currentRecords
              .filter(r => r.record_type === 'expense')
              .reduce((sum, r) => sum + r.amount, 0));
            currentValue = currentRevenue - currentExpenses;
            
            const previousRevenue = previousRecords
              .filter(r => r.record_type === 'revenue')
              .reduce((sum, r) => sum + r.amount, 0);
            const previousExpenses = Math.abs(previousRecords
              .filter(r => r.record_type === 'expense')
              .reduce((sum, r) => sum + r.amount, 0));
            previousValue = previousRevenue - previousExpenses;
            break;
        }
        
        const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        
        return {
          name: metric.charAt(0).toUpperCase() + metric.slice(1),
          current: currentValue,
          previous: previousValue,
          change: change.toFixed(1)
        };
      });
      
      return {
        period,
        metrics: comparisonData
      };
    } catch (error) {
      logger.error('Error getting KPI comparison data:', error);
      return { metrics: [] };
    }
  }

  /**
   * Get target gauge data
   */
  private async getTargetGaugeData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      const metric = config.metric || 'revenue';
      const target = config.target || 250000;
      const period = config.period || 'month';
      
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      const financialRecords = await this.getFinancialRecords(companyId, startDate, endDate, dataSourceId);
      
      let currentValue = 0;
      let label = '';
      
      switch (metric) {
        case 'revenue':
          currentValue = financialRecords
            .filter(r => r.record_type === 'revenue')
            .reduce((sum, r) => sum + r.amount, 0);
          label = 'Revenue Target';
          break;
        case 'profit':
          const revenue = financialRecords
            .filter(r => r.record_type === 'revenue')
            .reduce((sum, r) => sum + r.amount, 0);
          const expenses = Math.abs(financialRecords
            .filter(r => r.record_type === 'expense')
            .reduce((sum, r) => sum + r.amount, 0));
          currentValue = revenue - expenses;
          label = 'Profit Target';
          break;
        case 'customers':
          // For demo, count unique transactions as proxy for customers
          currentValue = new Set(financialRecords.map(r => r.description)).size;
          label = 'Customer Target';
          break;
      }
      
      const percentage = (currentValue / target) * 100;
      
      return {
        value: percentage,
        current: currentValue,
        target,
        label,
        format: metric === 'customers' ? 'number' : 'currency'
      };
    } catch (error) {
      logger.error('Error getting target gauge data:', error);
      return {
        value: 0,
        current: 0,
        target: 100,
        label: 'Target',
        format: 'percentage'
      };
    }
  }

  /**
   * Get executive summary data
   */
  private async getExecutiveSummaryData(companyId: string, config: any, dataSourceId?: string): Promise<any> {
    try {
      // Get comprehensive financial data for summary
      const endDate = new Date();
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - 1);
      
      const quarterStart = new Date();
      quarterStart.setMonth(quarterStart.getMonth() - 3);
      
      const yearStart = new Date();
      yearStart.setFullYear(yearStart.getFullYear() - 1);
      
      const monthRecords = await this.getFinancialRecords(companyId, monthStart, endDate, dataSourceId);
      const quarterRecords = await this.getFinancialRecords(companyId, quarterStart, endDate, dataSourceId);
      const yearRecords = await this.getFinancialRecords(companyId, yearStart, endDate, dataSourceId);
      
      // Calculate key metrics
      const monthRevenue = monthRecords
        .filter(r => r.record_type === 'revenue')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const quarterRevenue = quarterRecords
        .filter(r => r.record_type === 'revenue')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const yearRevenue = yearRecords
        .filter(r => r.record_type === 'revenue')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const monthExpenses = Math.abs(monthRecords
        .filter(r => r.record_type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0));
      
      // Generate insights
      const insights = [];
      
      if (monthRevenue > 200000) {
        insights.push('Strong revenue performance exceeding $200K this month');
      }
      
      const profitMargin = ((monthRevenue - monthExpenses) / monthRevenue) * 100;
      if (profitMargin > 20) {
        insights.push(`Healthy profit margin of ${profitMargin.toFixed(1)}%`);
      }
      
      insights.push(`Total of ${monthRecords.length} transactions processed this month`);
      
      // Key metrics
      const keyMetrics = {
        monthlyRevenue: monthRevenue,
        quarterlyRevenue: quarterRevenue,
        yearlyRevenue: yearRevenue,
        profitMargin: profitMargin.toFixed(1) + '%',
        transactionCount: monthRecords.length,
        avgTransactionSize: monthRevenue / monthRecords.filter(r => r.record_type === 'revenue').length
      };
      
      // Status determination
      let status = 'healthy';
      if (profitMargin < 0) status = 'critical';
      else if (profitMargin < 10) status = 'warning';
      
      return {
        insights,
        status,
        keyMetrics,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting executive summary data:', error);
      return {
        insights: ['Unable to generate insights at this time'],
        status: 'unknown',
        keyMetrics: {}
      };
    }
  }





  /**
   * Helper: Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  /**
   * Helper: Aggregate records by month
   */
  private aggregateByMonth(records: any[]): Array<{ month: string; total: number }> {
    const monthlyData = new Map<string, number>();
    
    records.forEach(record => {
      const monthKey = record.date.slice(0, 7); // YYYY-MM
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + Math.abs(record.amount));
    });
    
    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }));
  }

  /**
   * Get enhanced placeholder data with company context
   */
  private async getEnhancedPlaceholderData(widgetCode: string, companyId: string, dataSourceId?: string): Promise<any> {
    // For enterprise widgets, provide more sophisticated placeholder data
    const placeholders: Record<string, any> = {
      forecast_chart: {
        message: 'AI Financial Forecasting',
        description: 'Advanced predictive analytics based on your financial data patterns',
        status: 'available',
        nextMonths: [
          { month: 'Jul 2025', predicted: 285000, confidence: 85 },
          { month: 'Aug 2025', predicted: 298000, confidence: 82 },
          { month: 'Sep 2025', predicted: 312000, confidence: 78 }
        ]
      },
      executive_summary: {
        insights: [
          'Revenue growth accelerating at 15% month-over-month',
          'Operating expenses well-controlled at 65% of revenue',
          'Strong enterprise sales pipeline worth $2.1M'
        ],
        status: 'healthy',
        keyMetrics: {
          growth: '+15%',
          efficiency: '65%',
          pipeline: '$2.1M'
        }
      },
      alerts_feed: {
        alerts: [
          { type: 'positive', message: 'Revenue exceeded forecast by 12%', time: '2 hours ago' },
          { type: 'info', message: 'New enterprise client onboarded', time: '1 day ago' },
          { type: 'warning', message: 'Marketing spend increased 25%', time: '2 days ago' }
        ]
      },
      kpi_comparison: {
        metrics: [
          { name: 'Revenue', current: 245000, previous: 220000, change: 11.4 },
          { name: 'Expenses', current: 165000, previous: 158000, change: 4.4 },
          { name: 'Profit', current: 80000, previous: 62000, change: 29.0 }
        ]
      },
      target_gauge: {
        value: 75,
        target: 100,
        label: 'Monthly Revenue Target',
        format: 'percentage'
      }
    };
    
    return placeholders[widgetCode] || this.getPlaceholderData(widgetCode);
  }

  /**
   * Get placeholder data for unimplemented widgets
   */
  private getPlaceholderData(widgetCode: string): any {
    const placeholders: Record<string, any> = {
      cash_flow_trend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Inflow',
            data: [120000, 135000, 115000, 140000, 125000, 145000],
            borderColor: '#10b981'
          },
          {
            label: 'Outflow',
            data: [100000, 110000, 105000, 115000, 108000, 112000],
            borderColor: '#ef4444'
          }
        ]
      },
      revenue_chart: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [220000, 235000, 215000, 240000, 225000, 245000],
          borderColor: '#3b82f6'
        }]
      },
      burn_rate: {
        monthlyBurn: 25000,
        previousMonthlyBurn: 27000,
        monthlyBurnRate: 25000,
        currentCash: 150000,
        cashBalance: 150000,
        runway: 6,
        runwayMonths: 6,
        runwayDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        trend: {
          direction: 'down',
          percentage: 7.4
        },
        breakdown: {
          salaries: 15000,
          operations: 5000,
          marketing: 3000,
          other: 2000
        },
        chartData: [
          { month: 'Jan', burn: 28000 },
          { month: 'Feb', burn: 26000 },
          { month: 'Mar', burn: 27000 },
          { month: 'Apr', burn: 25500 },
          { month: 'May', burn: 27000 },
          { month: 'Jun', burn: 25000 }
        ]
      },
      default: {
        message: 'Widget data coming soon',
        timestamp: new Date().toISOString()
      }
    };

    return placeholders[widgetCode] || placeholders.default;
  }

  /**
   * Share dashboard
   */
  async shareDashboard(params: {
    layoutId: string;
    userId: number;
    companyId: string;
    sharedWithUserId?: number;
    sharedWithRole?: string;
    permission: 'view' | 'edit';
  }): Promise<void> {
    // Verify ownership
    const verifyQuery = `
      SELECT 1 FROM dashboard_layouts 
      WHERE id = $1 AND company_id = $2 AND user_id = $3
    `;
    const verifyResult = await this.pool.query(verifyQuery, [
      params.layoutId,
      params.companyId,
      params.userId
    ]);
    
    if (verifyResult.rows.length === 0) {
      throw new Error('Dashboard not found or access denied');
    }

    const insertQuery = `
      INSERT INTO dashboard_shares (
        layout_id, shared_with_user_id, shared_with_role, permission, shared_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (layout_id, shared_with_user_id) 
      DO UPDATE SET permission = $4
    `;

    await this.pool.query(insertQuery, [
      params.layoutId,
      params.sharedWithUserId,
      params.sharedWithRole,
      params.permission,
      params.userId
    ]);

    logger.info(`Shared dashboard ${params.layoutId} with permission ${params.permission}`);
  }

  /**
   * Get dashboard shares
   */
  async getDashboardShares(layoutId: string, userId: number, companyId: string): Promise<any[]> {
    const query = `
      SELECT 
        ds.*,
        u.email as shared_with_email,
        u.first_name || ' ' || u.last_name as shared_with_name,
        su.email as shared_by_email,
        su.first_name || ' ' || su.last_name as shared_by_name
      FROM dashboard_shares ds
      LEFT JOIN users u ON ds.shared_with_user_id = u.id
      JOIN users su ON ds.shared_by = su.id
      JOIN dashboard_layouts dl ON ds.layout_id = dl.id
      WHERE ds.layout_id = $1 
      AND dl.company_id = $2
      AND dl.user_id = $3
    `;

    const result = await this.pool.query(query, [layoutId, companyId, userId]);
    return result.rows;
  }

  /**
   * Remove dashboard share
   */
  async removeDashboardShare(
    shareId: string,
    layoutId: string,
    userId: number,
    companyId: string
  ): Promise<void> {
    const deleteQuery = `
      DELETE FROM dashboard_shares
      WHERE id = $1
      AND layout_id = $2
      AND EXISTS (
        SELECT 1 FROM dashboard_layouts dl
        WHERE dl.id = $2
        AND dl.company_id = $3
        AND dl.user_id = $4
      )
    `;

    const result = await this.pool.query(deleteQuery, [shareId, layoutId, companyId, userId]);
    
    if (result.rowCount === 0) {
      throw new Error('Share not found or access denied');
    }

    logger.info(`Removed dashboard share: ${shareId}`);
  }

  /**
   * Get available templates
   */
  async getTemplates(): Promise<any[]> {
    const query = `
      SELECT * FROM dashboard_templates
      WHERE is_active = true
      ORDER BY role
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Map database row to DashboardLayout
   */
  private mapToDashboardLayout(row: any): DashboardLayout {
    return {
      id: row.id,
      companyId: row.company_id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default,
      isShared: row.is_shared,
      roleTemplate: row.role_template,
      gridColumns: row.grid_columns,
      gridRowHeight: row.grid_row_height,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to DashboardWidget
   */
  private mapToDashboardWidget(row: any): DashboardWidget {
    return {
      id: row.id,
      layoutId: row.layout_id,
      widgetDefinitionId: row.widget_definition_id,
      position: row.position,
      config: row.config,
      dataSourceId: row.data_source_id,
      refreshInterval: row.refresh_interval
    };
  }

  /**
   * Update dashboard grid settings
   */
  async updateDashboardGridSettings(
    layoutId: string,
    userId: number,
    companyId: string,
    settings: { gridColumns?: number; gridRowHeight?: number }
  ): Promise<DashboardLayout> {
    // Verify ownership/access
    const checkQuery = `
      SELECT id FROM dashboard_layouts
      WHERE id = $1 AND company_id = $2 AND (user_id = $3 OR is_shared = true)
    `;
    
    const checkResult = await this.pool.query(checkQuery, [layoutId, companyId, userId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Dashboard not found or access denied');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (settings.gridColumns !== undefined) {
      updates.push(`grid_columns = $${paramCount}`);
      values.push(settings.gridColumns);
      paramCount++;
    }

    if (settings.gridRowHeight !== undefined) {
      updates.push(`grid_row_height = $${paramCount}`);
      values.push(settings.gridRowHeight);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No valid updates provided');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(layoutId, companyId, userId);

    const updateQuery = `
      UPDATE dashboard_layouts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} 
      AND company_id = $${paramCount + 1}
      AND (user_id = $${paramCount + 2} OR is_shared = true)
      RETURNING *
    `;

    const result = await this.pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to update dashboard grid settings');
    }

    logger.info(`Updated dashboard grid settings: ${layoutId}`, settings);
    return this.mapToDashboardLayout(result.rows[0]);
  }

  /**
   * Bulk update widget positions
   */
  async bulkUpdateWidgetPositions(
    layoutId: string,
    userId: number,
    companyId: string,
    widgets: Array<{ widgetId: string; position: any }>
  ): Promise<DashboardWidget[]> {
    // Verify ownership/access to dashboard
    const checkQuery = `
      SELECT id FROM dashboard_layouts
      WHERE id = $1 AND company_id = $2 AND (user_id = $3 OR is_shared = true)
    `;
    
    const checkResult = await this.pool.query(checkQuery, [layoutId, companyId, userId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Dashboard not found or access denied');
    }

    // Start a transaction
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const updatedWidgets: DashboardWidget[] = [];

      // Update each widget position
      for (const widget of widgets) {
        const updateQuery = `
          UPDATE dashboard_widgets
          SET position = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND layout_id = $3
          AND EXISTS (
            SELECT 1 FROM dashboard_layouts dl
            WHERE dl.id = $3
            AND dl.company_id = $4
            AND (dl.user_id = $5 OR dl.is_shared = true)
          )
          RETURNING *
        `;

        const result = await client.query(updateQuery, [
          widget.position,
          widget.widgetId,
          layoutId,
          companyId,
          userId
        ]);

        if (result.rows.length > 0) {
          updatedWidgets.push(this.mapToDashboardWidget(result.rows[0]));
        }
      }

      await client.query('COMMIT');

      logger.info(`Bulk updated ${updatedWidgets.length} widget positions in dashboard: ${layoutId}`);
      return updatedWidgets;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}