import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { visualizationService } from './visualization-service';

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

  async processMessage(content: string, agentType: 'query' | 'yaml', sessionId: string): Promise<AgentResponse> {
    try {
      if (agentType === 'query') {
        return await this.processQueryAgent(content, sessionId);
      } else {
        return await this.processYamlAgent(content, sessionId);
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
      // Simulate the agentic_query_cli.py functionality
      // In a real implementation, you would spawn the Python process
      const result = await this.runPythonAgent('agentic_query_cli.py', content, sessionId);
      
      // Parse the result to extract SQL, data, and visualization info
      const parsedResult = this.parseQueryResult(result);
      
      let visualization;
      if (parsedResult.data && parsedResult.data.length > 0) {
        // Create visualization from the query results
        visualization = await visualizationService.createVisualizationFromData(
          parsedResult.data,
          parsedResult.sqlQuery,
          content
        );
      }

      return {
        content: this.formatQueryResponse(parsedResult),
        metadata: {
          sqlQuery: parsedResult.sqlQuery,
          executionTime: parsedResult.executionTime,
          rowCount: parsedResult.data?.length || 0
        },
        visualization
      };
    } catch (error) {
      console.error('Query agent error:', error);
      throw error;
    }
  }

  private async processYamlAgent(content: string, sessionId: string): Promise<AgentResponse> {
    try {
      // Simulate the agentic_generate_yaml_cli.py functionality
      const result = await this.runPythonAgent('agentic_generate_yaml_cli.py', content, sessionId);
      
      return {
        content: this.formatYamlResponse(result),
        metadata: {
          agentType: 'yaml',
          generatedFiles: result.generatedFiles || []
        }
      };
    } catch (error) {
      console.error('YAML agent error:', error);
      throw error;
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
