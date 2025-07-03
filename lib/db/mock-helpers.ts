// Helper to handle chained where clauses and filtering

export class MockQueryBuilder {
  private table: any;
  private conditions: any[] = [];
  private limitCount?: number;
  private orderByField?: any;
  private offsetCount?: number;

  constructor(table: any, private data: any) {}

  from(table: any) {
    this.table = table;
    return this;
  }

  where(condition: any) {
    this.conditions.push(condition);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  orderBy(field: any) {
    this.orderByField = field;
    return this;
  }

  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  private getTableData() {
    const { 
      mockTables, 
      mockUsers, 
      mockOrganizations, 
      mockCompanies, 
      mockStatements, 
      mockLineItems, 
      mockTemplates, 
      mockLogs, 
      mockJobs 
    } = this.data;

    if (this.table === mockTables.users) return mockUsers;
    if (this.table === mockTables.organizations) return mockOrganizations;
    if (this.table === mockTables.companies) return mockCompanies;
    if (this.table === mockTables.financialStatements) return mockStatements;
    if (this.table === mockTables.financialLineItems) return mockLineItems;
    if (this.table === mockTables.mappingTemplates) return mockTemplates;
    if (this.table === mockTables.parsingLogs) return mockLogs;
    if (this.table === mockTables.processingJobs) return mockJobs;
    return [];
  }

  private applyConditions(items: any[]) {
    if (this.conditions.length === 0) return items;

    return items.filter(item => {
      return this.conditions.every(condition => {
        if (condition.type === 'eq') {
          // Find the field name that matches this value
          if (condition.field === 'email' || condition.field.name === 'email') {
            return item.email === condition.value;
          }
          if (condition.field === 'isActive' || condition.field.name === 'isActive') {
            return item.isActive === condition.value;
          }
          if (condition.field === 'id' || condition.field.name === 'id') {
            return item.id === condition.value;
          }
          if (condition.field === 'organizationId' || condition.field.name === 'organizationId') {
            return item.organizationId === condition.value;
          }
          if (condition.field === 'companyId' || condition.field.name === 'companyId') {
            return item.companyId === condition.value;
          }
          if (condition.field === 'jobId' || condition.field.name === 'jobId') {
            return item.jobId === condition.value;
          }
          // Generic field matching
          const fieldName = typeof condition.field === 'string' ? condition.field : condition.field.name;
          if (fieldName) {
            return item[fieldName] === condition.value;
          }
        }
        return true;
      });
    });
  }

  async execute(): Promise<any[]> {
    let items = this.getTableData();
    items = this.applyConditions(items);

    if (this.orderByField) {
      items = [...items].sort((a, b) => {
        if (this.orderByField.type === 'desc') {
          return b[this.orderByField.field] > a[this.orderByField.field] ? 1 : -1;
        }
        return a[this.orderByField.field] > b[this.orderByField.field] ? 1 : -1;
      });
    }

    if (this.offsetCount !== undefined) {
      items = items.slice(this.offsetCount);
    }

    if (this.limitCount !== undefined) {
      items = items.slice(0, this.limitCount);
    }

    return items;
  }

  // Support chained promise-like syntax
  then(callback: (value: any[]) => any) {
    return this.execute().then(callback);
  }
}