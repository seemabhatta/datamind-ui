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
      const connection = snowflake.createConnection({
        account: config.account,
        username: config.username,
        password: config.password,
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
        authenticator: config.authenticator || 'SNOWFLAKE',
      });

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
      const connection = snowflake.createConnection({
        account: config.account,
        username: config.username,
        password: config.password,
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
        authenticator: config.authenticator || 'SNOWFLAKE',
      });

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

  /**
   * Execute query with temporary connection (MFA-compatible)
   */
  async executeQueryWithConfig(config: any, sqlText: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const snowflake = require('snowflake-sdk');
      const connection = snowflake.createConnection({
        account: config.account,
        username: config.username,
        password: config.password,
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
        authenticator: config.authenticator || 'SNOWFLAKE',
      });

      connection.connect((err: any, conn: any) => {
        if (err) {
          console.error('Snowflake temporary connection failed:', err.message);
          reject(err);
          return;
        }

        connection.execute({
          sqlText,
          complete: (queryErr: any, stmt: any, rows: any[] | undefined) => {
            // Always clean up the connection
            connection.destroy(() => {});
            
            if (queryErr) {
              console.error('Snowflake query execution failed:', queryErr.message);
              reject(queryErr);
            } else {
              const columns = stmt.getColumns?.() || [];
              resolve({
                rows: rows || [],
                columns: columns.map((col: any) => ({
                  name: col.getName(),
                  type: col.getType(),
                  nullable: col.isNullable(),
                  scale: col.getScale(),
                  precision: col.getPrecision()
                }))
              });
            }
          }
        });
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