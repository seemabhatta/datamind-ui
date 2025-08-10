import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data - in real implementation, these would come from API endpoints
  const [functionTools, setFunctionTools] = useState<FunctionTool[]>([
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
      name: 'visualize_data',
      description: 'Create LLM-powered interactive visualizations',
      category: 'visualization',
      enabled: true,
      parameters: {
        user_request: { type: 'string', description: 'Visualization request description', required: false }
      }
    },
    {
      name: 'load_yaml_file',
      description: 'Load and parse YAML data dictionary files',
      category: 'stage',
      enabled: true,
      parameters: {
        filename: { type: 'string', description: 'YAML filename to load', required: true }
      }
    }
  ]);

  const [agentPrompts, setAgentPrompts] = useState<AgentPrompt[]>([
    {
      id: 'query-system',
      name: 'Query Agent System Prompt',
      type: 'system',
      content: 'You are a Snowflake Query Assistant that helps users interact with their data using natural language. Focus on accurate SQL generation and data analysis.',
      agentTypes: ['query'],
      enabled: true
    },
    {
      id: 'ontology-system',
      name: 'Ontology Agent System Prompt', 
      type: 'system',
      content: 'You are an Ontology Agent that helps with semantic data modeling and YAML dictionary management. Focus on data relationships and structure.',
      agentTypes: ['ontology'],
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
      tools: ['connect_to_snowflake', 'generate_sql', 'execute_sql', 'get_tables', 'describe_table'],
      prompts: ['query-system'],
      mentions: ['@query', '@sql', '@data'],
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
      tools: ['load_yaml_file', 'get_yaml_content', 'get_stages', 'select_stage'],
      prompts: ['ontology-system'],
      mentions: ['@ontology', '@yaml', '@model'],
      context: {
        maxHistory: 15,
        retainSession: true,
        autoExecute: false
      }
    }
  ]);

  const categoryColors = {
    connection: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    database: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    query: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    stage: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    visualization: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    analysis: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  };

  const toggleToolEnabled = (toolName: string) => {
    setFunctionTools(prev => 
      prev.map(tool => 
        tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool
      )
    );
  };

  const togglePromptEnabled = (promptId: string) => {
    setAgentPrompts(prev =>
      prev.map(prompt =>
        prompt.id === promptId ? { ...prompt, enabled: !prompt.enabled } : prompt
      )
    );
  };

  const toggleAgentEnabled = (agentId: string) => {
    setAgentConfigs(prev =>
      prev.map(agent =>
        agent.id === agentId ? { ...agent, enabled: !agent.enabled } : agent
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Agent Hub Configuration</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="mentions" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>@Mentions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Function Tools</CardTitle>
              <CardDescription>
                Manage available function tools that agents can use to interact with data sources and perform operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {functionTools.map((tool) => (
                  <Card key={tool.name} className={`border-l-4 ${tool.enabled ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium">{tool.name}</h4>
                            <Badge className={categoryColors[tool.category]}>
                              {tool.category}
                            </Badge>
                            <Switch
                              checked={tool.enabled}
                              onCheckedChange={() => toggleToolEnabled(tool.name)}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                          
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
                              <Button size="sm" variant="outline" onClick={() => setEditingTool(tool.name)}>
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

        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agent Prompts</CardTitle>
                  <CardDescription>
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
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium">{prompt.name}</h4>
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

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agent Configuration</CardTitle>
                  <CardDescription>
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
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium">{agent.name}</h4>
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

                        <p className="text-sm text-muted-foreground">{agent.description}</p>

                        {editingAgent === agent.id ? (
                          <div className="grid grid-cols-2 gap-4">
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
                              <span className="font-medium">Mentions:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {agent.mentions.map((mention) => (
                                  <Badge key={mention} variant="secondary" className="text-xs">
                                    {mention}
                                  </Badge>
                                ))}
                              </div>
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
                            <Button size="sm" onClick={() => setEditingAgent(null)}>
                              <Save className="h-3 w-3 mr-1" />
                              Save Changes
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

        <TabsContent value="mentions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>@Mention Mappings</CardTitle>
              <CardDescription>
                Configure which @mentions trigger which agents and their behavior.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentConfigs.map((agent) => (
                    <Card key={agent.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{agent.name}</h4>
                            <Badge>{agent.type}</Badge>
                          </div>
                          
                          <div>
                            <Label className="text-sm">Active @Mentions</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {agent.mentions.map((mention) => (
                                <Badge key={mention} variant="secondary" className="flex items-center space-x-1">
                                  <span>{mention}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => {
                                      setAgentConfigs(prev =>
                                        prev.map(a =>
                                          a.id === agent.id
                                            ? {
                                                ...a,
                                                mentions: a.mentions.filter(m => m !== mention)
                                              }
                                            : a
                                        )
                                      );
                                    }}
                                  >
                                    <X className="h-2 w-2" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Input 
                              placeholder="Add new @mention"
                              className="h-8"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const value = e.currentTarget.value.trim();
                                  if (value && !agent.mentions.includes(value)) {
                                    setAgentConfigs(prev =>
                                      prev.map(a =>
                                        a.id === agent.id
                                          ? { ...a, mentions: [...a.mentions, value] }
                                          : a
                                      )
                                    );
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                            <Button size="sm" variant="outline">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}