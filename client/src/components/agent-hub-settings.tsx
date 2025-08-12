import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, Code, Brain, MessageSquare, Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface FunctionTool {
  name: string;
  description: string;
  category: 'connection' | 'database' | 'query' | 'stage' | 'visualization' | 'analysis';
  enabled: boolean;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
    };
  };
}

interface AgentPrompt {
  id: string;
  name: string;
  type: 'system' | 'user' | 'assistant';
  content: string;
  agentTypes: string[];
  enabled: boolean;
}

interface AgentConfig {
  id: string;
  name: string;
  type: 'query' | 'ontology' | 'dashboards' | 'general';
  description: string;
  enabled: boolean;
  tools: string[];
  prompts: string[];
  prompt?: string; // Single linked prompt for the agent
  mentions: string[];
  context: {
    maxHistory: number;
    retainSession: boolean;
    autoExecute: boolean;
  };
}

interface AgentHubSettingsProps {
  userId: string;
}

export function AgentHubSettings({ userId }: AgentHubSettingsProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'prompts' | 'agents' | 'mentions'>('tools');

  // Load saved configuration
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['/api/agent-config', userId],
    enabled: !!userId
  });
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Complete function ecosystem based on CLI structure
  const [functionTools, setFunctionTools] = useState<FunctionTool[]>([
    // Connection Functions
    {
      name: 'connect_to_snowflake',
      description: 'Establish connection to Snowflake database',
      category: 'connection',
      enabled: true,
      parameters: {
        account: { type: 'string', description: 'Snowflake account identifier', required: false },
        database: { type: 'string', description: 'Default database name', required: false }
      }
    },
    {
      name: 'get_current_context',
      description: 'Get current agent context and connection state',
      category: 'connection',
      enabled: true,
      parameters: {}
    },
    
    // Database Functions
    {
      name: 'get_databases',
      description: 'List available databases in Snowflake',
      category: 'database',
      enabled: true,
      parameters: {}
    },
    {
      name: 'select_database',
      description: 'Select a specific database to work with',
      category: 'database',
      enabled: true,
      parameters: {
        database_name: { type: 'string', description: 'Name of the database to select', required: true }
      }
    },
    {
      name: 'get_schemas',
      description: 'List schemas in the current database',
      category: 'database',
      enabled: true,
      parameters: {
        database_name: { type: 'string', description: 'Database name (optional)', required: false }
      }
    },
    {
      name: 'select_schema',
      description: 'Select a specific schema to work with',
      category: 'database',
      enabled: true,
      parameters: {
        schema_name: { type: 'string', description: 'Name of the schema to select', required: true }
      }
    },
    {
      name: 'get_tables',
      description: 'List tables in the current database and schema',
      category: 'database',
      enabled: true,
      parameters: {}
    },
    {
      name: 'describe_table',
      description: 'Get detailed table structure and column information',
      category: 'database',
      enabled: true,
      parameters: {
        table_name: { type: 'string', description: 'Name of the table to describe', required: true }
      }
    },
    
    // Metadata Functions (from CLI metadata_functions.py)
    {
      name: 'get_table_metadata',
      description: 'Get comprehensive table metadata including statistics',
      category: 'database',
      enabled: false,
      parameters: {
        table_name: { type: 'string', description: 'Table name', required: true },
        include_stats: { type: 'boolean', description: 'Include table statistics', required: false }
      }
    },
    {
      name: 'get_column_profile',
      description: 'Get detailed column profiling information',
      category: 'database',
      enabled: false,
      parameters: {
        table_name: { type: 'string', description: 'Table name', required: true },
        column_name: { type: 'string', description: 'Column name', required: true }
      }
    },
    
    // Query Functions
    {
      name: 'generate_sql',
      description: 'Convert natural language to SQL queries using LLM',
      category: 'query',
      enabled: true,
      parameters: {
        query: { type: 'string', description: 'Natural language query', required: true },
        context: { type: 'string', description: 'Additional context for SQL generation', required: false }
      }
    },
    {
      name: 'execute_sql',
      description: 'Execute SQL queries on Snowflake and return results',
      category: 'query',
      enabled: true,
      parameters: {
        sql: { type: 'string', description: 'SQL query to execute', required: true }
      }
    },
    {
      name: 'explain_query',
      description: 'Get execution plan and performance analysis for SQL queries',
      category: 'query',
      enabled: false,
      parameters: {
        sql: { type: 'string', description: 'SQL query to explain', required: true }
      }
    },
    {
      name: 'optimize_query',
      description: 'Suggest optimizations for SQL queries',
      category: 'query',
      enabled: false,
      parameters: {
        sql: { type: 'string', description: 'SQL query to optimize', required: true }
      }
    },
    
    // Stage Functions
    {
      name: 'get_stages',
      description: 'List available stages in current database/schema',
      category: 'stage',
      enabled: true,
      parameters: {}
    },
    {
      name: 'select_stage',
      description: 'Select a specific stage to work with',
      category: 'stage',
      enabled: true,
      parameters: {
        stage_name: { type: 'string', description: 'Name of the stage to select', required: true }
      }
    },
    {
      name: 'list_stage_files',
      description: 'List files in the selected stage',
      category: 'stage',
      enabled: false,
      parameters: {
        path: { type: 'string', description: 'Path within stage (optional)', required: false }
      }
    },
    {
      name: 'upload_to_stage',
      description: 'Upload files to Snowflake stage',
      category: 'stage',
      enabled: false,
      parameters: {
        local_file: { type: 'string', description: 'Local file path', required: true },
        stage_path: { type: 'string', description: 'Stage destination path', required: false }
      }
    },
    
    // Dictionary Functions
    {
      name: 'get_yaml_files',
      description: 'List YAML dictionary files in current stage',
      category: 'stage',
      enabled: true,
      parameters: {}
    },
    {
      name: 'load_yaml_file',
      description: 'Load and parse YAML data dictionary files',
      category: 'stage',
      enabled: true,
      parameters: {
        filename: { type: 'string', description: 'YAML filename to load', required: true }
      }
    },
    {
      name: 'get_yaml_content',
      description: 'View currently loaded YAML dictionary content',
      category: 'stage',
      enabled: true,
      parameters: {}
    },
    {
      name: 'validate_yaml_schema',
      description: 'Validate YAML dictionary against schema',
      category: 'stage',
      enabled: false,
      parameters: {
        filename: { type: 'string', description: 'YAML filename to validate', required: true }
      }
    },
    {
      name: 'create_yaml_dictionary',
      description: 'Create new YAML data dictionary from table schema',
      category: 'stage',
      enabled: false,
      parameters: {
        table_name: { type: 'string', description: 'Source table name', required: true },
        output_filename: { type: 'string', description: 'Output YAML filename', required: true }
      }
    },
    
    // Visualization Functions
    {
      name: 'visualize_data',
      description: 'Create LLM-powered interactive visualizations',
      category: 'visualization',
      enabled: true,
      parameters: {
        user_request: { type: 'string', description: 'Visualization request description', required: false }
      }
    },
    {
      name: 'get_visualization_suggestions',
      description: 'Get AI suggestions for chart types based on data',
      category: 'visualization',
      enabled: true,
      parameters: {}
    },
    {
      name: 'create_dashboard',
      description: 'Create multi-chart dashboard from query results',
      category: 'visualization',
      enabled: false,
      parameters: {
        dashboard_name: { type: 'string', description: 'Dashboard name', required: true },
        chart_configs: { type: 'array', description: 'Array of chart configurations', required: true }
      }
    },
    {
      name: 'export_visualization',
      description: 'Export visualizations to various formats',
      category: 'visualization',
      enabled: false,
      parameters: {
        format: { type: 'string', description: 'Export format (png, pdf, html)', required: true },
        chart_id: { type: 'string', description: 'Chart identifier', required: true }
      }
    },
    
    // Analysis Functions
    {
      name: 'generate_summary',
      description: 'Generate AI-powered analysis and insights from query results',
      category: 'analysis',
      enabled: true,
      parameters: {
        user_query: { type: 'string', description: 'Original user question', required: false }
      }
    },
    {
      name: 'detect_anomalies',
      description: 'Detect data anomalies and outliers in query results',
      category: 'analysis',
      enabled: false,
      parameters: {
        sensitivity: { type: 'number', description: 'Anomaly detection sensitivity (0.1-1.0)', required: false }
      }
    },
    {
      name: 'correlation_analysis',
      description: 'Perform correlation analysis on numeric columns',
      category: 'analysis',
      enabled: false,
      parameters: {
        columns: { type: 'array', description: 'Columns to analyze', required: false }
      }
    },
    {
      name: 'time_series_analysis',
      description: 'Analyze time series patterns and trends',
      category: 'analysis',
      enabled: false,
      parameters: {
        date_column: { type: 'string', description: 'Date/time column name', required: true },
        value_column: { type: 'string', description: 'Value column name', required: true }
      }
    }
  ]);

  const [agentPrompts, setAgentPrompts] = useState<AgentPrompt[]>([
    {
      id: 'query-system',
      name: 'Query Agent System Prompt',
      type: 'system',
      content: 'You are a Snowflake Query Assistant that helps users interact with their data using natural language. Focus on accurate SQL generation, data analysis, and intelligent insights. Use available function tools to navigate databases, execute queries, and provide comprehensive analysis.',
      agentTypes: ['query'],
      enabled: true
    },
    {
      id: 'ontology-system',
      name: 'Ontology Agent System Prompt', 
      type: 'system',
      content: 'You are an Ontology Agent that helps with semantic data modeling and YAML dictionary management. Focus on data relationships, structure discovery, and creating comprehensive data dictionaries. Guide users through ontology design and semantic modeling best practices.',
      agentTypes: ['ontology'],
      enabled: true
    },
    {
      id: 'dashboard-system',
      name: 'Dashboard Agent System Prompt',
      type: 'system',
      content: 'You are a Dashboard Agent specialized in creating interactive visualizations and dashboards. Help users transform their data into compelling visual stories with appropriate chart types, layouts, and interactive features.',
      agentTypes: ['dashboards'],
      enabled: true
    },
    {
      id: 'general-system',
      name: 'General Assistant System Prompt',
      type: 'system',
      content: 'You are a helpful DataMind platform assistant. Guide users through the platform, explain features, and direct them to appropriate specialized agents when needed. Maintain a friendly, professional tone.',
      agentTypes: ['general'],
      enabled: true
    }
  ]);

  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([
    {
      id: 'query-agent',
      name: 'Query Agent',
      type: 'query',
      description: 'Natural language to SQL query processing with Snowflake integration',
      enabled: true,
      tools: [
        'connect_to_snowflake', 'get_current_context', 'get_databases', 'select_database', 
        'get_schemas', 'select_schema', 'get_tables', 'describe_table', 'get_table_metadata',
        'get_column_profile', 'generate_sql', 'execute_sql', 'explain_query', 'optimize_query',
        'generate_summary', 'detect_anomalies', 'correlation_analysis', 'time_series_analysis'
      ],
      prompts: ['query-system'],
      mentions: ['@query', '@sql', '@data', '@analyze'],
      context: {
        maxHistory: 10,
        retainSession: true,
        autoExecute: true
      }
    },
    {
      id: 'ontology-agent',
      name: 'Ontology Agent',
      type: 'ontology',
      description: 'Semantic data modeling and YAML dictionary management',
      enabled: true,
      tools: [
        'connect_to_snowflake', 'get_current_context', 'get_databases', 'select_database',
        'get_schemas', 'select_schema', 'get_stages', 'select_stage', 'list_stage_files',
        'get_yaml_files', 'load_yaml_file', 'get_yaml_content', 'validate_yaml_schema',
        'create_yaml_dictionary', 'get_tables', 'describe_table'
      ],
      prompts: ['ontology-system'],
      mentions: ['@ontology', '@yaml', '@model', '@semantic', '@dictionary'],
      context: {
        maxHistory: 15,
        retainSession: true,
        autoExecute: false
      }
    },
    {
      id: 'dashboard-agent',
      name: 'Dashboard Agent',
      type: 'dashboards',
      description: 'Interactive dashboard and visualization creation and management',
      enabled: true,
      tools: [
        'connect_to_snowflake', 'get_current_context', 'execute_sql', 'visualize_data',
        'get_visualization_suggestions', 'create_dashboard', 'export_visualization',
        'generate_summary'
      ],
      prompts: ['dashboard-system'],
      mentions: ['@dashboard', '@chart', '@visualize', '@plot'],
      context: {
        maxHistory: 8,
        retainSession: true,
        autoExecute: true
      }
    },
    {
      id: 'general-agent',
      name: 'General Assistant',
      type: 'general',
      description: 'General conversational AI for platform navigation and guidance',
      enabled: true,
      tools: [
        'get_current_context', 'connect_to_snowflake', 'get_databases', 'get_schemas',
        'get_tables', 'generate_summary'
      ],
      prompts: ['general-system'],
      mentions: ['@help', '@assistant', '@general'],
      context: {
        maxHistory: 5,
        retainSession: false,
        autoExecute: false
      }
    }
  ]);

  // Update state when saved configuration loads
  useEffect(() => {
    if (savedConfig) {
      console.log('Loading saved configuration:', savedConfig);
      if (savedConfig.functionTools?.length > 0) {
        setFunctionTools(savedConfig.functionTools);
      }
      if (savedConfig.agentPrompts?.length > 0) {
        setAgentPrompts(savedConfig.agentPrompts);
      }
      if (savedConfig.agentConfigs?.length > 0) {
        setAgentConfigs(savedConfig.agentConfigs);
      }
    }
  }, [savedConfig]);

  const categoryColors = {
    connection: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    database: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    query: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    stage: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    visualization: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    analysis: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  };

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (config: { functionTools: FunctionTool[], agentPrompts: AgentPrompt[], agentConfigs: AgentConfig[] }) => {
      console.log('Saving configuration:', config);
      console.log('Agent configs in detail:', JSON.stringify(config.agentConfigs, null, 2));
      const response = await apiRequest('PUT', `/api/agent-config/${userId}`, config);
      console.log('Save response:', response);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Save successful:', data);
      toast({
        title: "Configuration saved",
        description: "Agent configuration has been successfully saved.",
      });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: `Failed to save configuration: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const saveConfiguration = () => {
    saveConfigMutation.mutate({
      functionTools,
      agentPrompts,
      agentConfigs
    });
  };

  const toggleToolEnabled = (toolName: string) => {
    setFunctionTools(prev => 
      prev.map(tool => 
        tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool
      )
    );
    
    // Auto-save after a short delay
    setTimeout(saveConfiguration, 500);
  };

  const togglePromptEnabled = (promptId: string) => {
    setAgentPrompts(prev =>
      prev.map(prompt =>
        prompt.id === promptId ? { ...prompt, enabled: !prompt.enabled } : prompt
      )
    );
    
    // Auto-save after a short delay
    setTimeout(saveConfiguration, 500);
  };

  const toggleAgentEnabled = (agentId: string) => {
    setAgentConfigs(prev =>
      prev.map(agent =>
        agent.id === agentId ? { ...agent, enabled: !agent.enabled } : agent
      )
    );
    
    // Auto-save after a short delay
    setTimeout(saveConfiguration, 500);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-sm font-semibold">Agent Hub Configuration</h2>
        </div>
        

      </div>
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools" className="flex items-center space-x-2">
            <Code className="h-4 w-4" />
            <span>Tools</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Agents</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-title">Function Tools</CardTitle>
              <CardDescription className="text-caption">
                Manage available function tools that agents can use to interact with data sources and perform operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {functionTools.map((tool) => (
                  <Card key={tool.name} className={`border-l-4 ${tool.enabled ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                    <CardContent className="pt-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-subtitle">{tool.name}</h4>
                            <Badge className="inline-flex items-center rounded border px-1 py-0 font-normal transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 border-transparent hover:bg-primary/80 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-[12px]">
                              {tool.category}
                            </Badge>
                            <Switch
                              checked={tool.enabled}
                              onCheckedChange={() => toggleToolEnabled(tool.name)}
                            />
                          </div>
                          <p className="text-caption">{tool.description}</p>
                          
                          {editingTool === tool.name ? (
                            <div className="space-y-2 mt-3">
                              <Label>Parameters</Label>
                              <div className="bg-muted p-3 rounded text-xs font-mono">
                                <pre>{JSON.stringify(tool.parameters, null, 2)}</pre>
                              </div>
                              <div className="flex space-x-2">
                                <Button size="sm" onClick={() => setEditingTool(null)}>
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingTool(null)}>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex space-x-2 mt-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingTool(tool.name)} className="text-[12px]">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-title">Prompt Library</CardTitle>
                  <CardDescription className="text-caption">
                    Configure system and user prompts that define agent behavior and capabilities.
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prompt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPrompts.map((prompt) => (
                  <Card key={prompt.id} className={`border-l-4 ${prompt.enabled ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-subtitle">{prompt.name}</h4>
                            <Badge variant={prompt.type === 'system' ? 'default' : 'secondary'}>
                              {prompt.type}
                            </Badge>
                            <Switch
                              checked={prompt.enabled}
                              onCheckedChange={() => togglePromptEnabled(prompt.id)}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingPrompt(prompt.id)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {prompt.agentTypes.map((agentType) => (
                            <Badge key={agentType} variant="outline" className="text-xs">
                              {agentType}
                            </Badge>
                          ))}
                        </div>

                        {editingPrompt === prompt.id ? (
                          <div className="space-y-3">
                            <div>
                              <Label>Prompt Content</Label>
                              <Textarea 
                                value={prompt.content}
                                className="mt-1 min-h-[100px]"
                                onChange={(e) => {
                                  setAgentPrompts(prev =>
                                    prev.map(p =>
                                      p.id === prompt.id ? { ...p, content: e.target.value } : p
                                    )
                                  );
                                }}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => setEditingPrompt(null)}>
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPrompt(null)}>
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {prompt.content}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-title">Agent Configuration</CardTitle>
                  <CardDescription className="text-caption">
                    Configure agent types, their assigned tools, prompts, and behavior settings.
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Agent
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentConfigs.map((agent) => (
                  <Card key={agent.id} className={`border-l-4 ${agent.enabled ? 'border-l-purple-500' : 'border-l-gray-300'}`}>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-subtitle">{agent.name}</h4>
                            <Badge>{agent.type}</Badge>
                            <Switch
                              checked={agent.enabled}
                              onCheckedChange={() => toggleAgentEnabled(agent.id)}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingAgent(agent.id)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-caption">{agent.description}</p>

                        {editingAgent === agent.id ? (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Assigned Tools ({agent.tools.length})</Label>
                              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                                {functionTools.map((tool) => (
                                  <div key={tool.name} className="flex items-center space-x-2">
                                    <Switch
                                      checked={agent.tools.includes(tool.name)}
                                      onCheckedChange={(checked) => {
                                        setAgentConfigs(prev =>
                                          prev.map(a =>
                                            a.id === agent.id
                                              ? {
                                                  ...a,
                                                  tools: checked
                                                    ? [...a.tools, tool.name]
                                                    : a.tools.filter(t => t !== tool.name)
                                                }
                                              : a
                                          )
                                        );
                                      }}
                                    />
                                    <span className="text-sm">{tool.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>@Mention</Label>
                              <div className="mt-2 space-y-3">
                                <div>
                                  <Label className="text-xs">Primary Mention</Label>
                                  <Input
                                    value={agent.mentions[0] || ''}
                                    placeholder="@agent"
                                    className="h-8"
                                    onChange={(e) => {
                                      setAgentConfigs(prev =>
                                        prev.map(a =>
                                          a.id === agent.id
                                            ? {
                                                ...a,
                                                mentions: [e.target.value]
                                              }
                                            : a
                                        )
                                      );
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Linked Prompt</Label>
                                  <Select
                                    value={agent.prompt || ''}
                                    onValueChange={(value) => {
                                      setAgentConfigs(prev =>
                                        prev.map(a =>
                                          a.id === agent.id
                                            ? { ...a, prompt: value }
                                            : a
                                        )
                                      );
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select prompt" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {agentPrompts.map((prompt) => (
                                        <SelectItem key={prompt.id} value={prompt.id}>
                                          {prompt.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label>Context Settings</Label>
                              <div className="mt-2 space-y-3">
                                <div>
                                  <Label className="text-xs">Max History</Label>
                                  <Input
                                    type="number"
                                    value={agent.context.maxHistory}
                                    className="h-8"
                                    onChange={(e) => {
                                      setAgentConfigs(prev =>
                                        prev.map(a =>
                                          a.id === agent.id
                                            ? {
                                                ...a,
                                                context: { ...a.context, maxHistory: parseInt(e.target.value) }
                                              }
                                            : a
                                        )
                                      );
                                    }}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={agent.context.retainSession}
                                    onCheckedChange={(checked) => {
                                      setAgentConfigs(prev =>
                                        prev.map(a =>
                                          a.id === agent.id
                                            ? {
                                                ...a,
                                                context: { ...a.context, retainSession: checked }
                                              }
                                            : a
                                        )
                                      );
                                    }}
                                  />
                                  <Label className="text-xs">Retain Session</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={agent.context.autoExecute}
                                    onCheckedChange={(checked) => {
                                      setAgentConfigs(prev =>
                                        prev.map(a =>
                                          a.id === agent.id
                                            ? {
                                                ...a,
                                                context: { ...a.context, autoExecute: checked }
                                              }
                                            : a
                                        )
                                      );
                                    }}
                                  />
                                  <Label className="text-xs">Auto Execute</Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Tools:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {agent.tools.slice(0, 3).map((tool) => (
                                  <Badge key={tool} variant="outline" className="text-xs">
                                    {tool}
                                  </Badge>
                                ))}
                                {agent.tools.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{agent.tools.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Mention:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {agent.mentions[0] && (
                                  <Badge variant="secondary" className="text-xs">
                                    {agent.mentions[0]}
                                  </Badge>
                                )}
                              </div>
                              {agent.prompt && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">Prompt: </span>
                                  <Badge variant="outline" className="text-xs">
                                    {agentPrompts.find(p => p.id === agent.prompt)?.name || 'Unknown'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Context:</span>
                              <div className="text-xs text-muted-foreground mt-1">
                                History: {agent.context.maxHistory} | 
                                Session: {agent.context.retainSession ? 'Yes' : 'No'} | 
                                Auto: {agent.context.autoExecute ? 'Yes' : 'No'}
                              </div>
                            </div>
                          </div>
                        )}

                        {editingAgent === agent.id && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                saveConfiguration();
                                setEditingAgent(null);
                              }}
                              disabled={saveConfigMutation.isPending}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {saveConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAgent(null)}>
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}