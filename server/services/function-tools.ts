import { AgentContext, agentContextManager } from './agent-context';
import { snowflakeService } from './snowflake-service';
import { storage } from '../storage';

// Function Tool System - Replicated from your Python @function_tool decorator pattern
export interface FunctionTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  execute: (context: AgentContext, params: any) => Promise<string>;
}

// Snowflake Connection Tools
export const connectToSnowflake: FunctionTool = {
  name: 'connect_to_snowflake',
  description: 'Connect to Snowflake and establish a connection',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      const connections = await storage.getSnowflakeConnections(context.userId);
      const defaultConnection = connections.find(c => c.isDefault && c.isActive);
      
      if (!defaultConnection) {
        return 'No default Snowflake connection found. Please configure a connection in Settings → Integrations.';
      }

      // Skip connection test for MFA-enabled accounts
      // Just validate that we have the required credentials
      if (!defaultConnection.account || !defaultConnection.username) {
        return 'Missing required Snowflake credentials (account and username). Please configure in Settings → Integrations.';
      }

      // Store connection credentials for query-time connections (MFA-compatible)
      await agentContextManager.updateContext(context.sessionId, {
        connectionId: defaultConnection.id,
        snowflakeConfig: {
          account: defaultConnection.account,
          username: defaultConnection.username,
          password: defaultConnection.password || '',
          database: defaultConnection.database || undefined,
          schema: defaultConnection.schema || undefined,
          warehouse: defaultConnection.warehouse || undefined,
          role: defaultConnection.role || undefined,
          authenticator: defaultConnection.authenticator || undefined,
        },
        currentDatabase: defaultConnection.database || undefined,
        currentSchema: defaultConnection.schema || undefined
      });

      return `✅ Snowflake connection configured successfully!

**Connection Details:**
- Account: ${defaultConnection.account}
- User: ${defaultConnection.username}
- Database: ${defaultConnection.database || 'Not specified'}
- Schema: ${defaultConnection.schema || 'Not specified'}
- Warehouse: ${defaultConnection.warehouse || 'Not specified'}
- Role: ${defaultConnection.role || 'Default role'}

**Note:** This account uses MFA. Queries will require interactive approval.

**Ready for queries!** Try:
- "show databases" - List available databases
- "show tables" - List tables in current schema  
- "SELECT * FROM table_name LIMIT 10" - Run SQL queries`;
    } catch (error) {
      return `Error connecting to Snowflake: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getDatabases: FunctionTool = {
  name: 'get_databases',
  description: 'Get list of available databases',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.snowflakeConfig) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const result = await snowflakeService.executeQueryWithConfig(
        context.snowflakeConfig,
        'SHOW DATABASES'
      );

      const databases = result.rows?.map((row: any) => row.name || row.NAME) || [];
      
      return `Available databases (${databases.length}):\n${databases.map((db: string, i: number) => `${i + 1}. ${db}`).join('\n')}`;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Multi-factor authentication')) {
        return 'Query requires MFA approval. Please approve the authentication request in your Snowflake session and try again.';
      }
      return `Error fetching databases: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const selectDatabase: FunctionTool = {
  name: 'select_database',
  description: 'Select a specific database to work with',
  parameters: {
    type: 'object',
    properties: {
      database_name: {
        type: 'string',
        description: 'Name of the database to select'
      }
    },
    required: ['database_name']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const { database_name } = params;
      
      // Execute USE DATABASE command
      await snowflakeService.executeQuery(
        context.connectionId,
        `USE DATABASE "${database_name}"`
      );

      await agentContextManager.updateContext(context.sessionId, {
        currentDatabase: database_name
      });

      return `Selected database: ${database_name}`;
    } catch (error) {
      return `Error selecting database: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getSchemas: FunctionTool = {
  name: 'get_schemas',
  description: 'Get schemas for the current database',
  parameters: {
    type: 'object',
    properties: {
      database_name: {
        type: 'string',
        description: 'Database name (optional, uses current if not specified)'
      }
    },
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const database = params.database_name || context.currentDatabase;
      if (!database) {
        return 'No database selected. Please select a database first.';
      }

      const result = await snowflakeService.executeQuery(
        context.connectionId,
        `SHOW SCHEMAS IN DATABASE "${database}"`
      );

      const schemas = result.rows?.map((row: any) => row.name || row.NAME) || [];
      
      return `Available schemas in ${database} (${schemas.length}):\n${schemas.map((schema: string, i: number) => `${i + 1}. ${schema}`).join('\n')}`;
    } catch (error) {
      return `Error fetching schemas: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const selectSchema: FunctionTool = {
  name: 'select_schema',
  description: 'Select a specific schema to work with',
  parameters: {
    type: 'object',
    properties: {
      schema_name: {
        type: 'string',
        description: 'Name of the schema to select'
      }
    },
    required: ['schema_name']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const { schema_name } = params;
      
      // Execute USE SCHEMA command
      await snowflakeService.executeQuery(
        context.connectionId,
        `USE SCHEMA "${schema_name}"`
      );

      await agentContextManager.updateContext(context.sessionId, {
        currentSchema: schema_name
      });

      return `Selected schema: ${schema_name}`;
    } catch (error) {
      return `Error selecting schema: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getTables: FunctionTool = {
  name: 'get_tables',
  description: 'Get tables in the current database and schema',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      if (!context.currentDatabase || !context.currentSchema) {
        return 'No database or schema selected. Please select both first.';
      }

      const result = await snowflakeService.executeQuery(
        context.connectionId,
        `SHOW TABLES IN SCHEMA "${context.currentDatabase}"."${context.currentSchema}"`
      );

      const tables = result.rows?.map((row: any) => ({
        name: row.name || row.NAME,
        schema: context.currentSchema!,
        database: context.currentDatabase!
      })) || [];

      await agentContextManager.updateContext(context.sessionId, {
        tables
      });
      
      return `Available tables in ${context.currentDatabase}.${context.currentSchema} (${tables.length}):\n${tables.map((table: any, i: number) => `${i + 1}. ${table.name}`).join('\n')}`;
    } catch (error) {
      return `Error fetching tables: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const generateSql: FunctionTool = {
  name: 'generate_sql',
  description: 'Generate SQL from natural language query using the current schema context',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query to convert to SQL'
      },
      table_name: {
        type: 'string',
        description: 'Specific table to focus on (optional)'
      }
    },
    required: ['query']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const { query, table_name } = params;
      
      // Get table schema information for context
      let schemaContext = '';
      if (context.tables.length > 0) {
        const relevantTables = table_name 
          ? context.tables.filter(t => t.name.toLowerCase().includes(table_name.toLowerCase()))
          : context.tables;

        // Get column information for relevant tables
        for (const table of relevantTables.slice(0, 3)) { // Limit to 3 tables to avoid token limits
          try {
            const describeResult = await snowflakeService.executeQuery(
              context.connectionId,
              `DESCRIBE TABLE "${context.currentDatabase}"."${context.currentSchema}"."${table.name}"`
            );
            
            const columns = describeResult.rows?.map((row: any) => ({
              name: row.name || row.NAME,
              type: row.type || row.TYPE,
              nullable: row.null || row.NULL
            })) || [];
            
            table.columns = columns;
            schemaContext += `\nTable: ${table.name}\nColumns: ${columns.map(c => `${c.name} (${c.type})`).join(', ')}\n`;
          } catch (error) {
            console.log(`Could not describe table ${table.name}:`, error);
          }
        }
      }

      // Use OpenAI to generate SQL with schema context
      const prompt = `Generate a Snowflake SQL query for the following request:

Request: "${query}"

Database Context:
- Database: ${context.currentDatabase}
- Schema: ${context.currentSchema}
${schemaContext}

Rules:
- Use proper Snowflake syntax
- Include appropriate column names and table references
- Use fully qualified table names (database.schema.table)
- Return only the SQL query without explanations
- Ensure the query is safe and follows best practices

SQL Query:`;

      // For now, return a structured response that can be enhanced with OpenAI
      const contextInfo = schemaContext || 'No table schema information available.';
      
      return `Generated SQL context ready for: "${query}"

Available context:
${contextInfo}

To execute this query, I need to generate the actual SQL. Would you like me to proceed with generating and executing the SQL query?`;
    } catch (error) {
      return `Error generating SQL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const executeSql: FunctionTool = {
  name: 'execute_sql',
  description: 'Execute SQL query and return results',
  parameters: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'SQL query to execute'
      }
    },
    required: ['sql']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const { sql } = params;
      
      const result = await snowflakeService.executeQuery(context.connectionId, sql);

      await agentContextManager.updateContext(context.sessionId, {
        lastQuerySql: sql,
        lastQueryResults: result.rows,
        lastQueryColumns: result.columns?.map((col: any) => col.name) || []
      });

      const rowCount = result.rows?.length || 0;
      const displayRows = result.rows?.slice(0, 10) || [];
      
      let formattedResults = `Query executed successfully!\n\nRows returned: ${rowCount}\n\n`;
      
      if (displayRows.length > 0 && result.columns) {
        // Create table format
        const headers = result.columns.map((col: any) => col.name);
        formattedResults += `| ${headers.join(' | ')} |\n`;
        formattedResults += `|${headers.map(() => '---').join('|')}|\n`;
        
        displayRows.forEach((row: any) => {
          const values = headers.map(header => row[header] || '');
          formattedResults += `| ${values.join(' | ')} |\n`;
        });
        
        if (rowCount > 10) {
          formattedResults += `\n... and ${rowCount - 10} more rows.`;
        }
      }

      return formattedResults;
    } catch (error) {
      return `Error executing SQL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getCurrentContext: FunctionTool = {
  name: 'get_current_context',
  description: 'Get current agent context and state',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    const summary = agentContextManager.getContextSummary(context);
    return `Current agent state:${summary}`;
  }
};

// Export all available function tools
export const availableFunctionTools: FunctionTool[] = [
  connectToSnowflake,
  getDatabases,
  selectDatabase,
  getSchemas,
  selectSchema,
  getTables,
  generateSql,
  executeSql,
  getCurrentContext
];

// Helper function to get tool by name
export function getFunctionTool(name: string): FunctionTool | undefined {
  return availableFunctionTools.find(tool => tool.name === name);
}