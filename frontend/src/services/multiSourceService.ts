import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export interface DataSource {
  id: number;
  userId: number;
  fileType: string;
  dataSourceType: string;
  yearStart?: number;
  yearEnd?: number;
  filename: string;
  originalFilename: string;
  uploadedAt: Date;
  isActive: boolean;
  tags: string[];
  dataSummary?: any;
}

export interface DataView {
  id: number;
  userId: number;
  name: string;
  description?: string;
  viewType: 'multi_year' | 'comparison' | 'consolidated';
  fileUploadIds: number[];
  configuration: any;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsolidatedData {
  viewId?: number;
  viewName?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  sources: DataSource[];
  mergedData: {
    cashflow?: any[];
    pnl?: any[];
    metrics?: any;
  };
  statistics: {
    totalMonths: number;
    totalYears: number;
    dataGaps: Array<{start: Date; end: Date}>;
    overlapPeriods: Array<{start: Date; end: Date; sources: number[]}>;
  };
}

class MultiSourceService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Get all data sources for the current user
   */
  async getDataSources(fileType?: string): Promise<DataSource[]> {
    const params = fileType ? { fileType } : {};
    const response = await axios.get(`${API_URL}/multi-source/sources`, {
      headers: this.getAuthHeaders(),
      params
    });
    return response.data.data;
  }

  /**
   * Update data source metadata
   */
  async updateDataSource(
    uploadId: number,
    updates: Partial<{
      yearStart: number;
      yearEnd: number;
      tags: string[];
      isActive: boolean;
    }>
  ): Promise<void> {
    await axios.patch(`${API_URL}/multi-source/sources/${uploadId}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get all data views
   */
  async getDataViews(): Promise<DataView[]> {
    const response = await axios.get(`${API_URL}/multi-source/views`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Create a new data view
   */
  async createDataView(
    name: string,
    viewType: 'multi_year' | 'comparison' | 'consolidated',
    fileUploadIds: number[],
    description?: string,
    configuration?: any
  ): Promise<DataView> {
    const response = await axios.post(`${API_URL}/multi-source/views`, {
      name,
      viewType,
      fileUploadIds,
      description,
      configuration
    }, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Get a specific data view
   */
  async getDataView(viewId: number): Promise<DataView> {
    const response = await axios.get(`${API_URL}/multi-source/views/${viewId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Consolidate multiple data sources
   */
  async consolidateData(fileUploadIds: number[], fileType: 'cashflow' | 'pnl'): Promise<ConsolidatedData> {
    const response = await axios.post(`${API_URL}/multi-source/consolidate`, {
      fileUploadIds,
      fileType
    }, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Bulk upload multiple files
   */
  async bulkUpload(files: File[], fileType: 'cashflow' | 'pnl' = 'cashflow'): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('fileType', fileType);

    const response = await axios.post(`${API_URL}/multi-source/bulk-upload`, formData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const multiSourceService = new MultiSourceService();