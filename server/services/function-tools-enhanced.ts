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
// STAGE TOOLS (CLI-based)
// =============================================================================

export const getStages: FunctionToolDefinition = {
  name: 'get_stages',
  description: 'Get stages in the current database and schema',
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
        `SHOW STAGES IN SCHEMA "${context.currentDatabase}"."${context.currentSchema}"`
      );

      const stages = result.rows?.map((row: any) => ({
        name: row.name || row.NAME,
        database: context.currentDatabase!,
        schema: context.currentSchema!,
        type: row.type || row.TYPE || 'INTERNAL'
      })) || [];

      await agentContextManager.updateContext(context.sessionId, {
        stages
      });
      
      if (stages.length === 0) {
        return `No stages found in ${context.currentDatabase}.${context.currentSchema}`;
      }

      return `📁 **Available Stages** in \`${context.currentDatabase}.${context.currentSchema}\`

**${stages.length} stages found:**

${stages.map((stage: any) => `• **${stage.name}** (${stage.type})`).join('\n')}

💡 **Next steps:**
- \`select_stage stage_name\` - Select a stage
- \`LIST @stage_name\` - List files in a stage`;

    } catch (error) {
      return `Error fetching stages: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const selectStage: FunctionToolDefinition = {
  name: 'select_stage',
  description: 'Select a specific stage to work with',
  parameters: {
    type: 'object',
    properties: {
      stage_name: {
        type: 'string',
        description: 'Name of the stage to select'
      }
    },
    required: ['stage_name']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      const { stage_name } = params;
      
      await agentContextManager.updateContext(context.sessionId, {
        currentStage: stage_name
      });

      return `✅ Selected stage: **${stage_name}**

🔄 Ready for file operations. Try:
- \`get_yaml_files\` - List YAML files in this stage
- \`LIST @${stage_name}\` - List all files in stage`;

    } catch (error) {
      return `Error selecting stage: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getYamlFiles: FunctionToolDefinition = {
  name: 'get_yaml_files',
  description: 'Get YAML files from the current stage',
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

      if (!context.currentStage) {
        return 'No stage selected. Please select a stage first.';
      }

      const result = await snowflakeService.executeQuery(
        context.connectionId,
        `LIST @${context.currentStage}`
      );

      const allFiles = result.rows?.map((row: any) => ({
        name: row.name || row.NAME,
        size: row.size || row.SIZE,
        lastModified: row.last_modified || row.LAST_MODIFIED
      })) || [];

      // Filter for YAML files
      const yamlFiles = allFiles.filter(file => 
        file.name.toLowerCase().endsWith('.yaml') || 
        file.name.toLowerCase().endsWith('.yml')
      );

      if (yamlFiles.length === 0) {
        return `No YAML files found in stage @${context.currentStage}

**All files (${allFiles.length}):**
${allFiles.slice(0, 5).map((file: any) => `• ${file.name}`).join('\n')}
${allFiles.length > 5 ? `... and ${allFiles.length - 5} more` : ''}`;
      }

      return `📄 **YAML Files** in stage \`@${context.currentStage}\`

**${yamlFiles.length} YAML files found:**

${yamlFiles.map((file: any, index: number) => 
  `${index + 1}. **${file.name}** (${file.size} bytes)`
).join('\n')}

💡 **Next steps:**
- \`load_yaml_file filename.yaml\` - Load a specific YAML file
- Choose a file to load data dictionary`;

    } catch (error) {
      return `Error fetching YAML files: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const loadYamlFile: FunctionToolDefinition = {
  name: 'load_yaml_file',
  description: 'Load and parse a YAML file from the current stage',
  parameters: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'Name of the YAML file to load'
      }
    },
    required: ['filename']
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.connectionId) {
        return 'Not connected to Snowflake. Please connect first.';
      }

      if (!context.currentStage) {
        return 'No stage selected. Please select a stage first.';
      }

      const { filename } = params;
      
      // Get file content from stage
      const result = await snowflakeService.executeQuery(
        context.connectionId,
        `SELECT GET(@${context.currentStage}, '${filename}') as content`
      );

      const content = result.rows?.[0]?.CONTENT || result.rows?.[0]?.content;
      
      if (!content) {
        return `❌ File ${filename} not found in stage @${context.currentStage}`;
      }

      // Store YAML content and data in context
      await agentContextManager.updateContext(context.sessionId, {
        yamlContent: content,
        yamlFilename: filename
      });

      return `✅ **Successfully loaded:** \`${filename}\`

📊 **YAML Content loaded:**
- File size: ${content.length} characters
- Data dictionary available for queries

🚀 **Ready for AI-powered queries!** Examples:
- "Show me the table structure"
- "What data is available?"
- "Count records by category"
- "Show top 10 customers"

💡 The system now has context about your data structure and can generate intelligent SQL queries.`;

    } catch (error) {
      return `Error loading YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getYamlContent: FunctionToolDefinition = {
  name: 'get_yaml_content',
  description: 'Get the loaded YAML data dictionary content for analysis',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.yamlContent) {
        return 'No YAML file loaded. Please load a YAML file first using `load_yaml_file`.';
      }

      return `📊 **Loaded YAML Dictionary:** \`${context.yamlFilename || 'Unknown file'}\`

**Content Preview:**
\`\`\`yaml
${context.yamlContent.substring(0, 1000)}${context.yamlContent.length > 1000 ? '\n...(truncated)' : ''}
\`\`\`

**Available for queries:** The data dictionary is loaded and ready for intelligent SQL generation.

💡 **Try natural language queries:**
- "What tables are available?"
- "Show me customer data"
- "Analyze sales by region"`;

    } catch (error) {
      return `Error getting YAML content: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

// =============================================================================
// VISUALIZATION TOOLS (CLI-based LLM-powered)
// =============================================================================

export const visualizeData: FunctionToolDefinition = {
  name: 'visualize_data',
  description: 'Create LLM-powered visualizations from query results',
  parameters: {
    type: 'object',
    properties: {
      user_request: {
        type: 'string',
        description: 'Description of desired visualization (e.g., "create a bar chart", "show trends")'
      }
    },
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      const { user_request = "create a chart" } = params;
      
      if (!context.lastQueryResults || context.lastQueryResults.length === 0) {
        return 'No query results available for visualization. Please run a query first.';
      }

      // Analyze data structure for LLM
      const dataPreview = context.lastQueryResults?.slice(0, 5) || [];
      const columnInfo = context.lastQueryColumns?.map(col => ({
        name: col,
        sampleValues: context.lastQueryResults?.slice(0, 3).map((row: any) => row[col]) || []
      })) || [];

      // Use OpenAI to generate visualization plan
      const systemPrompt = `You are a data visualization expert. Create interactive charts using Plotly based on data analysis and user requests.

Data Context:
- Rows: ${context.lastQueryResults.length}
- Columns: ${columnInfo.map(c => c.name).join(', ')}
- SQL Query: ${context.lastQuerySql}

Generate a comprehensive visualization plan as JSON with:
- chart_type: (bar, line, scatter, pie, histogram, box)
- title: descriptive chart title
- explanation: why this chart type is optimal
- plotly_config: plotly configuration object for the chart

Consider data types, distributions, and relationships to choose the best visualization.`;

      const userPrompt = `User Request: "${user_request}"

Data Structure:
${JSON.stringify({
  columns: columnInfo,
  sample_data: dataPreview,
  total_rows: context.lastQueryResults.length
}, null, 2)}

Create the best possible visualization plan for this data.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const vizPlan = JSON.parse(response.choices[0].message.content || '{}');

      // Store visualization in database for frontend display
      const visualization = await storage.createVisualization({
        title: vizPlan.title || 'Data Visualization',
        chartType: vizPlan.chart_type || 'bar',
        chartConfig: {
          data: context.lastQueryResults,
          plotly_config: vizPlan.plotly_config,
          sql_query: context.lastQuerySql
        },
        data: context.lastQueryResults
      });

      return `🎨 **Visualization Created!**

**Chart Type:** ${vizPlan.chart_type || 'Auto-selected'}
**Title:** ${vizPlan.title || 'Data Visualization'}

**Analysis:** ${vizPlan.explanation || 'Chart generated based on data analysis'}

✅ **Interactive chart available in dashboard**
🔄 You can now view, save, or modify this visualization

💡 **Next steps:**
- Pin this chart to dashboard
- Request different chart types
- Ask for insights about the visualization`;

    } catch (error) {
      return `Error creating visualization: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export const getVisualizationSuggestions: FunctionToolDefinition = {
  name: 'get_visualization_suggestions',
  description: 'Get LLM-powered suggestions for visualizing the current query results',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (context: AgentContext, params: any) => {
    try {
      if (!context.lastQueryResults || context.lastQueryResults.length === 0) {
        return 'No query results available. Please run a query first.';
      }

      // Analyze data for suggestions
      const columnInfo = context.lastQueryColumns?.map(col => {
        const values = context.lastQueryResults?.map((row: any) => row[col]).filter(v => v !== null) || [];
        return {
          name: col,
          uniqueCount: new Set(values).size,
          sampleValues: values.slice(0, 5),
          hasNumbers: values.some(v => typeof v === 'number' || !isNaN(Number(v)))
        };
      }) || [];

      const systemPrompt = `You are a data visualization consultant. Analyze the provided data and suggest the best visualization options with specific recommendations.

Provide practical suggestions considering:
- Data types and relationships
- Data volume and distribution  
- Business insights that can be revealed
- Different chart types for different purposes`;

      const userPrompt = `Analyze this query result data:

SQL Query: ${context.lastQuerySql}
Rows: ${context.lastQueryResults.length}

Column Analysis:
${columnInfo.map(col => 
  `- ${col.name}: ${col.uniqueCount} unique values, ${col.hasNumbers ? 'numeric' : 'text'} data`
).join('\n')}

Sample Data:
${JSON.stringify(context.lastQueryResults.slice(0, 3), null, 2)}

Provide visualization recommendations with:
1. Top 3-5 chart types that would work best
2. Specific insights each chart would reveal
3. Example commands to create them`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      });

      return `🤖 **LLM Analysis & Visualization Suggestions**

${response.choices[0].message.content}

💡 **To create visualizations, use:**
- \`visualize_data "bar chart showing X by Y"\`
- \`visualize_data "line chart of trends"\`
- \`visualize_data "pie chart for distribution"\``;

    } catch (error) {
      return `Error getting visualization suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
  getStages,
  selectStage,
  getYamlFiles,
  loadYamlFile,
  getYamlContent,
  generateSql,
  executeSql,
  generateSummary,
  visualizeData,
  getVisualizationSuggestions
];

// Helper function to get tool by name
export function getEnhancedFunctionTool(name: string): FunctionToolDefinition | undefined {
  return enhancedFunctionTools.find(tool => tool.name === name);
}