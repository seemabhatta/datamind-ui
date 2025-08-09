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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {/* Left Sidebar */}
      <div className={`${isLeftSidebarCollapsed ? 'w-16' : 'w-64'} bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col transition-all duration-300 shadow-sm`}>
        <div className="p-6 border-b border-gray-200/50 flex items-center justify-between">
          {!isLeftSidebarCollapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">DataMind</h1>
          )}
          <button
            onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            className="p-2 hover:bg-gray-100/80 rounded-lg transition-all duration-200 hover:scale-105"
          >
            {isLeftSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        
        <nav className="flex-1 p-6">
          <div className="space-y-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 hover:shadow-sm'
              }`}
              title={isLeftSidebarCollapsed ? 'Dashboard' : ''}
            >
              <Home className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>dashboard</span>}
            </button>
            
            <button
              onClick={() => setCurrentView('studio')}
              className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                currentView === 'studio'
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 hover:shadow-sm'
              }`}
              title={isLeftSidebarCollapsed ? 'Studio' : ''}
            >
              <Database className="w-4 h-4" />
              {!isLeftSidebarCollapsed && <span>studio</span>}
            </button>

            {/* Integrations Section */}
            <div className="pt-6">
              <button
                onClick={() => setShowIntegrationsDropdown(!showIntegrationsDropdown)}
                className={`w-full flex items-center ${isLeftSidebarCollapsed ? 'justify-center' : 'space-x-3 justify-between'} px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 hover:shadow-sm`}
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
                <div className="ml-6 mt-3 space-y-2">
                  {/* Sources */}
                  <div className="text-xs font-medium text-gray-500 mb-3">sources</div>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50/80 rounded-lg transition-all duration-150">snowflake</button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50/80 rounded-lg transition-all duration-150">aws dynamo db</button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50/80 rounded-lg transition-all duration-150">aws s3</button>
                  
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
      <div className="flex-1 flex flex-col bg-gradient-to-br from-white/80 to-blue-50/30 backdrop-blur-sm">
        {currentView === 'dashboard' ? (
          <div className="flex-1 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">Dashboard</h2>
              <p className="text-gray-600 text-lg">Analytics and visualizations overview</p>
            </div>
            
            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sample Chart 1 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Sales Performance</h3>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="h-72 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl flex items-center justify-center border border-gray-100">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-lg font-medium">Chart visualization</p>
                    <p className="text-sm mt-2 text-gray-400">Connect to data source to populate</p>
                  </div>
                </div>
              </div>

              {/* Sample Chart 2 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Revenue Trends</h3>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="h-72 bg-gradient-to-br from-gray-50 to-green-50/30 rounded-2xl flex items-center justify-center border border-gray-100">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-lg font-medium">Chart visualization</p>
                    <p className="text-sm mt-2 text-gray-400">Connect to data source to populate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">Studio</h2>
              <p className="text-gray-600 text-lg">Data exploration and analysis workspace</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-[500px]">
              <div className="h-full bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-2xl flex items-center justify-center border border-gray-100">
                <div className="text-center text-gray-500">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Database className="w-10 h-10 text-purple-600" />
                  </div>
                  <p className="text-xl font-medium mb-2">Studio workspace</p>
                  <p className="text-gray-400">Data exploration tools will appear here</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Right Assistant Sidebar */}
      {!isAssistantFullscreen && (
        <div className={`${isAssistantMinimized ? 'w-16' : 'w-96'} bg-white/90 backdrop-blur-sm border-l border-gray-200/50 flex flex-col transition-all duration-300 shadow-sm`}>
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between mb-3">
              {!isAssistantMinimized && (
                <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">assistant</h3>
              )}
              <button
                onClick={handleAssistantToggle}
                className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200 hover:scale-105"
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-indigo-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-700 mb-2">Ready to help</p>
                      <p className="text-sm text-gray-500">Start a conversation with the assistant</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                          : 'bg-gray-100/80 backdrop-blur-sm text-gray-900 border border-gray-200/50'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 rounded-2xl text-sm text-gray-600 border border-gray-200/50 shadow-sm">
                        <span className="animate-pulse">Assistant is typing...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200/50 p-6">
                  <form onSubmit={handleChatSubmit} className="flex space-x-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 px-4 py-3 border border-gray-300/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-gray-50/80 backdrop-blur-sm transition-all duration-200"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isLoading}
                      className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
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
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                <MessageSquare className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          )}
        </div>
      )}
      {/* Fullscreen Assistant Overlay */}
      {isAssistantFullscreen && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-blue-50 z-50 flex flex-col backdrop-blur-md">
          {/* Fullscreen Header */}
          <div className="p-8 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Assistant</h3>
              <button
                onClick={handleAssistantToggle}
                className="p-3 hover:bg-gray-100/80 rounded-2xl transition-all duration-200 hover:scale-105 shadow-sm"
                title="Minimize Assistant"
              >
                <Minimize2 className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            

          </div>

          {/* Fullscreen Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-5xl mx-auto space-y-6">
                {messages.length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <MessageSquare className="w-12 h-12 text-indigo-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Assistant</h4>
                    <p className="text-gray-600 text-lg">Enhanced workspace for detailed interactions and powerful AI assistance</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl px-6 py-4 rounded-3xl text-base shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                        : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-200/50'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-3xl text-gray-600 border border-gray-200/50 shadow-sm">
                      <span className="animate-pulse">Assistant is typing...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fullscreen Chat Input */}
            <div className="border-t border-gray-200/50 p-8 bg-white/80 backdrop-blur-sm">
              <div className="max-w-5xl mx-auto">
                <form onSubmit={handleChatSubmit} className="flex space-x-6">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 px-6 py-4 border border-gray-300/50 rounded-3xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-gray-50/80 backdrop-blur-sm transition-all duration-200"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isLoading}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl text-base font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
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