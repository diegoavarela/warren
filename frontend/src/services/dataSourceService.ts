import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface DataSource {
  id: string;
  companyId: string;
  name: string;
  type: 'excel' | 'google_sheets' | 'quickbooks' | 'csv' | 'api' | 'manual';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  config?: any;
  lastSync?: Date;
  nextSync?: Date;
  syncFrequency: string;
  fileCount?: number;
  lastFileUpload?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSourceFile {
  id: string;
  dataSourceId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  sheetName?: string;
  rowCount?: number;
  dateRange?: { start: Date; end: Date };
  isActive: boolean;
  uploadedAt: Date;
}

class DataSourceService {
  private getAuthHeaders() {
    const token = authService.getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  private getUploadHeaders() {
    const token = authService.getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  /**
   * Upload a file
   */
  async uploadFile(
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_URL}/cashflow/upload`,
        formData,
        {
          ...this.getUploadHeaders(),
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Create a new data source
   */
  async createDataSource(params: {
    name: string;
    type: DataSource['type'];
    config?: any;
    syncFrequency?: string;
    fileUploadId?: number;
  }): Promise<DataSource> {
    try {
      const response = await axios.post(
        `${API_URL}/v2/data-sources`,
        params,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error creating data source:', error);
      throw error;
    }
  }

  /**
   * List data sources
   */
  async listDataSources(): Promise<DataSource[]> {
    try {
      const response = await axios.get(
        `${API_URL}/v2/data-sources`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching data sources:', error);
      throw error;
    }
  }

  /**
   * Get data source by ID
   */
  async getDataSource(id: string): Promise<DataSource> {
    try {
      const response = await axios.get(
        `${API_URL}/v2/data-sources/${id}`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching data source:', error);
      throw error;
    }
  }

  /**
   * Get files for a data source
   */
  async getDataSourceFiles(dataSourceId: string): Promise<DataSourceFile[]> {
    try {
      const response = await axios.get(
        `${API_URL}/v2/data-sources/${dataSourceId}/files`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching data source files:', error);
      throw error;
    }
  }

  /**
   * Delete data source
   */
  async deleteDataSource(id: string): Promise<void> {
    try {
      await axios.delete(
        `${API_URL}/v2/data-sources/${id}`,
        this.getAuthHeaders()
      );
    } catch (error) {
      console.error('Error deleting data source:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files as data sources
   */
  async uploadMultipleFiles(
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<DataSource[]> {
    const dataSources: DataSource[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'cashflow');

      try {
        // Upload file
        const uploadResult = await this.uploadFile(formData, (progress) => {
          if (onProgress) {
            onProgress(i, progress);
          }
        });

        // Create data source
        const dataSource = await this.createDataSource({
          name: file.name,
          type: 'excel',
          fileUploadId: uploadResult.id
        });

        dataSources.push(dataSource);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // Continue with other files
      }
    }

    return dataSources;
  }

  /**
   * Sync data source
   */
  async syncDataSource(id: string): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/v2/data-sources/${id}/sync`,
        {},
        this.getAuthHeaders()
      );
    } catch (error) {
      console.error('Error syncing data source:', error);
      throw error;
    }
  }

  /**
   * Update data source
   */
  async updateDataSource(
    id: string,
    updates: Partial<DataSource>
  ): Promise<DataSource> {
    try {
      const response = await axios.patch(
        `${API_URL}/v2/data-sources/${id}`,
        updates,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error updating data source:', error);
      throw error;
    }
  }
}

export const dataSourceService = new DataSourceService();