import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { useWebSocket } from "@/hooks/use-websocket";
import { ChatInterface } from "@/components/chat/chat-interface";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Sidebar } from "@/components/chat/sidebar";
import { useQuery } from "@tanstack/react-query";

export default function ChatPage() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [agentType, setAgentType] = useState<'query' | 'yaml'>('query');
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Mock user ID - in a real app, this would come from authentication
  const userId = "user_1";

  const { messages, isLoading, sendMessage } = useChat(currentSessionId, agentType, userId);
  const { socket, isConnected: wsConnected } = useWebSocket(currentSessionId);

  // Fetch user sessions
  const { data: sessions } = useQuery({
    queryKey: ['/api/sessions', userId],
    enabled: !!userId
  });

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  useEffect(() => {
    // Create a new session if none exists
    if (!currentSessionId && !isLoading) {
      createNewSession();
    }
  }, [currentSessionId]);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'New Chat Session',
          agentType
        })
      });
      
      if (response.ok) {
        const session = await response.json();
        setCurrentSessionId(session.id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleAgentSwitch = (newAgentType: 'query' | 'yaml') => {
    setAgentType(newAgentType);
    if (socket) {
      socket.send(JSON.stringify({
        type: 'agent_switch',
        agentType: newAgentType
      }));
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar 
        sessions={(sessions as any[]) || []}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={createNewSession}
        onDashboardToggle={() => setIsDashboardOpen(!isDashboardOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Conversational Analytics
              </h2>
              
              {/* Agent Selector */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => handleAgentSwitch('query')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    agentType === 'query'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Query Agent
                </button>
                <button
                  onClick={() => handleAgentSwitch('yaml')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    agentType === 'yaml'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  YAML Generator
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-2 text-sm text-slate-600">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'Connected to Snowflake' : 'Disconnected'}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex min-h-0">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            agentType={agentType}
          />

          {/* Dashboard Panel */}
          {isDashboardOpen && (
            <DashboardPanel
              userId={userId}
              onClose={() => setIsDashboardOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
