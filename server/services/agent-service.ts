import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { visualizationService } from './visualization-service';
import OpenAI from 'openai';
import { storage } from '../storage';
import { snowflakeService } from './snowflake-service';
import { agentContextManager, AgentContext } from './agent-context';
import { availableFunctionTools, getFunctionTool } from './function-tools';

interface AgentResponse {
  content: string;
  metadata?: any;
  visualization?: {
    title: string;
    description: string;
    chartType: string;
    chartConfig: any;
    data: any;
    sqlQuery?: string;
  };
}

class AgentService {
  private queryAgentSessions = new Map<string, any>();
  private yamlAgentSessions = new Map<string, any>();
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private getFallbackResponse(agentType: string, content: string): AgentResponse {
    const responses = {
      'query': {
        content: `I'm a Query Agent for DataMind. I help with SQL queries and data analysis. Your message: "${content}"\n\nTo enable full AI responses, please provide a valid OpenAI API key. I can help you with:\n- Writing SQL queries\n- Data analysis guidance\n- Query optimization tips\n- Database best practices`,
        metadata: { agentType: 'query', fallback: true }
      },
      'yaml': {
        content: `I'm an Ontology Agent for DataMind. I help with semantic data modeling and ontology design. Your message: "${content}"\n\nTo enable full AI responses, please provide a valid OpenAI API key. I can help you with:\n- Semantic model design\n- Data relationships\n- Ontology best practices\n- YAML configurations`,
        metadata: { agentType: 'yaml', fallback: true }
      },
      'dashboards': {
        content: `I'm a Dashboard Agent for DataMind. I help create interactive dashboards and visualizations. Your message: "${content}"\n\nTo enable full AI responses, please provide a valid OpenAI API key. I can help you with:\n- Dashboard design\n- Chart recommendations\n- Visualization best practices\n- Interactive components`,
        metadata: { agentType: 'dashboards', fallback: true }
      },
      'general': {
        content: `Hello! I'm the DataMind Assistant. I see you said: "${content}"\n\n**To get started:**\n- **Connect to data**: Type "@query connect" to establish your Snowflake database connection\n- **Run SQL queries**: Type "@query" for data analysis and SQL help\n- **Build data models**: Type "@ontology" for semantic modeling\n- **Create dashboards**: Type "@dashboards" for visualizations\n\n**Quick Actions:**\n- Connect to Snowflake → @query connect\n- Explore your data → @query show tables\n- Start a query → @query [your question]`,
        metadata: { agentType: 'general', fallback: true }
      }
    };
    
    return responses[agentType as keyof typeof responses] || responses['general'];
  }

