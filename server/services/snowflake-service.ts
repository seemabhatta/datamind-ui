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
  private connectionConfigs = new Map<string, SnowflakeConnectionConfig>();

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
        // For PAT authentication, use the token as password with standard SNOWFLAKE authenticator
        connectionConfig.password = config.password; // PAT token goes in password field
        connectionConfig.authenticator = 'SNOWFLAKE'; // Use standard authenticator
        console.log('Using PAT authentication as password with SNOWFLAKE authenticator, token length:', config.password?.length);
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
    // For PAT connections, store config instead of persistent connection due to network policy
    if (config.authenticator === 'PAT') {
      console.log(`Storing PAT connection config for connectionId: ${connectionId}`);
      this.connectionConfigs.set(connectionId, config);
      return true; // PAT authentication already verified, just store the config
    }

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

      connectionConfig.password = config.password;
      connectionConfig.authenticator = config.authenticator || 'SNOWFLAKE';

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
   * Create a fresh PAT connection for agent SDK usage
   */
  async createFreshPATConnection(): Promise<string> {
    const connectionId = `pat-agent-${Date.now()}`;
    console.log('Creating fresh PAT connection for agent SDK...');
    
    try {
      const connection = snowflake.createConnection({
        account: 'KIXUIIJ-MTC00254',
        username: 'NL2SQL_CHAT_SVC',
        password: 'eyJraWQiOiI5MDcxMDE4MTczOTY4MzkwIiwiYWxnIjoiRVMyNTYifQ.eyJwIjoiNTQwNjc0OTgwOjEzODQxMjc1MzI4NSIsImlzcyI6IlNGOjEwNTYiLCJleHAiOjE3NTYxNDk0MjF9._1GHsThId_cGuw4WUwYCh2NZ3DPZmrviQRxbwqJ7t_uQ2FFymuJwBt3Cf6zM-2-vesNh580UeXQjdsJ8gC5pHA',
        database: 'CORTES_DEMO_2',
        schema: 'CORTEX_DEMO',
        warehouse: 'CORTEX_ANALYST_WH',
        role: 'nl2sql_service_role',
        authenticator: 'SNOWFLAKE'
      });

      await new Promise<void>((resolve, reject) => {
        connection.connect((err: any, conn: any) => {
          if (err) {
            console.error('Failed to create fresh PAT connection:', err.message);
            reject(err);
          } else {
            console.log('Fresh PAT connection created successfully');
            this.activeConnections.set(connectionId, connection);
            resolve();
          }
        });
      });

      return connectionId;
    } catch (error) {
      console.error('Error creating fresh PAT connection:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query on Snowflake
   */
  async executeQuery(connectionId: string, sqlText: string): Promise<SnowflakeQueryResult> {
    let connection = this.activeConnections.get(connectionId);
    
    // For PAT connections, create a fresh connection for each query
    if (!connection) {
      const config = this.connectionConfigs.get(connectionId);
      if (config?.authenticator === 'PAT') {
        console.log('Creating fresh PAT connection for query execution...');
        connection = await this.createFreshPATConnectionWithConfig(config);
      } else {
        throw new Error(`No active Snowflake connection found for ID: ${connectionId}`);
      }
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
    return this.activeConnections.has(connectionId) || this.connectionConfigs.has(connectionId);
  }

  /**
   * Create a fresh PAT connection for single query execution
   */
  private async createFreshPATConnectionWithConfig(config: SnowflakeConnectionConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      const connectionConfig: any = {
        account: config.account,
        username: config.username,
        password: config.password, // PAT token
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
        authenticator: 'SNOWFLAKE'
      };

      const connection = snowflake.createConnection(connectionConfig);

      connection.connect((err, conn) => {
        if (err) {
          console.error('Failed to create fresh PAT connection:', err.message);
          reject(new Error(`PAT connection failed: ${err.message}`));
        } else {
          console.log('Fresh PAT connection created successfully');
          resolve(connection);
        }
      });
    });
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