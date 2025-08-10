/**
 * Agent Configuration Service
 * Connects Agent Hub settings to actual agent behavior
 */

import { enhancedFunctionTools } from './function-tools-enhanced';
import { FunctionToolDefinition } from './function-tools-enhanced';

export interface AgentConfig {
  id: string;
  name: string;
  agentType: 'query' | 'ontology' | 'dashboards' | 'general';
  description: string;
  enabled: boolean;
  tools: string[];
  context: {
    maxHistory: number;
    retainSession: boolean;
    autoExecute: boolean;
  };
}

export interface UserAgentConfiguration {
  tools: Array<{
    name: string;
    enabled: boolean;
    category: string;
  }>;
  agents: AgentConfig[];
  lastSaved?: string;
}

export class AgentConfigurationService {
  private defaultConfig: UserAgentConfiguration = {
    tools: [
      // Connection Tools
      { name: 'connect_to_snowflake', enabled: true, category: 'connection' },
      { name: 'get_current_context', enabled: true, category: 'connection' },
      
      // Database Tools
      { name: 'get_databases', enabled: true, category: 'database' },
      { name: 'select_database', enabled: true, category: 'database' },
      { name: 'get_schemas', enabled: true, category: 'database' },
      { name: 'select_schema', enabled: true, category: 'database' },
      { name: 'get_tables', enabled: true, category: 'database' },
      { name: 'describe_table', enabled: true, category: 'database' },
      
      // Query Tools
      { name: 'generate_sql', enabled: true, category: 'query' },
      { name: 'execute_sql', enabled: true, category: 'query' },
      { name: 'generate_summary', enabled: true, category: 'analysis' },
      
      // Stage Tools
      { name: 'get_stages', enabled: true, category: 'stage' },
      { name: 'select_stage', enabled: true, category: 'stage' },
      { name: 'get_yaml_files', enabled: true, category: 'stage' },
      { name: 'load_yaml_file', enabled: true, category: 'stage' },
      { name: 'get_yaml_content', enabled: true, category: 'stage' },
      
      // Visualization Tools
      { name: 'visualize_data', enabled: true, category: 'visualization' },
      { name: 'get_visualization_suggestions', enabled: true, category: 'visualization' },
      { name: 'save_visualization', enabled: true, category: 'visualization' },
    ],
    agents: [
      {
        id: 'query',
        name: 'Query Agent',
        agentType: 'query',
        description: 'Natural language to SQL query processing with Snowflake integration',
        enabled: true,
        tools: [
          'connect_to_snowflake', 'get_current_context', 'get_databases', 'select_database',
          'get_schemas', 'select_schema', 'get_tables', 'describe_table', 'generate_sql',
          'execute_sql', 'generate_summary', 'get_stages', 'select_stage', 'get_yaml_files',
          'load_yaml_file', 'get_yaml_content', 'visualize_data', 'get_visualization_suggestions'
        ],
        context: {
          maxHistory: 10,
          retainSession: true,
          autoExecute: true
        }
      },
      {
        id: 'ontology',
        name: 'Ontology Agent',
        agentType: 'ontology',
        description: 'Semantic data modeling and YAML dictionary management',
        enabled: true,
        tools: [
          'connect_to_snowflake', 'get_current_context', 'get_databases', 'select_database',
          'get_schemas', 'select_schema', 'get_tables', 'describe_table', 'get_stages',
          'select_stage', 'get_yaml_files', 'load_yaml_file', 'get_yaml_content',
          'generate_sql', 'execute_sql', 'generate_summary'
        ],
        context: {
          maxHistory: 15,
          retainSession: true,
          autoExecute: false
        }
      },
      {
        id: 'dashboards',
        name: 'Dashboard Agent',
        agentType: 'dashboards',
        description: 'Interactive visualization and dashboard creation',
        enabled: true,
        tools: [
          'connect_to_snowflake', 'get_current_context', 'generate_sql', 'execute_sql',
          'visualize_data', 'get_visualization_suggestions', 'save_visualization', 'generate_summary'
        ],
        context: {
          maxHistory: 8,
          retainSession: true,
          autoExecute: true
        }
      },
      {
        id: 'general',
        name: 'General Assistant',
        agentType: 'general',
        description: 'General platform guidance and support',
        enabled: true,
        tools: [
          'get_current_context', 'connect_to_snowflake', 'get_databases', 'get_schemas',
          'get_tables', 'generate_summary'
        ],
        context: {
          maxHistory: 6,
          retainSession: false,
          autoExecute: false
        }
      }
    ]
  };