  async processMessage(content: string, agentType: 'query' | 'yaml' | 'dashboards' | 'general', sessionId: string): Promise<AgentResponse> {
    try {
      switch (agentType) {
        case 'query':
          return await this.processQueryAgent(content, sessionId);
        case 'yaml':
          return await this.processYamlAgent(content, sessionId);
        case 'dashboards':
          return await this.processDashboardAgent(content, sessionId);
        default:
          return await this.processGeneralAgent(content, sessionId);
      }
    } catch (error) {
      console.error('Error processing agent message:', error);
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async processQueryAgent(content: string, sessionId: string): Promise<AgentResponse> {
    try {
      // First try the enhanced Agent SDK implementation
      try {
        const { agentSDKService } = await import('./agent-sdk-service');
        const result = await agentSDKService.processMessage(sessionId, content, 'query');
        return {
          content: result.content,
          metadata: result.metadata
        };
      } catch (error) {
        console.error('Agent SDK service error, falling back to legacy implementation:', error);
      }

      // Fallback to legacy implementation
      const userId = '0d493db8-bfed-4dd0-ab40-ae8a3225f8a5'; // TODO: Get from session
      const context = await agentContextManager.getContext(sessionId, userId);

      // Add user message to history
      await agentContextManager.addToHistory(sessionId, {
        role: 'user',
        content,
        timestamp: new Date()
      });

      // Check for function calls (commands like "connect", "show tables", etc.)
      const functionResponse = await this.processFunctionCall(content, context);
      if (functionResponse) {
        return functionResponse;
      }

      // Check if this looks like a direct SQL query
      const sqlQueryPattern = /\b(SELECT|WITH|SHOW|DESCRIBE|DESC|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i;
      const isDirectSQLQuery = sqlQueryPattern.test(content.trim());
      
      if (isDirectSQLQuery && context.connectionId) {
        // Execute directly on Snowflake
        try {
          const executeTool = getFunctionTool('execute_sql');
          const result = await executeTool!.execute(context, { sql: content.trim() });
          
          return {
            content: result,
            metadata: {
              model: "function-tool",
              agentType: "query",
              sessionId,
              functionCall: "execute_sql"
            }
          };
        } catch (snowflakeError) {
          console.log('Direct SQL execution failed:', snowflakeError);
        }
      }

      // Use OpenAI with enhanced context
      const contextSummary = agentContextManager.getContextSummary(context);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a Query Agent for DataMind, a data analytics platform. You help users with natural language queries, SQL generation, and data analysis.

CAPABILITIES:
- Convert natural language to SQL queries  
- Execute queries on connected Snowflake databases
- Explain query results and provide insights
- Guide users through database exploration
- Help with semantic data modeling

FUNCTION TOOLS AVAILABLE:
${availableFunctionTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

BEHAVIOR GUIDELINES:
- Be proactive and action-oriented
- If user asks to connect/explore data, suggest specific function calls
- For queries that need database context, help guide them through connection setup
- When suggesting SQL, consider Snowflake syntax and best practices
- Use the current context to provide relevant suggestions

${contextSummary}

EXAMPLES OF FUNCTION CALLS:
- "connect to snowflake" → suggest using connect_to_snowflake()
- "show me databases" → suggest using get_databases()  
- "list tables" → suggest using get_tables()
- "generate SQL for X" → use current schema context with generate_sql()

Respond naturally but mention when function tools would help accomplish their goal.`
          },
          {
            role: "user", 
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const responseContent = response.choices[0].message.content || "I'm sorry, I couldn't process your request.";

      // Add assistant response to history
      await agentContextManager.addToHistory(sessionId, {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      });

      return {
        content: responseContent,
        metadata: {
          model: "gpt-4o",
          agentType: "query",
          sessionId
        }
      };
    } catch (error) {
      console.error('Query agent error:', error);
      return this.getFallbackResponse('query', content);
    }
  }

  private async processFunctionCall(content: string, context: AgentContext): Promise<AgentResponse | null> {
    const lowercaseContent = content.toLowerCase().trim();
    
    // Enhanced command detection with simple patterns and confirmations
    const commandMap = [
      { patterns: ['connect', 'connect to snowflake', 'establish connection'], tool: 'connect_to_snowflake', params: {} },
      { patterns: ['show databases', 'list databases', 'get databases', 'databases'], tool: 'get_databases', params: {} },
      { patterns: ['show schemas', 'list schemas', 'get schemas', 'schemas'], tool: 'get_schemas', params: {} },
      { patterns: ['show tables', 'list tables', 'get tables', 'tables'], tool: 'get_tables', params: {} },
      { patterns: ['current context', 'show context', 'what is my context'], tool: 'get_current_context', params: {} }
    ];

    // For simple confirmations, assume user wants to see tables if they just said "sure" or "yes"
    // This is a simple heuristic that can be improved later with context tracking
    const confirmationPatterns = ['yes', 'sure', 'ok', 'okay', 'proceed', 'go ahead', 'do it'];
    if (confirmationPatterns.includes(lowercaseContent)) {
      // Default to showing tables for confirmations (most common request)
      const tool = getFunctionTool('get_tables');
      if (tool) {
        try {
          console.log(`Executing function tool: get_tables (from confirmation)`);
          const result = await tool.execute(context, {});
          return {
            content: result,
            metadata: {
              model: "function-tool",
              agentType: "query",
              sessionId: context.sessionId,
              functionCall: 'get_tables'
            }
          };
        } catch (error) {
          console.log(`Function tool error: ${error}`);
          return {
            content: `Error executing get_tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              model: "function-tool",
              agentType: "query", 
              sessionId: context.sessionId,
              error: true
            }
          };
        }
      }
    }

    for (const command of commandMap) {
      if (command.patterns.some(pattern => lowercaseContent.includes(pattern))) {
        const tool = getFunctionTool(command.tool);
        if (tool) {
          try {
            console.log(`Executing function tool: ${command.tool}`);
            const result = await tool.execute(context, command.params);
            console.log(`Function tool result: ${result}`);
            
            await agentContextManager.addToHistory(context.sessionId, {
              role: 'function',
              content: result,
              functionCall: command.tool,
              timestamp: new Date()
            });

            return {
              content: result,
              metadata: {
                model: "function-tool",
                agentType: "query",
                sessionId: context.sessionId,
                functionCall: command.tool
              }
            };
          } catch (error) {
            console.log(`Function tool error: ${error}`);
            return {
              content: `Error executing ${command.tool}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              metadata: {
                model: "function-tool",
                agentType: "query", 
                sessionId: context.sessionId,
                error: true
              }
            };
          }
        }
      }
    }

    // Check for database/schema selection patterns
    const selectDbMatch = lowercaseContent.match(/(?:select|use|choose)\s+database\s+(\w+)/);
    if (selectDbMatch) {
      const tool = getFunctionTool('select_database');
      if (tool) {
        const result = await tool.execute(context, { database_name: selectDbMatch[1] });
        return {
          content: result,
          metadata: { model: "function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "select_database" }
        };
      }
    }

    const selectSchemaMatch = lowercaseContent.match(/(?:select|use|choose)\s+schema\s+(\w+)/);
    if (selectSchemaMatch) {
      const tool = getFunctionTool('select_schema');
      if (tool) {
        const result = await tool.execute(context, { schema_name: selectSchemaMatch[1] });
        return {
          content: result,
          metadata: { model: "function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "select_schema" }
        };
      }
    }

    // Check for table description patterns
    const describeTableMatch = lowercaseContent.match(/(?:describe|desc|show\s+structure\s+of|explain)\s+(?:table\s+)?(\w+)/);
    if (describeTableMatch) {
      const tool = getFunctionTool('describe_table');
      if (tool) {
        try {
          const result = await tool.execute(context, { table_name: describeTableMatch[1] });
          return {
            content: result,
            metadata: { model: "function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "describe_table" }
          };
        } catch (error) {
          return {
            content: `Error describing table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { model: "function-tool", agentType: "query", sessionId: context.sessionId, error: true }
          };
        }
      }
    }

    return null;
  }

  private async executeSnowflakeQuery(connectionId: string, sqlText: string): Promise<any> {
    const connection = await storage.getSnowflakeConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Ensure Snowflake connection exists
    const hasActiveConnection = snowflakeService.hasActiveConnection(connectionId);
    if (!hasActiveConnection) {
      const connected = await snowflakeService.createConnection(connectionId, {
        account: connection.account,
        username: connection.username,
        password: connection.password || '',
        database: connection.database || undefined,
        schema: connection.schema || undefined,
        warehouse: connection.warehouse || undefined,
        role: connection.role || undefined,
        authenticator: connection.authenticator || undefined,
      });

      if (!connected) {
        throw new Error('Failed to establish Snowflake connection');
      }
    }

    return await snowflakeService.executeQuery(connectionId, sqlText);
  }

  private formatQueryResults(result: any): string {
    if (!result.rows || result.rows.length === 0) {
      return "No results returned.";
    }

    const maxRows = 5;
    const displayRows = result.rows.slice(0, maxRows);
    
    // Create a simple table format
    if (result.columns && result.columns.length > 0) {
      let formatted = "| " + result.columns.map((col: any) => col.name).join(" | ") + " |\n";
      formatted += "|" + result.columns.map(() => "---").join("|") + "|\n";
      
      displayRows.forEach((row: any) => {
        formatted += "| " + Object.values(row).join(" | ") + " |\n";
      });
      
      if (result.rows.length > maxRows) {
        formatted += `\n... and ${result.rows.length - maxRows} more rows.`;
      }
      
      return formatted;
    }
    
    return JSON.stringify(displayRows, null, 2);
  }

  private async processYamlAgent(content: string, sessionId: string): Promise<AgentResponse> {
    try {
      // Use OpenAI to process ontology/semantic modeling requests
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an Ontology Agent for DataMind, a data analytics platform. Your role is to help users with semantic data modeling, ontology design, and data relationships.

You can:
- Help design semantic models and ontologies
- Explain data relationships and hierarchies
- Suggest data modeling best practices
- Generate YAML configurations for data models
- Provide guidance on schema design

When responding:
- Be technical but clear
- Provide structured examples when helpful
- Focus on data modeling concepts
- Suggest best practices for data organization

Context: You are working with users who need to create semantic models and ontologies for their data.`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const responseContent = response.choices[0].message.content || "I'm sorry, I couldn't process your ontology request.";

      return {
        content: responseContent,
        metadata: {
          model: "gpt-4o",
          agentType: 'yaml',
          sessionId
        }
      };
    } catch (error) {
      console.error('YAML agent error:', error);
      // Return fallback response if OpenAI fails
      return this.getFallbackResponse('yaml', content);
    }
  }

  private async processDashboardAgent(content: string, sessionId: string): Promise<AgentResponse> {
    try {
      // Use OpenAI to process dashboard/visualization requests
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a Dashboard Agent for DataMind, a data analytics platform. Your role is to help users create interactive dashboards and data visualizations.

You can:
- Help design dashboard layouts and components
- Suggest appropriate chart types for different data
- Provide guidance on data visualization best practices
- Help create interactive dashboard elements
- Suggest KPIs and metrics to track

When responding:
- Focus on practical visualization advice
- Suggest specific chart types and layouts
- Consider user experience and clarity
- Provide actionable dashboard design guidance

Context: You are helping users build effective dashboards and visualizations for their data analytics needs.`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const responseContent = response.choices[0].message.content || "I'm sorry, I couldn't process your dashboard request.";

      return {
        content: responseContent,
        metadata: {
          model: "gpt-4o",
          agentType: 'dashboards',
          sessionId
        }
      };
    } catch (error) {
      console.error('Dashboard agent error:', error);
      // Return fallback response if OpenAI fails
      return this.getFallbackResponse('dashboards', content);
    }
  }

  private async processGeneralAgent(content: string, sessionId: string): Promise<AgentResponse> {
    try {
      // Use OpenAI for general assistant conversations
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are the DataMind Assistant, a helpful guide for a data analytics platform that connects to Snowflake databases. You help users get started and navigate to the right tools.

CORE PURPOSE:
- Guide users to connect to data sources and get started with analytics
- Direct users to the specialized agents based on their needs
- Provide specific, actionable guidance rather than generic responses

KEY SCENARIOS & RESPONSES:
- When user says "connect" or "connection": Direct them to use "@query connect" to establish Snowflake connection
- When user needs data analysis: "For SQL queries and data analysis, type @query"
- When user needs data modeling: "For semantic modeling and relationships, type @ontology" 
- When user needs dashboards: "For visualizations and dashboards, type @dashboards"

RESPONSE STYLE:
- Be direct and helpful, not just conversational
- Provide specific next steps, not generic advice
- For connection requests: "To connect to your Snowflake database, type '@query connect' - this will establish your data connection so you can start analyzing data."
- For unclear requests: Ask specific clarifying questions about what they want to accomplish

AVOID:
- Generic responses like "How can I assist you today?"
- Repeating the same unhelpful advice
- Long explanations without actionable steps

Context: Users come here to get connected to their data and start analytics work. Be their guide to the right agent and functionality.`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const responseContent = response.choices[0].message.content || "I'm sorry, I couldn't process your request.";

      return {
        content: responseContent,
        metadata: {
          model: "gpt-4o",
          agentType: 'general',
          sessionId
        }
      };
    } catch (error) {
      console.error('General agent error:', error);
      // Return fallback response if OpenAI fails
      return this.getFallbackResponse('general', content);
    }
  }

  private async runPythonAgent(script: string, input: string, sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Construct path to the Python CLI scripts
      const scriptPath = path.join(process.cwd(), '..', 'datamind', 'src', 'cli', script);
      
      // Spawn Python process with the agent command
      const pythonProcess = spawn('python', [scriptPath, 'agent', '--session-id', sessionId], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Add any required environment variables
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          SNOWFLAKE_USER: process.env.SNOWFLAKE_USER,
          SNOWFLAKE_PASSWORD: process.env.SNOWFLAKE_PASSWORD,
          SNOWFLAKE_ACCOUNT: process.env.SNOWFLAKE_ACCOUNT,
          SNOWFLAKE_WAREHOUSE: process.env.SNOWFLAKE_WAREHOUSE,
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse the output from the Python agent
            const result = this.parseAgentOutput(stdout, script);
            resolve(result);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Agent process exited with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });

      // Send the user input to the Python process
      pythonProcess.stdin?.write(input + '\n');
      pythonProcess.stdin?.end();
    });
  }

  private parseAgentOutput(output: string, script: string): any {
    // This is a simplified parser - in reality, you'd need to implement
    // proper parsing based on the actual output format of your Python agents
    
    try {
      // Look for JSON output in the agent response
      const lines = output.split('\n');
      let jsonOutput = null;
      
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
          try {
            jsonOutput = JSON.parse(line.trim());
            break;
          } catch (e) {
            // Continue looking for valid JSON
          }
        }
      }

      if (jsonOutput) {
        return jsonOutput;
      }

      // Fallback to parsing text output
      if (script === 'agentic_query_cli.py') {
        return this.parseQueryOutput(output);
      } else {
        return this.parseYamlOutput(output);
      }
    } catch (error) {
      console.error('Error parsing agent output:', error);
      return { content: output, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private parseQueryOutput(output: string): any {
    // Extract SQL query, execution results, and other metadata
    const sqlMatch = output.match(/SQL Query:\s*(.*?)(?=\n|\r|$)/i);
    const resultMatch = output.match(/Query Results.*?(\[.*?\])/s);
    
    return {
      content: output,
      sqlQuery: sqlMatch ? sqlMatch[1].trim() : null,
      data: resultMatch ? this.parseJsonSafely(resultMatch[1]) : [],
      executionTime: this.extractExecutionTime(output)
    };
  }

  private parseYamlOutput(output: string): any {
    return {
      content: output,
      generatedFiles: this.extractGeneratedFiles(output)
    };
  }

  private parseQueryResult(result: any): any {
    return {
      sqlQuery: result.sqlQuery,
      data: result.data || [],
      executionTime: result.executionTime,
      content: result.content
    };
  }

  private formatQueryResponse(result: any): string {
    let response = '';
    
    if (result.sqlQuery) {
      response += `I've executed your query and here are the results:\n\n`;
      response += `**SQL Query:**\n\`\`\`sql\n${result.sqlQuery}\n\`\`\`\n\n`;
    }
    
    if (result.data && result.data.length > 0) {
      response += `**Results:** Found ${result.data.length} rows\n\n`;
      
      if (result.data.length <= 10) {
        // Show data in table format for small results
        const headers = Object.keys(result.data[0]);
        response += `| ${headers.join(' | ')} |\n`;
        response += `| ${headers.map(() => '---').join(' | ')} |\n`;
        
        result.data.forEach((row: any) => {
          response += `| ${headers.map(h => row[h] || '').join(' | ')} |\n`;
        });
      } else {
        response += `The dataset is large (${result.data.length} rows). I've created a visualization to help you explore the data.`;
      }
    } else {
      response += 'No results found for your query.';
    }
    
    return response;
  }

  private formatYamlResponse(result: any): string {
    let response = 'I\'ve processed your request for YAML dictionary generation.\n\n';
    
    if (result.generatedFiles && result.generatedFiles.length > 0) {
      response += `**Generated Files:**\n`;
      result.generatedFiles.forEach((file: string) => {
        response += `- ${file}\n`;
      });
    }
    
    response += result.content || '';
    return response;
  }

  private parseJsonSafely(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return [];
    }
  }

  private extractExecutionTime(output: string): number {
    const timeMatch = output.match(/(\d+(?:\.\d+)?)\s*ms/i);
    return timeMatch ? parseFloat(timeMatch[1]) : 0;
  }

  private extractGeneratedFiles(output: string): string[] {
    const fileMatches = output.match(/Generated:\s*(.*\.yaml?)/gi);
    return fileMatches ? fileMatches.map(m => m.replace('Generated:', '').trim()) : [];
  }
}

export const agentService = new AgentService();
