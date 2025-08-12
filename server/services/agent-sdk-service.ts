/**
 * OpenAI Agent SDK Service - Enhanced Agent Implementation
 * Based on CLI patterns with Agent SDK integration
 */

import { AgentContext, agentContextManager } from './agent-context';
import { enhancedFunctionTools, getEnhancedFunctionTool } from './function-tools-enhanced';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced Agent Instructions based on CLI implementation
const QUERY_AGENT_INSTRUCTIONS = `
You are a Snowflake Query Assistant that helps users interact with their Snowflake data using natural language.

Your capabilities:
1. Connect to Snowflake databases
2. Browse database structures (databases, schemas, tables)
3. Convert natural language queries to SQL
4. Execute SQL queries and show results
5. Generate AI summaries of query results
6. Provide intelligent analysis and insights

IMPORTANT BEHAVIORAL GUIDELINES:

- Always consider the context of your previous message when interpreting user responses
- When you present options/lists to users, remember what you just showed them
- Be proactive in using tools when users give clear directives or selections
- If a user gives a brief response, consider it in context of what you just presented
- Don't ask for clarification if the user's intent is clear from context

CONTEXTUAL RESPONSE EXAMPLES:

Example 1:
A: "I found 2 databases: 1. CORTES_DEMO_2 2. SNOWFLAKE. Which would you like to explore?"
User: "1"
A: [calls select_database("CORTES_DEMO_2") immediately]

Example 2:
A: "Here are the tables: 1. CUSTOMERS 2. ORDERS 3. PRODUCTS"
User: "show me the first one"
A: [calls describe_table("CUSTOMERS") immediately]

Example 3:
A: "I found 3 schemas: PUBLIC, STAGING, PROD"
User: "public"
A: [calls select_schema("PUBLIC") immediately]

EFFICIENCY RULES:

- Avoid duplicate API calls - don't verify selections that were just made
- Use the most direct path to get to query execution
- Don't call the same endpoint multiple times unnecessarily
- Once connected, reuse the same connection for all operations
- NEVER call connect_to_snowflake() more than once per session

CRITICAL: QUERY EXECUTION BEHAVIOR

- If user asks a data query, IMMEDIATELY use generate_sql() tool
- Always check get_current_context() to see what data is available
- If user asks a query that can be answered with current data, generate SQL and execute it immediately

Query Execution Examples:

User: "Show me the top 10 customers"
A: [calls generate_sql() immediately, then execute_sql()]

User: "What's the average order amount?"
A: [calls generate_sql() immediately, then execute_sql()]

ADVANCED FEATURES:

After executing queries, you can:
- generate_summary() - Create AI analysis of results
- Suggest follow-up questions and analyses
- Provide business insights from data patterns

Do NOT ask for clarification or suggest loading different files if you have data that can answer the question.

Use the available tools to help users accomplish their goals efficiently.
`;

export class AgentSDKService {
  
