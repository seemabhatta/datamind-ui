import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { visualizationService } from './visualization-service';
import OpenAI from 'openai';
import { storage } from '../storage';
import { snowflakeService } from './snowflake-service';

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
        content: `Hello! I'm the DataMind Assistant. I noticed you said: "${content}"\n\nI can help you with:\n- General data analytics questions\n- Platform navigation\n- Directing you to specialized agents\n- Data concepts explanation\n\nNote: To enable full AI responses, please provide a valid OpenAI API key.`,
        metadata: { agentType: 'general', fallback: true }
      }
    };
    
    return responses[agentType] || responses['general'];
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
        metadata: { error: error.message }
      };
    }
  }

  private async processQueryAgent(content: string, sessionId: string): Promise<AgentResponse> {
    try {
      // Check if this looks like a SQL query and we have a Snowflake connection
      const sqlQueryPattern = /\b(SELECT|WITH|SHOW|DESCRIBE|DESC)\b/i;
      const isDirectSQLQuery = sqlQueryPattern.test(content.trim());
      
      if (isDirectSQLQuery) {
        // Try to execute on Snowflake if available
        try {
          const connections = await storage.getSnowflakeConnections(sessionId); // Using sessionId as placeholder for userId
          const defaultConnection = connections.find(c => c.isDefault && c.isActive);
          
          if (defaultConnection) {
            // Execute the query on Snowflake
            const result = await this.executeSnowflakeQuery(defaultConnection.id, content);
            
            return {
              content: `Successfully executed your Snowflake query!\n\n**Query:** \`\`\`sql\n${content}\n\`\`\`\n\n**Results:** ${result.rows?.length || 0} rows returned\n\nFirst few rows:\n${this.formatQueryResults(result)}`,
              metadata: {
                model: "snowflake-execution",
                agentType: "query",
                sessionId,
                queryResult: result
              }
            };
          }
        } catch (snowflakeError) {
          console.log('Snowflake execution failed, falling back to AI assistant');
        }
      }

      // Use OpenAI to process the query
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a Query Agent for DataMind, a data analytics platform. Your role is to help users with SQL queries and data analysis. 

You can:
- Help write SQL queries for various databases (PostgreSQL, MySQL, Snowflake, etc.)
- Explain query results and concepts
- Suggest query optimizations
- Provide insights about data analysis patterns
- Generate SQL from natural language descriptions

When responding:
- Be conversational and helpful
- Explain your reasoning clearly
- Provide practical SQL examples when relevant
- If generating SQL, make it compatible with Snowflake syntax
- Consider common data warehouse patterns

Context: You are in a chat interface where users can ask questions about their data and SQL queries. Users may have Snowflake connections configured.`
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
          agentType: "query",
          sessionId
        }
      };
    } catch (error) {
      console.error('Query agent error:', error);
      // Return fallback response if OpenAI fails
      return this.getFallbackResponse('query', content);
    }
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
            content: `You are the DataMind Assistant, a friendly and helpful AI for a data analytics platform. You provide conversational assistance and help users with their questions.

You can:
- Have natural conversations about data analytics
- Help users navigate the DataMind platform
- Answer general questions in a conversational way
- Explain data concepts in simple, easy-to-understand terms
- Direct users to specialized agents when needed

When responding:
- Be conversational and friendly
- Keep responses natural and helpful
- For complex SQL needs, suggest: "For SQL queries, try typing @query"
- For data modeling needs, suggest: "For semantic modeling, try typing @ontology"
- For visualization needs, suggest: "For dashboards, try typing @dashboards"
- Respond to greetings warmly and ask how you can help

Context: You are the default assistant in the main chat interface for general conversation and guidance.`
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
      return { content: output, error: error.message };
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
