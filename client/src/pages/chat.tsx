import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, MessageSquare, Home, Database, ChevronLeft, ChevronRight, Minimize2, Maximize2, X, Zap, BookOpen, Settings, Cloud, Link, Send, GraduationCap, ChevronDown, Upload, Plus, Play, Save, Eye, Edit3 } from 'lucide-react';

// Type definitions for messages
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
  createdAt: string;
}

export default function ChatPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'studio' | 'trainings' | 'settings'>('dashboard');
  const [agentMode, setAgentMode] = useState<'model' | 'query' | 'dashboard'>('query');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(false);
  const [isAssistantFullscreen, setIsAssistantFullscreen] = useState(false);


  
  const userId = 'user_1';

  const { data: sessions } = useQuery({
    queryKey: ['/api/sessions', userId],
    enabled: !!userId,
  });

  // Load messages for current session
  const { data: sessionMessages } = useQuery({
    queryKey: ['/api/sessions', currentSessionId, 'messages'],
    enabled: !!currentSessionId,
  });

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!currentSessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({
        type: 'join_session',
        sessionId: currentSessionId
      }));
    };

    socket.onclose = () => setIsConnected(false);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message_saved') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'agent_response') {
        setMessages(prev => [...prev, data.message]);
        setIsLoading(false);
      } else if (data.type === 'agent_typing') {
        setIsLoading(data.isTyping);
      }
    };

    return () => socket.close();
  }, [currentSessionId]);

  // Create initial session
  useEffect(() => {
    if (!currentSessionId && userId) {
      createNewSession();
    }
  }, [userId]);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, agentType: 'query' })
      });
      if (response.ok) {
        const session = await response.json();
        setCurrentSessionId(session.id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // Context-aware mode detection based on navigation + input content
  const detectContextMode = (input: string): 'model' | 'query' | 'dashboard' => {
    const lowerInput = input.toLowerCase();
    
    // First, consider the current navigation context
    if (currentView === 'dashboard') {
      // In dashboard view, prioritize visualization modes
      if (lowerInput.includes('chart') || lowerInput.includes('graph') || 
          lowerInput.includes('visualiz') || lowerInput.includes('plot') ||
          lowerInput.includes('bar chart') || lowerInput.includes('line chart') || 
          lowerInput.includes('pie chart') || lowerInput.includes('show me')) {
        return 'dashboard';
      }
      // SQL queries in dashboard context still go to query mode
      if (lowerInput.includes('select') || lowerInput.includes('from') ||
          lowerInput.includes('where') || lowerInput.includes('sql') ||
          lowerInput.includes('database') || lowerInput.includes('table')) {
        return 'query';
      }
      // Default to dashboard mode when in dashboard view
      return 'dashboard';
    }
    
    if (currentView === 'studio') {
      // In studio view, prioritize query/development modes
      if (lowerInput.includes('select') || lowerInput.includes('from') ||
          lowerInput.includes('where') || lowerInput.includes('sql') ||
          lowerInput.includes('query') || lowerInput.includes('database') ||
          lowerInput.includes('table') || lowerInput.includes('count') ||
          lowerInput.includes('sum') || lowerInput.includes('group by')) {
        return 'query';
      }
      // Visualization requests in studio can still go to dashboard
      if (lowerInput.includes('chart') || lowerInput.includes('graph') || 
          lowerInput.includes('visualiz') || lowerInput.includes('plot')) {
        return 'dashboard';
      }
      // Default to query mode when in studio view
      return 'query';
    }
    
    // Fallback to model for general conversation
    return 'model';
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading || !currentSessionId) return;
    
    const messageContent = chatInput.trim();
    
    // Auto-detect context and set mode
    const detectedMode = detectContextMode(messageContent);
    setAgentMode(detectedMode);
    
    setChatInput('');
    setIsLoading(true);

    // Send message via WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'chat_message',
        sessionId: currentSessionId,
        content: messageContent,
        agentType: detectedMode === 'query' ? 'query' : 'yaml',
        userId: userId
      }));
      socket.close();
    };
  };

  const handleAssistantToggle = () => {
    if (isAssistantMinimized) {
      // Minimized -> Normal
      setIsAssistantMinimized(false);
      setIsAssistantFullscreen(false);
    } else if (!isAssistantFullscreen) {
      // Normal -> Fullscreen
      setIsAssistantFullscreen(true);
    } else {
      // Fullscreen -> Minimized
      setIsAssistantFullscreen(false);
      setIsAssistantMinimized(true);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Left Sidebar */}
      <div className={`${isLeftSidebarCollapsed ? 'w-16' : 'w-48'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isLeftSidebarCollapsed && (
            <h1 className="text-lg font-semibold text-gray-900">DataMind</h1>
          )}
          <button
            onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isLeftSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Dashboard' : ''}
            >
              <Home className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>dashboard</span>}
            </button>
            
            <button
              onClick={() => setCurrentView('studio')}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'studio'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Studio' : ''}
            >
              <Database className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>models</span>}
            </button>

            <button
              onClick={() => setCurrentView('trainings')}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'trainings'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Trainings' : ''}
            >
              <GraduationCap className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>trainings</span>}
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'settings'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Settings' : ''}
            >
              <Settings className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>settings</span>}
            </button>
          </div>
          
          {/* Separator */}
          <div className="border-t border-gray-200 my-4"></div>
          
          {/* Chat Section */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setIsAssistantFullscreen(true);
                setIsAssistantMinimized(false);
              }}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
              title={isLeftSidebarCollapsed ? 'New Chat' : ''}
            >
              <MessageSquare className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>new chat</span>}
            </button>
          </div>
        </nav>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentView === 'dashboard' ? (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
              <p className="text-gray-600">Analytics and visualizations overview</p>
            </div>
            
            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sample Chart 1 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Performance</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chart visualization would appear here</p>
                    <p className="text-sm mt-1">Connect to data source to populate</p>
                  </div>
                </div>
              </div>

              {/* Sample Chart 2 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chart visualization would appear here</p>
                    <p className="text-sm mt-1">Connect to data source to populate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'studio' ? (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Studio</h2>
              <p className="text-gray-600">Data exploration and analysis workspace</p>
            </div>
            
            {/* Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* YAML Editor */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">YAML Editor</h3>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                      Save
                    </button>
                    <button className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="h-96 border border-gray-200 rounded-md">
                  <textarea
                    className="w-full h-full p-4 font-mono text-sm bg-gray-50 border-none rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="# Enter your YAML configuration here
version: '1.0'
data_sources:
  - name: 'sales_data'
    type: 'database'
    connection:
      host: 'localhost'
      port: 5432
      database: 'sales_db'
  
transformations:
  - name: 'clean_sales'
    type: 'filter'
    conditions:
      - column: 'amount'
        operator: '>'
        value: 0
        
outputs:
  - name: 'dashboard_data'
    type: 'visualization'
    chart_type: 'bar_chart'"
                    spellCheck={false}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>YAML syntax highlighting enabled</span>
                  <span>Auto-save: OFF</span>
                </div>
              </div>

              {/* YAML Preview/Validation */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Validation & Preview</h3>
                  <button className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                    Validate
                  </button>
                </div>
                
                {/* Validation Status */}
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-800">YAML is valid</span>
                  </div>
                </div>

                {/* Schema Info */}
                <div className="space-y-3">
                  <div className="border-b border-gray-200 pb-2">
                    <h4 className="text-sm font-medium text-gray-900">Schema Information</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data Sources:</span>
                      <span className="font-medium">1 configured</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transformations:</span>
                      <span className="font-medium">1 configured</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outputs:</span>
                      <span className="font-medium">1 configured</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full p-2 text-left text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50">
                        Generate Data Dictionary
                      </button>
                      <button className="w-full p-2 text-left text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50">
                        Export to Pipeline
                      </button>
                      <button className="w-full p-2 text-left text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50">
                        Test Configuration
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
                  <button className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                    Refresh
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Column</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Type</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Sample</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 px-3">amount</td>
                        <td className="py-2 px-3">decimal</td>
                        <td className="py-2 px-3">1,234.56</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 px-3">date</td>
                        <td className="py-2 px-3">timestamp</td>
                        <td className="py-2 px-3">2024-01-15</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 px-3">product_id</td>
                        <td className="py-2 px-3">string</td>
                        <td className="py-2 px-3">PROD_001</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 px-3">customer_id</td>
                        <td className="py-2 px-3">string</td>
                        <td className="py-2 px-3">CUST_12345</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Showing sample data based on current YAML configuration
                </div>
              </div>

              {/* Query Builder */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Query Builder</h3>
                  <button className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                    Run Query
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Table</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>sales_data</option>
                      <option>customer_data</option>
                      <option>product_data</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">amount</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">date</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">product_id</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filters</label>
                    <div className="flex space-x-2">
                      <select className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option>amount</option>
                        <option>date</option>
                      </select>
                      <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option>&gt;</option>
                        <option>&lt;</option>
                        <option>=</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'settings' ? (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
              <p className="text-gray-600">Application settings and integrations</p>
            </div>

            {/* Settings Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button className="border-transparent text-blue-600 border-b-2 border-blue-600 py-2 px-1 text-sm font-medium">
                    Integrations
                  </button>
                  <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-1 text-sm font-medium">
                    General
                  </button>
                  <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-1 text-sm font-medium">
                    Security
                  </button>
                </nav>
              </div>
            </div>

            {/* Integrations Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Sources */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
                  <Database className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">PostgreSQL</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Connected</span>
                    </div>
                    <p className="text-xs text-gray-500">Primary database • 47 tables</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">MongoDB</span>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Setup Required</span>
                    </div>
                    <p className="text-xs text-gray-500">Document store • Not configured</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Redis</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Connected</span>
                    </div>
                    <p className="text-xs text-gray-500">Cache layer • 1.2M keys</p>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    Add Data Source
                  </button>
                </div>
              </div>

              {/* Destinations */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Destinations</h3>
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">AWS S3</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
                    </div>
                    <p className="text-xs text-gray-500">Data lake • Auto-sync enabled</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Snowflake</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">Inactive</span>
                    </div>
                    <p className="text-xs text-gray-500">Data warehouse • Needs credentials</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Elasticsearch</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
                    </div>
                    <p className="text-xs text-gray-500">Search engine • 5.7M documents</p>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    Add Destination
                  </button>
                </div>
              </div>

              {/* Connections Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Active Connections</h3>
                  <Link className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Production DB</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Live</span>
                    </div>
                    <p className="text-xs text-gray-500">Last sync: 2 minutes ago</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Analytics Warehouse</span>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Syncing</span>
                    </div>
                    <p className="text-xs text-gray-500">Last sync: 15 minutes ago</p>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    Manage Connections
                  </button>
                </div>
              </div>

              {/* Integration Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Integration Actions</h3>
                  <Zap className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Test All Connections
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Sync Data Sources
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Export Configuration
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    View Integration Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Trainings</h2>
              <p className="text-gray-600">Manage AI training data and model configurations</p>
            </div>

            {/* Trainings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Trainings */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Active Trainings</h3>
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Sales Data Model</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
                    </div>
                    <p className="text-xs text-gray-500">Last updated: 3 hours ago</p>
                    <p className="text-xs text-gray-500">Accuracy: 94.2%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Customer Insights</span>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Training</span>
                    </div>
                    <p className="text-xs text-gray-500">Last updated: 1 day ago</p>
                    <p className="text-xs text-gray-500">Progress: 67%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Revenue Forecasting</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Scheduled</span>
                    </div>
                    <p className="text-xs text-gray-500">Starts: Tomorrow 9:00 AM</p>
                    <p className="text-xs text-gray-500">Dataset: Q4 Revenue Data</p>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    Add New Training
                  </button>
                </div>
              </div>

              {/* Training Datasets */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Training Datasets</h3>
                  <Database className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium block">Historical Sales Data</span>
                      <span className="text-xs text-gray-500">2.1M records • Updated daily</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium block">Customer Behavior Data</span>
                      <span className="text-xs text-gray-500">856K records • Updated weekly</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium block">Market Trends Data</span>
                      <span className="text-xs text-gray-500">430K records • Processing</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Processing</span>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    Upload Dataset
                  </button>
                </div>
              </div>

              {/* Model Performance */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Model Performance</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Overall Accuracy</span>
                      <span className="text-sm font-medium">92.8%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '92.8%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Training Progress</span>
                      <span className="text-sm font-medium">67%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '67%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Data Quality</span>
                      <span className="text-sm font-medium">95.2%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '95.2%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Training Actions</h3>
                  <Settings className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Start New Training Session
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Evaluate Model Performance
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Export Training Results
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Schedule Automated Training
                  </button>
                  <button className="w-full p-3 text-left text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50">
                    Remove Training Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Right Assistant Sidebar */}
      {!isAssistantFullscreen && (
        <div className={`${isAssistantMinimized ? 'w-16' : 'w-80'} bg-white border-l border-gray-200 flex flex-col transition-all duration-300`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAssistantMinimized(!isAssistantMinimized)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={isAssistantMinimized ? 'Expand Assistant' : 'Minimize Assistant'}
                >
                  {isAssistantMinimized ? (
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                {!isAssistantMinimized && (
                  <h3 className="text-lg font-semibold text-gray-900">assistant</h3>
                )}
              </div>
              {!isAssistantMinimized && (
                <button
                  onClick={handleAssistantToggle}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Maximize Assistant"
                >
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

          </div>

          {isAssistantMinimized ? (
            <div className="flex-1 flex items-center justify-center py-4">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
          ) : (
            <>
              {/* Chat Area */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">Start a conversation with the assistant</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-600">
                        <span className="animate-pulse">Assistant is typing...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={handleChatSubmit} className="flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isLoading}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* Fullscreen Assistant Overlay */}
      {isAssistantFullscreen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Fullscreen Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-gray-900">Assistant - Fullscreen Mode</h3>
              <button
                onClick={handleAssistantToggle}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Minimize Assistant"
              >
                <Minimize2 className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            

          </div>

          {/* Fullscreen Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Welcome to Assistant Fullscreen Mode</h4>
                    <p className="text-gray-500">Start a conversation with enhanced workspace for detailed interactions</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl px-4 py-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-lg text-gray-600">
                      <span className="animate-pulse">Assistant is typing...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fullscreen Chat Input */}
            <div className="border-t border-gray-200 p-6">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleChatSubmit} className="flex space-x-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}