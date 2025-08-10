/**
 * Enhanced Function Tools with OpenAI Agent SDK Pattern
 * Based on CLI implementation with @function_tool decorators
 */

import { AgentContext, agentContextManager } from './agent-context';
import { snowflakeService } from './snowflake-service';
import { storage } from '../storage';
import OpenAI from 'openai';

// Enhanced function tool interface matching CLI pattern
export interface FunctionToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (context: AgentContext, params: any) => Promise<string>;
}

// OpenAI client for advanced features
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================================================================
// CONNECTION TOOLS
// =============================================================================

export const connectToSnowflake: FunctionToolDefinition = {
  name: 'connect_to_snowflake',
  description: 'Connect to Snowflake and establish a connection',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      // Use existing fresh PAT connection strategy
      console.log('Creating fresh PAT connection for agent...');
      
      // Create a fresh PAT connection directly using known credentials
      const connectionId = await snowflakeService.createFreshPATConnection();
      
      // Update context with new connection
      await agentContextManager.updateContext(context.sessionId, {
        connectionId: connectionId,
        currentDatabase: 'CORTES_DEMO_2',
        currentSchema: 'CORTEX_DEMO'
      });

      return `✅ Successfully connected to Snowflake account: KIXUIIJ-MTC00254
      
🔗 **Connection Details:**
- Database: CORTES_DEMO_2
- Schema: CORTEX_DEMO
- Warehouse: CORTEX_ANALYST_WH
- Role: nl2sql_service_role

🚀 **Ready for queries!** Try:
- "show databases" - List available databases
- "show tables" - List tables in current schema
- "SELECT * FROM table_name" - Run SQL directly`;

    } catch (error) {
      return `Error connecting to Snowflake: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getCurrentContext: FunctionToolDefinition = {
  name: 'get_current_context',
  description: 'Get current agent context and state',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    const summary = agentContextManager.getContextSummary(context);
    return `📊 **Current Agent State:**${summary}

🔄 **Session ID:** ${context.sessionId}
📝 **Conversation History:** ${context.conversationHistory.length} messages`;
  }
};

// =============================================================================
// METADATA TOOLS
// =============================================================================

export const getDatabases: FunctionToolDefinition = {
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

export const selectDatabase: FunctionToolDefinition = {
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
      
      await snowflakeService.executeQuery(
        context.connectionId,
        `USE DATABASE "${database_name}"`
      );

      await agentContextManager.updateContext(context.sessionId, {
        currentDatabase: database_name
      });

      return `✅ Selected database: **${database_name}**

🔄 Ready for schema operations. Try:
- \`SHOW SCHEMAS\` - List schemas in this database
- \`USE SCHEMA schema_name\` - Select a schema`;

    } catch (error) {
      return `Error selecting database: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getSchemas: FunctionToolDefinition = {
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

export const selectSchema: FunctionToolDefinition = {
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
      
      await snowflakeService.executeQuery(
        context.connectionId,
        `USE SCHEMA "${schema_name}"`
      );

      await agentContextManager.updateContext(context.sessionId, {
        currentSchema: schema_name
      });

      return `✅ Selected schema: **${schema_name}**

🔄 Ready for table operations. Try:
- \`SHOW TABLES\` - List tables in this schema
- \`DESCRIBE table_name\` - View table structure`;

    } catch (error) {
      return `Error selecting schema: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getTables: FunctionToolDefinition = {
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

export const describeTable: FunctionToolDefinition = {
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

// =============================================================================
// QUERY TOOLS
// =============================================================================

export const generateSql: FunctionToolDefinition = {
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

            schemaContext += `\nTable: ${table.name}\nColumns: ${columns.map(c => `${c.name} (${c.type})`).join(', ')}\n`;
          } catch (error) {
            console.error(`Error describing table ${table.name}:`, error);
          }
        }
      }

      // Use OpenAI to generate SQL with context
      const systemPrompt = `You are an expert SQL generator for Snowflake. Generate SQL queries based on natural language requests.

Database Context:
- Database: ${context.currentDatabase}
- Schema: ${context.currentSchema}
- Tables Available: ${context.tables.map(t => t.name).join(', ')}

Schema Information:
${schemaContext}

Rules:
1. Generate only the SQL query, no explanations
2. Use proper Snowflake syntax
3. Include appropriate LIMIT clauses for data exploration
4. Use fully qualified table names when joining tables
5. Handle common aggregations and filters appropriately`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate SQL for: ${query}` }
        ],
        temperature: 0.1
      });

      const generatedSql = response.choices[0].message.content?.trim() || '';
      
      // Store the generated SQL in context
      await agentContextManager.updateContext(context.sessionId, {
        lastQuerySql: generatedSql
      });

      return `🔨 **Generated SQL Query:**

\`\`\`sql
${generatedSql}
\`\`\`

💡 **Next steps:**
- \`execute_sql\` - Run this query
- Ask for modifications to the query
- Request explanation of the logic`;

    } catch (error) {
      return `Error generating SQL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const executeSql: FunctionToolDefinition = {
  name: 'execute_sql',
  description: 'Execute SQL query and return formatted results',
  parameters: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'SQL query to execute'
      },
      table_name: {
        type: 'string',
        description: 'Table name for context (optional)'
      }
    },
    required: ['sql']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const { sql, table_name } = params;
      
      const result = await snowflakeService.executeQuery(context.connectionId, sql);
      
      const rowCount = result.rows?.length || 0;
      
      // Store results in context
      await agentContextManager.updateContext(context.sessionId, {
        lastQueryResults: result.rows,
        lastQueryColumns: result.columns?.map((col: any) => col.name) || [],
        lastQuerySql: sql
      });

      let formattedResults = `✅ **Query executed successfully!**

📊 **Results:** ${rowCount} rows returned\n\n`;

      if (rowCount > 0 && result.columns) {
        // Display first 10 rows in table format
        const displayRows = result.rows?.slice(0, 10) || [];
        const headers = result.columns.map((col: any) => col.name);
        
        formattedResults += `| ${headers.join(' | ')} |\n`;
        formattedResults += `|${headers.map(() => '---').join('|')}|\n`;
        
        displayRows.forEach((row: any) => {
          const values = headers.map(header => {
            const value = row[header];
            return value !== null && value !== undefined ? String(value) : '';
          });
          formattedResults += `| ${values.join(' | ')} |\n`;
        });
        
        if (rowCount > 10) {
          formattedResults += `\n... and ${rowCount - 10} more rows.`;
        }

        formattedResults += `\n\n💡 **Next steps:**
- \`generate_summary\` - Get AI analysis of results
- \`visualize_data\` - Create charts from this data
- Ask follow-up questions about the data`;
      }

      return formattedResults;

    } catch (error) {
      return `❌ **Query execution failed:**

\`\`\`sql
${params.sql}
\`\`\`

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

💡 Try:
- Check table names and column spelling
- Verify database and schema selection
- Ask for help with the SQL syntax`;
    }
  }
};

