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

      // For PAT connections, skip test and proceed directly to establish connection
      // This bypasses network policy requirements for automated environments
      if (defaultConnection.authenticator === 'PAT') {
        console.log('Skipping test connection for PAT - establishing direct connection...');
      } else {
        // Test and establish connection for non-PAT connections
        console.log('Testing Snowflake connection...');
        const isConnected = await snowflakeService.testConnection({
          account: defaultConnection.account,
          username: defaultConnection.username,
          password: defaultConnection.password || '',
          database: defaultConnection.database || undefined,
          schema: defaultConnection.schema || undefined,
          warehouse: defaultConnection.warehouse || undefined,
          role: defaultConnection.role || undefined,
          authenticator: defaultConnection.authenticator || undefined,
        });
        console.log('Connection test result:', isConnected);

        if (!isConnected) {
          return 'Failed to connect to Snowflake. Please check your credentials.';
        }
      }

      // Create persistent connection for queries
      const connectionCreated = await snowflakeService.createConnection(defaultConnection.id, {
        account: defaultConnection.account,
        username: defaultConnection.username,
        password: defaultConnection.password || '',
        database: defaultConnection.database || undefined,
        schema: defaultConnection.schema || undefined,
        warehouse: defaultConnection.warehouse || undefined,
        role: defaultConnection.role || undefined,
        authenticator: defaultConnection.authenticator || undefined,
      });

      if (!connectionCreated) {
        return 'Failed to create persistent Snowflake connection.';
      }

      await agentContextManager.updateContext(context.sessionId, {
        connectionId: defaultConnection.id,
        currentDatabase: defaultConnection.database || undefined,
        currentSchema: defaultConnection.schema || undefined
      });

      return `✅ Successfully connected to Snowflake account: ${defaultConnection.account}
      
🔗 **Connection Details:**
- Database: ${defaultConnection.database}
- Schema: ${defaultConnection.schema}
- Warehouse: ${defaultConnection.warehouse}
- Role: ${defaultConnection.role}

🚀 **Ready for queries!** Try:
- "show databases" - List available databases
- "show tables" - List tables in current schema
- "SELECT * FROM table_name" - Run SQL directly`;
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
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const result = await snowflakeService.executeQuery(
        context.connectionId,
        'SHOW DATABASES'
      );

      const databases = result.rows?.map((row: any) => row.name || row.NAME) || [];
      
      if (databases.length === 0) {
        return `No databases found.`;
      }

      return `🗄️ **Available Databases**

**${databases.length} databases found:**

${databases.map((db: string) => `• **${db}**`).join('\n')}

💡 **Next steps:**
- \`USE DATABASE database_name\` - Switch to a database
- Ask about specific database contents`;
    } catch (error) {
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
      
      if (schemas.length === 0) {
        return `No schemas found in database ${database}.`;
      }

      return `📂 **Available Schemas** in \`${database}\`

**${schemas.length} schemas found:**

${schemas.map((schema: string) => `• **${schema}**`).join('\n')}

💡 **Next steps:**
- \`USE SCHEMA schema_name\` - Switch to a schema
- \`SHOW TABLES\` - List tables in a schema`;
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
      
      if (tables.length === 0) {
        return `No tables found in ${context.currentDatabase}.${context.currentSchema}`;
      }

      return `📊 **Available Tables** in \`${context.currentDatabase}.${context.currentSchema}\`

**${tables.length} tables found:**

${tables.map((table: any) => `• **${table.name}**`).join('\n')}

💡 **Next steps:**
- \`DESCRIBE table_name\` - View table structure
- \`SELECT * FROM table_name LIMIT 10\` - Preview data
- Ask about specific data analysis needs`;
    } catch (error) {
      return `Error fetching tables: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const describeTable: FunctionTool = {
  name: 'describe_table',
  description: 'Get detailed information about a specific table structure',
  parameters: {
    type: 'object',
    properties: {
      table_name: {
        type: 'string',
        description: 'Name of the table to describe'
      }
    },
    required: ['table_name']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      if (!context.currentDatabase || !context.currentSchema) {
        return 'No database or schema selected. Please select both first.';
      }

      const { table_name } = params;
      
      const result = await snowflakeService.executeQuery(
        context.connectionId,
        `DESCRIBE TABLE "${context.currentDatabase}"."${context.currentSchema}"."${table_name}"`
      );

      if (!result.rows || result.rows.length === 0) {
        return `Table ${table_name} not found or no columns available.`;
      }

      const columns = result.rows.map((row: any) => ({
        name: row.name || row.NAME,
        type: row.type || row.TYPE,
        nullable: row.null === 'Y' || row.null === true || row.NULLABLE === 'Y' || row.NULLABLE === true,
        default: row.default || row.DEFAULT || null,
        comment: row.comment || row.COMMENT || ''
      }));

      return `📋 **Table Structure:** \`${table_name}\`

**${columns.length} columns:**

${columns.map((col: any) => 
  `• **${col.name}** \`${col.type}\`${col.nullable ? ' (nullable)' : ' (required)'}`
).join('\n')}

💡 **Try these queries:**
- \`SELECT * FROM ${table_name} LIMIT 10\` - Preview data
- \`SELECT COUNT(*) FROM ${table_name}\` - Count rows
- Ask about specific analysis on this table`;

    } catch (error) {
      return `Error describing table: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
  describeTable,
  generateSql,
  executeSql,
  getCurrentContext
];

// Helper function to get tool by name
export function getFunctionTool(name: string): FunctionTool | undefined {
  return availableFunctionTools.find(tool => tool.name === name);
}