  /**
   * Get user configuration from request headers
   * In production, this would come from database or session
   */
  getUserConfiguration(userId: string, headers?: any): UserAgentConfiguration {
    try {
      // Check if configuration was passed in headers from frontend
      const configHeader = headers?.['x-agent-config'];
      if (configHeader) {
        const parsed = JSON.parse(decodeURIComponent(configHeader));
        return { ...this.defaultConfig, ...parsed };
      }
    } catch (error) {
      console.log('Failed to parse agent configuration from headers, using defaults');
    }
    return this.defaultConfig;
  }

  /**
   * Get available tools for a specific agent type based on user configuration
   */
  getAvailableToolsForAgent(agentType: string, userConfig: UserAgentConfiguration): FunctionToolDefinition[] {
    const agent = userConfig.agents.find(a => a.agentType === agentType);
    if (!agent || !agent.enabled) {
      return [];
    }

    const enabledToolNames = new Set(
      agent.tools.filter(toolName => {
        const toolConfig = userConfig.tools.find(t => t.name === toolName);
        return toolConfig?.enabled !== false; // Default to enabled if not specified
      })
    );
    return enhancedFunctionTools.filter(tool => enabledToolNames.has(tool.name));
  }

  /**
   * Get agent configuration for a specific agent type
   */
  getAgentConfig(agentType: string, userConfig: UserAgentConfiguration): AgentConfig | null {
    const agent = userConfig.agents.find(a => a.agentType === agentType);
    return agent && agent.enabled ? agent : null;
  }

  /**
   * Get dynamic agent instructions based on configuration
   */
  getAgentInstructions(agentType: string, userConfig: UserAgentConfiguration): string {
    const agent = this.getAgentConfig(agentType, userConfig);
    if (!agent) {
      return 'This agent is currently disabled.';
    }

    const availableTools = this.getAvailableToolsForAgent(agentType, userConfig);
    const toolList = availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    switch (agentType) {
      case 'query':
        return `You are a Snowflake Query Assistant that helps users interact with their Snowflake data using natural language.

Your capabilities are configured by the user and include the following tools:

${toolList}

Context Settings:
- Max History: ${agent.context.maxHistory} messages
- Retain Session: ${agent.context.retainSession ? 'Yes' : 'No'}
- Auto Execute: ${agent.context.autoExecute ? 'Yes' : 'No'}

BEHAVIORAL GUIDELINES:
- Always consider the context of your previous message when interpreting user responses
- When you present options/lists to users, remember what you just showed them
- Be proactive in using tools when users give clear directives or selections
- If a user gives a brief response, consider it in context of what you just presented
- Don't ask for clarification if the user's intent is clear from context

Use the available tools to help users accomplish their goals efficiently.`;

      case 'ontology':
        return `You are an Ontology and Semantic Modeling Agent that helps users create and manage data dictionaries and semantic models.

Your capabilities are configured by the user and include the following tools:

${toolList}

Context Settings:
- Max History: ${agent.context.maxHistory} messages
- Retain Session: ${agent.context.retainSession ? 'Yes' : 'No'}
- Auto Execute: ${agent.context.autoExecute ? 'Yes' : 'No'}

Focus on:
- Creating and managing YAML data dictionaries
- Defining semantic relationships between data elements
- Building ontological models for data understanding
- Helping users structure their data semantically

Use the available tools to help users build comprehensive data models.`;

      case 'dashboards':
        return `You are a Dashboard and Visualization Agent that helps users create interactive dashboards and visualizations.

Your capabilities are configured by the user and include the following tools:

${toolList}

Context Settings:
- Max History: ${agent.context.maxHistory} messages
- Retain Session: ${agent.context.retainSession ? 'Yes' : 'No'}
- Auto Execute: ${agent.context.autoExecute ? 'Yes' : 'No'}

Focus on:
- Creating effective data visualizations
- Building interactive dashboards
- Suggesting appropriate chart types for data
- Optimizing visual design for insights

Use the available tools to help users create compelling data visualizations.`;

      default:
        return `You are a general assistant with access to the following tools:

${toolList}

Context Settings:
- Max History: ${agent.context.maxHistory} messages
- Retain Session: ${agent.context.retainSession ? 'Yes' : 'No'}
- Auto Execute: ${agent.context.autoExecute ? 'Yes' : 'No'}

Provide helpful guidance and support using the available tools.`;
    }
  }
}

export const agentConfigurationService = new AgentConfigurationService();