// =============================================================================
// ADVANCED TOOLS
// =============================================================================

export const generateSummary: FunctionToolDefinition = {
  name: 'generate_summary',
  description: 'Generate AI summary of query results',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Original natural language query'
      },
      sql: {
        type: 'string',
        description: 'SQL query that was executed (optional)'
      },
      results: {
        type: 'string',
        description: 'Query results (optional, uses stored results if not provided)'
      }
    },
    required: ['query']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      const { query, sql, results } = params;
      
      // Use stored results if not provided
      const queryResults = results ? JSON.parse(results) : context.lastQueryResults;
      const querySql = sql || context.lastQuerySql;
      
      if (!queryResults || queryResults.length === 0) {
        return 'No query results available to summarize. Please execute a query first.';
      }

      // Generate AI summary using OpenAI
      const systemPrompt = `You are a data analyst providing insights on query results. Analyze the data and provide a clear, business-focused summary with key findings, patterns, and actionable insights.`;

      const dataPreview = JSON.stringify(queryResults.slice(0, 5), null, 2);
      const userPrompt = `Analyze these query results for the question: "${query}"

SQL Query:
${querySql}

Data Sample (first 5 rows of ${queryResults.length} total):
${dataPreview}

Provide a comprehensive analysis including:
1. Key findings and insights
2. Notable patterns or trends
3. Data quality observations
4. Business implications
5. Recommendations for further analysis`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      });

      const summary = response.choices[0].message.content || '';

      return `📊 **AI Analysis & Summary**

**Original Question:** ${query}

**Key Insights:**
${summary}

📈 **Data Overview:**
- Total Records: ${queryResults.length}
- Columns: ${context.lastQueryColumns?.join(', ') || 'Unknown'}

💡 **Next steps:**
- \`visualize_data\` - Create charts from this data
- Ask follow-up questions for deeper analysis
- Request specific metrics or breakdowns`;

    } catch (error) {
      return `Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

// Export all tools for agent registration
export const enhancedFunctionTools: FunctionToolDefinition[] = [
  connectToSnowflake,
  getCurrentContext,
  getDatabases,
  selectDatabase,
  getSchemas,
  selectSchema,
  getTables,
  describeTable,
  generateSql,
  executeSql,
  generateSummary
];

// Helper function to get tool by name
export function getEnhancedFunctionTool(name: string): FunctionToolDefinition | undefined {
  return enhancedFunctionTools.find(tool => tool.name === name);
}