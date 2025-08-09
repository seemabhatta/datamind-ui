import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, MessageSquare, Home, Database, ChevronLeft, ChevronRight, Minimize2, Maximize2, X, Zap, BookOpen, Settings, Cloud, Link, Send, GraduationCap, ChevronDown } from 'lucide-react';

// Type definitions for messages
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
  createdAt: string;
}

export default function ChatPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'studio'>('dashboard');
  const [agentMode, setAgentMode] = useState<'model' | 'query' | 'dashboard'>('query');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(false);
  const [isAssistantFullscreen, setIsAssistantFullscreen] = useState(false);

  const [showIntegrationsDropdown, setShowIntegrationsDropdown] = useState(false);
  const [showTrainingsDropdown, setShowTrainingsDropdown] = useState(false);
  
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
              {!isLeftSidebarCollapsed && <span>studio</span>}
            </button>

            {/* Integrations Section */}
            <div className="pt-4">
              <button
                onClick={() => setShowIntegrationsDropdown(!showIntegrationsDropdown)}
                className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3 justify-between'} px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
                title={isLeftSidebarCollapsed ? 'Integrations' : ''}
              >
                <div className={`flex items-center ${isLeftSidebarCollapsed ? '' : 'space-x-3'}`}>
                  <Zap className="w-4 h-4" />
                  {!isLeftSidebarCollapsed && <span>integrations</span>}
                </div>
                {!isLeftSidebarCollapsed && (
                  <ChevronDown className={`w-4 h-4 transition-transform ${showIntegrationsDropdown ? 'rotate-180' : ''}`} />
                )}
              </button>
              
              {showIntegrationsDropdown && !isLeftSidebarCollapsed && (
                <div className="ml-4 mt-2 space-y-1">
                  {/* Sources */}
                  <div className="text-xs text-gray-500 mb-2">sources</div>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">snowflake</button>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">aws dynamo db</button>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">aws s3</button>
                  
                  {/* Connections */}
                  <div className="text-xs text-gray-500 mb-2 mt-3">connections</div>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">manage connections</button>
                  
                  {/* Destinations */}
                  <div className="text-xs text-gray-500 mb-2 mt-3">destinations</div>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">manage destinations</button>
                  
                  {/* Publish to */}
                  <div className="text-xs text-gray-500 mb-2 mt-3">publish to</div>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">power bi</button>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">google looker</button>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">data studio</button>
                </div>
              )}
            </div>

            {/* Trainings Section */}
            <div className="pt-2">
              <button
                onClick={() => setShowTrainingsDropdown(!showTrainingsDropdown)}
                className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3 justify-between'} px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
                title={isLeftSidebarCollapsed ? 'Trainings' : ''}
              >
                <div className={`flex items-center ${isLeftSidebarCollapsed ? '' : 'space-x-3'}`}>
                  <GraduationCap className="w-4 h-4" />
                  {!isLeftSidebarCollapsed && <span>trainings</span>}
                </div>
                {!isLeftSidebarCollapsed && (
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTrainingsDropdown ? 'rotate-180' : ''}`} />
                )}
              </button>
              
              {showTrainingsDropdown && !isLeftSidebarCollapsed && (
                <div className="ml-4 mt-2 space-y-1">
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">add training</button>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">remove training</button>
                  <button className="w-full text-left px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">publish trainings</button>
                </div>
              )}
            </div>
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
        ) : (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Studio</h2>
              <p className="text-gray-600">Data exploration and analysis workspace</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-96">
              <div className="h-full bg-gray-50 rounded-md flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Studio workspace</p>
                  <p className="text-sm mt-1">Data exploration tools will appear here</p>
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
              {!isAssistantMinimized && (
                <h3 className="text-lg font-semibold text-gray-900">assistant</h3>
              )}
              <button
                onClick={handleAssistantToggle}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={
                  isAssistantMinimized 
                    ? 'Expand Assistant' 
                    : isAssistantFullscreen 
                    ? 'Minimize Assistant' 
                    : 'Maximize Assistant'
                }
              >
                {isAssistantMinimized ? (
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>

          </div>

          {!isAssistantMinimized && (
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

          {/* Minimized State - Show Chat Icon */}
          {isAssistantMinimized && (
            <div className="flex-1 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
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
                <Minimize2 className="w-5 h-5 text-gray-600" />
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