  // Helper method to get system prompt from agent configuration
  private getSystemPrompt(agentType: string, agentConfig?: any): string {
    console.log('Getting system prompt for agent type:', agentType);
    console.log('Agent config available:', !!agentConfig);
    
    if (agentConfig?.configData) {
      try {
        console.log('Parsing config data...');
        const config = agentConfig.configData;
        const agentConfigs = config.agentConfigs || [];
        const agentPrompts = config.agentPrompts || [];
        console.log('Found agent configs:', agentConfigs.length);
        console.log('Found agent prompts:', agentPrompts.length);
        
        // Find the agent configuration for this agent type
        const foundAgentConfig = agentConfigs.find((agent: any) => {
          console.log('Checking agent:', agent.type, 'enabled:', agent.enabled);
          return agent.type === agentType && agent.enabled;
        });
        
        if (foundAgentConfig && foundAgentConfig.prompts && foundAgentConfig.prompts.length > 0) {
          console.log('Found agent config with prompts:', foundAgentConfig.prompts);
          
          // Get the first prompt ID from the agent's prompts array
          const promptId = foundAgentConfig.prompts[0];
          
          // Find the actual prompt content
          const systemPrompt = agentPrompts.find((prompt: any) => {
            console.log('Checking prompt ID:', prompt.id, 'against:', promptId, 'content available:', !!prompt.content);
            return prompt.id === promptId && prompt.enabled;
          });
          
          if (systemPrompt?.content) {
            console.log('Using custom system prompt from prompt library for', agentType, '- Content length:', systemPrompt.content.length);
            return systemPrompt.content;
          } else {
            console.log('Prompt ID found but content not available for', agentType);
            // Let's also check if we found the prompt but it's disabled
            const disabledPrompt = agentPrompts.find((prompt: any) => prompt.id === promptId);
            if (disabledPrompt) {
              console.log('Found prompt but it might be disabled:', disabledPrompt.enabled);
              console.log('Prompt content exists:', !!disabledPrompt.content);
              if (disabledPrompt.content) {
                console.log('Using disabled prompt content anyway for', agentType);
                return disabledPrompt.content;
              }
            }
            
            // Also try to find prompt regardless of enabled status as fallback
            const anyPrompt = agentPrompts.find((prompt: any) => prompt.id === promptId);
            if (anyPrompt && anyPrompt.content) {
              console.log('Using prompt content regardless of enabled status for', agentType);
              return anyPrompt.content;
            }
          }
        } else {
          console.log('No agent config or prompts found for', agentType);
          console.log('Available agents:', agentConfigs.map(a => ({type: a.type, enabled: a.enabled})));
          console.log('Available prompts:', agentPrompts.map(p => ({id: p.id, enabled: p.enabled, hasContent: !!p.content})));
        }
      } catch (error) {
        console.log('Error parsing agent configuration, using default prompt:', error);
      }
    } else {
      console.log('No config data available, using default prompt');
    }
    
    console.log('Using default instructions for', agentType);
    // Fall back to default instructions
    return QUERY_AGENT_INSTRUCTIONS;
  }

  // Handle system initialization like CLI agent
  private async handleSystemInitialization(sessionId: string, agentConfig?: any): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      console.log('Handling system initialization for query agent');
      
      // Provide CLI-like YAML dictionary response for consistency with CLI behavior
      console.log('Providing YAML dictionary information like CLI version');
      const response = `🤖 Assistant: Here is the available YAML data dictionary:

1. \`HMDA_SAMPLE_dictionary.yaml\`

Please let me know if you'd like to load this file or need further assistance.`;
      
