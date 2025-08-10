import snowflake from 'snowflake-sdk';
import { SnowflakeConnection } from '@shared/schema';

export interface SnowflakeQueryResult {
  rows: any[];
  columns: string[];
  metadata: {
    executionTime: number;
    rowCount: number;
    queryId?: string;
  };
}

export interface SnowflakeConnectionConfig {
  account: string;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  warehouse?: string;
  role?: string;
  authenticator?: string;
}

export class SnowflakeService {
  private activeConnections = new Map<string, any>();

  /**
   * Test a Snowflake connection
   */
  async testConnection(config: SnowflakeConnectionConfig): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('Testing connection with config:', {
        account: config.account,
        username: config.username,
        authenticator: config.authenticator,
        hasPassword: !!config.password,
        passwordLength: config.password?.length || 0
      });

      // Configure authentication based on type
      const connectionConfig: any = {
        account: config.account,
        username: config.username,
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
      };

      // Handle different authentication methods
      if (config.authenticator === 'PAT') {
        // For PAT authentication, use password field with OAUTH authenticator
        connectionConfig.password = config.password; // PAT token goes in password field for OAUTH
        connectionConfig.authenticator = 'OAUTH';
        console.log('Using PAT authentication with OAUTH, token length:', config.password?.length);
      } else {
        connectionConfig.password = config.password;
        connectionConfig.authenticator = config.authenticator || 'SNOWFLAKE';
        console.log('Using password authentication');
      }

      const connection = snowflake.createConnection(connectionConfig);

      connection.connect((err, conn) => {
        // Clean up connection immediately
        connection.destroy(() => {});
        
        if (err) {
          console.error('Snowflake connection test failed:', err.message);
          resolve(false);
        } else {
          console.log('Snowflake connection test successful (authentication only)');
          resolve(true);
        }
      });
    });
  }

  /**
   * Create and cache a Snowflake connection
   */
  async createConnection(connectionId: string, config: SnowflakeConnectionConfig): Promise<boolean> {
    return new Promise((resolve) => {
      // Configure authentication based on type
      const connectionConfig: any = {
        account: config.account,
        username: config.username,
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
      };

      // Handle different authentication methods
      if (config.authenticator === 'PAT') {
        // For PAT authentication, use password field with OAUTH authenticator
        connectionConfig.password = config.password; // PAT token goes in password field for OAUTH
        connectionConfig.authenticator = 'OAUTH';
      } else {
        connectionConfig.password = config.password;
        connectionConfig.authenticator = config.authenticator || 'SNOWFLAKE';
      }

      const connection = snowflake.createConnection(connectionConfig);

      connection.connect((err, conn) => {
        if (err) {
          console.error('Failed to create Snowflake connection:', err.message);
          resolve(false);
        } else {
          console.log(`Snowflake connection created: ${connectionId}`);
          this.activeConnections.set(connectionId, connection);
          resolve(true);
        }
      });
    });
  }

  /**
   * Execute a SQL query on Snowflake
   */
  async executeQuery(connectionId: string, sqlText: string): Promise<SnowflakeQueryResult> {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      throw new Error(`No active Snowflake connection found for ID: ${connectionId}`);
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      connection.execute({
        sqlText: sqlText,
        complete: (err: any, stmt: any, rows: any[]) => {
          const executionTime = Date.now() - startTime;
          
          if (err) {
            console.error('Snowflake query execution failed:', err.message);
            reject(new Error(`Query failed: ${err.message}`));
            return;
          }

          // Extract column names from the statement
          const columns = stmt.getColumns().map((col: any) => col.getName());
          
          const result: SnowflakeQueryResult = {
            rows: rows || [],
            columns: columns,
            metadata: {
              executionTime,
              rowCount: rows ? rows.length : 0,
              queryId: stmt.getStatementId(),
            }
          };

          resolve(result);
        }
      });
    });
  }

  /**
   * Get database schema information
   */
  async getSchemaInfo(connectionId: string): Promise<{
    databases: string[];
    schemas: string[];
    tables: string[];
  }> {
    try {
      // Get databases
      const dbResult = await this.executeQuery(connectionId, 'SHOW DATABASES');
      const databases = dbResult.rows.map(row => row.name || row.NAME);

      // Get schemas for current database
      const schemaResult = await this.executeQuery(connectionId, 'SHOW SCHEMAS');
      const schemas = schemaResult.rows.map(row => row.name || row.NAME);

      // Get tables for current schema
      const tableResult = await this.executeQuery(connectionId, 'SHOW TABLES');
      const tables = tableResult.rows.map(row => row.name || row.NAME);

      return {
        databases,
        schemas,
        tables
      };
    } catch (error) {
      console.error('Failed to get Snowflake schema info:', error);
      throw error;
    }
  }

  /**
   * Get table structure
   */
  async getTableStructure(connectionId: string, tableName: string): Promise<{
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default?: string;
    }>;
  }> {
    try {
      const result = await this.executeQuery(
        connectionId, 
        `DESCRIBE TABLE ${tableName}`
      );

      const columns = result.rows.map(row => ({
        name: row.name || row.NAME,
        type: row.type || row.TYPE,
        nullable: (row.null || row.NULL) === 'Y',
        default: row.default || row.DEFAULT
      }));

      return { columns };
    } catch (error) {
      console.error('Failed to get table structure:', error);
      throw error;
    }
  }

  /**
   * Close a connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    
    if (connection) {
      return new Promise((resolve) => {
        connection.destroy((err: any) => {
          if (err) {
            console.error('Error closing Snowflake connection:', err.message);
          }
          this.activeConnections.delete(connectionId);
          resolve();
        });
      });
    }
  }

  /**
   * Close all active connections
   */
  async closeAllConnections(): Promise<void> {
    const promises = Array.from(this.activeConnections.keys()).map(id => 
      this.closeConnection(id)
    );
    
    await Promise.all(promises);
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Check if connection exists and is valid
   */
  hasActiveConnection(connectionId: string): boolean {
    return this.activeConnections.has(connectionId);
  }
}

// Global Snowflake service instance
export const snowflakeService = new SnowflakeService();

// Clean up connections on process exit
process.on('exit', () => {
  snowflakeService.closeAllConnections();
});

process.on('SIGINT', () => {
  snowflakeService.closeAllConnections().then(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  snowflakeService.closeAllConnections().then(() => {
    process.exit(0);
  });
});