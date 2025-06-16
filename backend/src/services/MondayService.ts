import axios from 'axios';
import { logger } from '../utils/logger';

interface LeadData {
  // Contact Information
  firstName: string;
  lastName: string;
  workEmail: string;
  phone?: string;
  
  // Company Information
  companyName: string;
  jobTitle: string;
  companySize: string;
  industry?: string;
  
  // Use Case Details
  useCase: string;
  timeline: string;
  additionalInfo?: string;
  
  // Metadata
  source: string;
  timestamp: string;
}

export class MondayService {
  private static get apiKey() { return process.env.MONDAY_API_KEY; }
  private static get boardId() { return process.env.MONDAY_BOARD_ID || '1234567890'; }
  private static apiUrl = 'https://api.monday.com/v2';

  /**
   * Creates a new lead in Monday.com
   */
  static async createLead(leadData: LeadData): Promise<any> {
    if (!this.apiKey) {
      logger.warn('Monday.com API key not configured. Lead data will be logged only.');
      logger.info('Lead data received:', JSON.stringify(leadData, null, 2));
      
      // Return a mock response for development
      return {
        id: 'demo-' + Date.now(),
        status: 'logged',
        message: 'Lead logged locally (Monday.com not configured)'
      };
    }

    try {
      // Format the lead name
      const leadName = `${leadData.firstName} ${leadData.lastName} - ${leadData.companyName}`;
      
      // Create column values object based on your board structure
      // Start with basic fields first
      const columnValues = {
        // Email column
        email_mkryn85: { email: leadData.workEmail, text: leadData.workEmail },
        
        // Company column
        text_mkryyn61: leadData.companyName,
        
        // Job Title column  
        text_mkry9s0h: leadData.jobTitle,
        
        // Industry column
        text_mkry2sj6: leadData.industry || '',
        
        // Use Case column
        long_text_mkryfzdx: leadData.useCase,
        
        // Additional Info column
        long_text_mkryg6ch: leadData.additionalInfo || '',
        
        // Status column
        status: { label: 'Working on it' },
        
        // Date column
        date4: { date: new Date().toISOString().split('T')[0] }
      };

      // Create the GraphQL mutation
      const mutation = `
        mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
          create_item(
            board_id: $boardId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
            name
          }
        }
      `;

      // Make the API request
      const response = await axios.post(
        this.apiUrl,
        {
          query: mutation,
          variables: {
            boardId: parseInt(this.boardId),
            itemName: leadName,
            columnValues: JSON.stringify(columnValues)
          }
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      logger.info(`Lead created in Monday.com: ${response.data.data.create_item.id}`);
      
      // Send notification if webhook URL is configured
      if (process.env.MONDAY_WEBHOOK_URL) {
        this.sendNotification(leadData, response.data.data.create_item.id);
      }

      return response.data.data.create_item;
    } catch (error: any) {
      logger.error('Error creating lead in Monday.com:', error);
      throw new Error(`Failed to create lead: ${error.message}`);
    }
  }

  /**
   * Sends a notification about the new lead
   */
  private static async sendNotification(leadData: LeadData, itemId: string): Promise<void> {
    try {
      await axios.post(process.env.MONDAY_WEBHOOK_URL!, {
        text: `🎉 New Warren License Request!\n` +
              `Name: ${leadData.firstName} ${leadData.lastName}\n` +
              `Company: ${leadData.companyName} (${leadData.companySize})\n` +
              `Email: ${leadData.workEmail}\n` +
              `Timeline: ${leadData.timeline}\n` +
              `Monday.com ID: ${itemId}`
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * Get board columns (useful for mapping)
   */
  static async getBoardColumns(): Promise<any> {
    if (!this.apiKey) {
      return { message: 'Monday.com not configured' };
    }

    try {
      const query = `
        query GetBoard($boardId: ID!) {
          boards(ids: [$boardId]) {
            columns {
              id
              title
              type
            }
          }
        }
      `;

      const response = await axios.post(
        this.apiUrl,
        {
          query,
          variables: { boardId: parseInt(this.boardId) }
        },
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data.boards[0].columns;
    } catch (error: any) {
      logger.error('Error fetching board columns:', error);
      throw new Error(`Failed to fetch board columns: ${error.message}`);
    }
  }
}