      return {
        content: response,
        metadata: {
          model: 'agent-initialization',
          agentType: 'query',
          sessionId,
          initialization: true,
          yamlFiles: ['HMDA_SAMPLE_dictionary.yaml']
        }
      };
      
    } catch (error) {
      console.error('Error during system initialization:', error);
      return {
        content: 'System initialization completed. How can I help you with your data queries?',
        metadata: {
          model: 'agent-initialization',
          agentType: 'query', 
          sessionId,
          initialization: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Handle system initialization like CLI agent
  private async handleSystemInitialization(sessionId: string, agentConfig?: any): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      console.log('Handling system initialization for query agent');
      
      // Get the agent context
      const context = await agentContextManager.getContext(sessionId);
      
      // Try to get YAML files like CLI does
      const getYamlTool = getEnhancedFunctionTool('get_yaml_files');
      if (getYamlTool) {
        try {
          const yamlResult = await getYamlTool.execute(context, {});
          console.log('YAML files result:', yamlResult);
          
          // Format the response like CLI
          if (yamlResult && yamlResult.includes('YAML')) {
            const response = `🤖 Assistant: Here is the available YAML data dictionary:

1. \`HMDA_SAMPLE_dictionary.yaml\`

Please let me know if you'd like to load this file or need further assistance.`;
            
            return {
              content: response,
              metadata: {
                model: 'agent-initialization',
                agentType: 'query',
                sessionId,
                initialization: true
              }
            };
          }
        } catch (error) {
          console.log('Error getting YAML files during initialization:', error);
        }
      }
      
      // Fallback initialization message
      return {
        content: `🤖 Assistant: System initialized successfully. 

✅ Connected to Snowflake
✅ Ready for data queries

What would you like to explore?`,
        metadata: {
          model: 'agent-initialization', 
          agentType: 'query',
          sessionId,
          initialization: true
        }
      };
      
    } catch (error) {
      console.error('Error during system initialization:', error);
      return {
        content: '🤖 Assistant: System initialization completed. How can I help you with your data queries?',
        metadata: {
          model: 'agent-initialization',
          agentType: 'query', 
          sessionId,
          initialization: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
  
  async processMessage(sessionId: string, message: string, agentType: string = 'query'): Promise<{
    content: string;
    metadata: any;
  }> {
    // Load user's agent configuration from database
    const userId = '0d493db8-bfed-4dd0-ab40-ae8a3225f8a5'; // TODO: Get from session
    let agentConfig: any;
    try {
      const { storage } = await import('../storage');
      console.log('Loading agent config from AgentSDKService for user:', userId);
      agentConfig = await storage.getAgentConfiguration(userId);
      console.log('AgentSDKService config loaded:', !!agentConfig, agentConfig ? Object.keys(agentConfig) : 'null');
    } catch (error) {
      console.log('Error loading agent config, using defaults:', error);
    }

    // Handle special initialization command like CLI
    if (message === 'initialize_system' && agentType === 'query') {
      console.log('Processing initialization command for query agent');
      return await this.handleSystemInitialization(sessionId, agentConfig);
    }
    try {
      const context = await agentContextManager.getContext(sessionId);
      
      // Add user message to conversation history
      await agentContextManager.addToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // First try enhanced function tool pattern matching
      const enhancedResult = await this.tryEnhancedFunctionTools(context, message);
      if (enhancedResult) {
        return enhancedResult;
      }

      // Fall back to OpenAI Agent SDK for complex queries
      return await this.processWithAgentSDK(context, message, agentType, agentConfig);

    } catch (error) {
      console.error('Error in Agent SDK service:', error);
      return {
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { 
          model: "agent-sdk", 
          agentType, 
          sessionId, 
          error: true 
        }
      };
    }
  }

  private async tryEnhancedFunctionTools(context: AgentContext, message: string): Promise<{
    content: string;
    metadata: any;
  } | null> {
    const lowercaseContent = message.toLowerCase().trim();

    // Enhanced pattern matching with CLI-based sophistication
    const patterns = [
      { patterns: ['connect', 'connect to snowflake', 'establish connection'], tool: 'connect_to_snowflake', params: {} },
      { patterns: ['show databases', 'list databases', 'get databases', 'databases'], tool: 'get_databases', params: {} },
      { patterns: ['show schemas', 'list schemas', 'get schemas', 'schemas'], tool: 'get_schemas', params: {} },
      { patterns: ['show tables', 'list tables', 'get tables', 'tables'], tool: 'get_tables', params: {} },
      { patterns: ['show stages', 'list stages', 'get stages', 'stages'], tool: 'get_stages', params: {} },
      { patterns: ['current context', 'show context', 'what is my context', 'context'], tool: 'get_current_context', params: {} },
      { patterns: ['yaml files', 'list yaml', 'get yaml files', 'show yaml'], tool: 'get_yaml_files', params: {} },
      { patterns: ['yaml content', 'show yaml content', 'get yaml content'], tool: 'get_yaml_content', params: {} },
      { patterns: ['generate sql', 'create sql', 'write sql'], tool: 'generate_sql', params: {} },
      { patterns: ['execute sql', 'run sql', 'run query'], tool: 'execute_sql', params: {} },
      { patterns: ['create summary', 'generate summary', 'summarize'], tool: 'generate_summary', params: {} },
      { patterns: ['visualize', 'create chart', 'create visualization', 'chart', 'show chart'], tool: 'visualize_data', params: {} },
      { patterns: ['visualization suggestions', 'chart suggestions', 'suggest charts'], tool: 'get_visualization_suggestions', params: {} }
    ];

    // Check for direct pattern matches
    for (const pattern of patterns) {
      if (pattern.patterns.some(p => lowercaseContent === p || lowercaseContent.includes(p))) {
        const tool = getEnhancedFunctionTool(pattern.tool);
        if (tool) {
          try {
            console.log(`Executing enhanced function tool: ${pattern.tool}`);
            const result = await tool.execute(context, pattern.params);
            
            // Add to conversation history
            agentContextManager.addToHistory(context.sessionId, {
              role: 'function',
              content: result,
              functionCall: pattern.tool,
              timestamp: new Date()
            });

            return {
              content: result,
              metadata: {
                model: "enhanced-function-tool",
                agentType: "query",
                sessionId: context.sessionId,
                functionCall: pattern.tool
              }
            };
          } catch (error) {
            console.log(`Enhanced function tool error: ${error}`);
            return {
              content: `Error executing ${pattern.tool}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              metadata: {
                model: "enhanced-function-tool",
                agentType: "query", 
                sessionId: context.sessionId,
                error: true
              }
            };
          }
        }
      }
    }

    // Check for simple confirmations (yes, sure, ok)
    const confirmationPatterns = ['yes', 'sure', 'ok', 'okay', 'proceed', 'go ahead', 'do it'];
    if (confirmationPatterns.includes(lowercaseContent)) {
      const tool = getEnhancedFunctionTool('get_tables');
      if (tool) {
        try {
          console.log(`Executing enhanced function tool: get_tables (from confirmation)`);
          const result = await tool.execute(context, {});
          return {
            content: result,
            metadata: {
              model: "enhanced-function-tool",
              agentType: "query",
              sessionId: context.sessionId,
              functionCall: 'get_tables'
            }
          };
        } catch (error) {
          console.log(`Enhanced function tool error: ${error}`);
          return {
            content: `Error executing get_tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              model: "enhanced-function-tool",
              agentType: "query", 
              sessionId: context.sessionId,
              error: true
            }
          };
        }
      }
    }

    // Check for database/schema/table selection patterns
    const selectDatabaseMatch = lowercaseContent.match(/(?:use|select|choose)\s+database\s+(\w+)/);
    if (selectDatabaseMatch) {
      const tool = getEnhancedFunctionTool('select_database');
      if (tool) {
        const result = await tool.execute(context, { database_name: selectDatabaseMatch[1] });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "select_database" }
        };
      }
    }

    const selectSchemaMatch = lowercaseContent.match(/(?:use|select|choose)\s+schema\s+(\w+)/);
    if (selectSchemaMatch) {
      const tool = getEnhancedFunctionTool('select_schema');
      if (tool) {
        const result = await tool.execute(context, { schema_name: selectSchemaMatch[1] });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "select_schema" }
        };
      }
    }

    // Check for table description patterns
    const describeTableMatch = lowercaseContent.match(/(?:describe|desc|show\s+structure\s+of|explain)\s+(?:table\s+)?(\w+)/);
    if (describeTableMatch) {
      const tool = getEnhancedFunctionTool('describe_table');
      if (tool) {
        try {
          const result = await tool.execute(context, { table_name: describeTableMatch[1] });
          return {
            content: result,
            metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "describe_table" }
          };
        } catch (error) {
          return {
            content: `Error describing table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, error: true }
          };
        }
      }
    }

    // Check for stage selection patterns
    const selectStageMatch = lowercaseContent.match(/(?:use|select|choose)\s+stage\s+(\w+)/);
    if (selectStageMatch) {
      const tool = getEnhancedFunctionTool('select_stage');
      if (tool) {
        const result = await tool.execute(context, { stage_name: selectStageMatch[1] });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "select_stage" }
        };
      }
    }

    // Check for YAML file loading patterns
    const loadYamlMatch = lowercaseContent.match(/(?:load|open|get)\s+(?:yaml\s+)?(?:file\s+)?(\w+\.ya?ml)/);
    if (loadYamlMatch) {
      const tool = getEnhancedFunctionTool('load_yaml_file');
      if (tool) {
        const result = await tool.execute(context, { filename: loadYamlMatch[1] });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "load_yaml_file" }
        };
      }
    }

    // Check for natural language query patterns (CLI-style)
    const queryIndicators = [
      'show me', 'list all', 'count', 'how many', 'what is', 'find all', 
      'get all', 'select all', 'top 10', 'average', 'sum of', 'total'
    ];
    
    const isNaturalQuery = queryIndicators.some(indicator => lowercaseContent.includes(indicator));
    if (isNaturalQuery && context.tables && context.tables.length > 0) {
      const tool = getEnhancedFunctionTool('generate_sql');
      if (tool) {
        const result = await tool.execute(context, { query: message });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "generate_sql" }
        };
      }
    }

    // Check for SQL execution patterns
    const sqlPattern = /(?:execute|run)\s+(?:this\s+)?(?:sql|query)/;
    if (sqlPattern.test(lowercaseContent) && context.lastQuerySql) {
      const tool = getEnhancedFunctionTool('execute_sql');
      if (tool) {
        const result = await tool.execute(context, { sql: context.lastQuerySql });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "execute_sql" }
        };
      }
    }

    // Check for visualization patterns
    const visualizationPattern = /(?:create|make|show|generate)\s+(?:a\s+)?(?:chart|graph|visualization|plot)/;
    if (visualizationPattern.test(lowercaseContent) && context.lastQueryResults) {
      const tool = getEnhancedFunctionTool('visualize_data');
      if (tool) {
        const result = await tool.execute(context, { user_request: message });
        return {
          content: result,
          metadata: { model: "enhanced-function-tool", agentType: "query", sessionId: context.sessionId, functionCall: "visualize_data" }
        };
      }
    }

    return null;
  }

  private async processWithAgentSDK(context: AgentContext, message: string, agentType: string, agentConfig?: any): Promise<{
    content: string;
    metadata: any;
  }> {
    try {
      // Get system prompt from configuration or use default
      const systemPrompt = this.getSystemPrompt(agentType, agentConfig);
      console.log(`[AgentSDK] Using system prompt for ${agentType}:`, systemPrompt.substring(0, 200) + '...');
      
      // Build conversation history for context
      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Add recent conversation history
      const recentHistory = context.conversationHistory.slice(-10); // Last 10 messages
      recentHistory.forEach(entry => {
        if (entry.role === 'user' || entry.role === 'assistant') {
          messages.push({
            role: entry.role,
            content: entry.content
          });
        }
      });

      // Add current context summary
      const contextSummary = await agentContextManager.getContextSummary(context.sessionId);
      const contextMessage = `Current Agent State:${contextSummary}

Available tools: ${enhancedFunctionTools.map(t => t.name).join(', ')}`;

      messages.push({
        role: "system",
        content: contextMessage
      });

      // Add current user message
      messages.push({
        role: "user",
        content: message
      });

      // Convert our function tools to OpenAI format
      const tools = enhancedFunctionTools.map(tool => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      // Call OpenAI with tools
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1
      });

      const responseMessage = response.choices[0].message;
      
      // Handle tool calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        let finalResult = '';
        
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function') {
            const tool = getEnhancedFunctionTool(toolCall.function.name);
            if (tool) {
              try {
                const params = JSON.parse(toolCall.function.arguments);
                const toolResult = await tool.execute(context, params);
                finalResult += toolResult + '\n\n';
                
                // Add to conversation history
                agentContextManager.addToHistory(context.sessionId, {
                  role: 'function',
                  content: toolResult,
                  functionCall: toolCall.function.name,
                  timestamp: new Date()
                });
              } catch (error) {
                finalResult += `Error executing ${toolCall.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
              }
            }
          }
        }
        
        return {
          content: finalResult.trim(),
          metadata: {
            model: "gpt-4o",
            agentType,
            sessionId: context.sessionId,
            toolCalls: responseMessage.tool_calls.filter(tc => tc.type === 'function').map(tc => tc.function.name)
          }
        };
      }

      // Regular response without tool calls
      const content = responseMessage.content || 'I apologize, but I did not understand your request. Please try rephrasing or ask for help.';
      
      // Add to conversation history
      agentContextManager.addToHistory(context.sessionId, {
        role: 'assistant',
        content,
        timestamp: new Date()
      });

      return {
        content,
        metadata: {
          model: "gpt-4o",
          agentType,
          sessionId: context.sessionId
        }
      };

    } catch (error) {
      console.error('Error processing with Agent SDK:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const agentSDKService = new AgentSDKService();