import { useState, useEffect } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BarChart3, MessageSquare, Home, Database, ChevronLeft, ChevronRight, Minimize2, Maximize2, X, Zap, BookOpen, Settings, Cloud, Link, Send, GraduationCap, ChevronDown, Upload, Plus, Play, Save, Eye, Edit3, Brain, Search, Trash2, Check, Square, Bot } from 'lucide-react';

// Type definitions for messages
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
  createdAt: string;
}

export default function ChatPage() {
  const [currentView, setCurrentView] = useState<'chat' | 'dashboards' | 'query' | 'domain-model' | 'chats' | 'settings'>('chat');
  const [agentMode, setAgentMode] = useState<'model' | 'query' | 'dashboard'>('query');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [currentSessionInfo, setCurrentSessionInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(false);
  const [isAssistantFullscreen, setIsAssistantFullscreen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [isPlusDropdownOpen, setIsPlusDropdownOpen] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [currentMentionQuery, setCurrentMentionQuery] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'integrations' | 'general' | 'security' | 'agent-hub'>('integrations');
  const [agentStatuses, setAgentStatuses] = useState({
    'semantic-model': true,
    'query': true,
    'dashboards': true
  });

  // Get context-aware agent mode based on current view
  const getContextualAgentMode = () => {
    switch (currentView) {
      case 'query':
        return 'query';
      case 'domain-model':
        return 'semantic-model';
      case 'dashboards':
        return 'dashboards';
      default:
        return null; // Allow user selection in chat view
    }
  };

  // Check if user can manually select agent (only in general chat view)
  const canSelectAgent = currentView === 'chat';


  
  const userId = '0d493db8-bfed-4dd0-ab40-ae8a3225f8a5';

  const { data: sessions } = useQuery({
    queryKey: ['/api/sessions', userId],
    enabled: !!userId,
  });

  // Delete mutations
  const deleteChatMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/sessions/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', userId] });
    },
  });

  const bulkDeleteChatsMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const response = await apiRequest('DELETE', '/api/sessions', { sessionIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', userId] });
      setSelectedChatIds([]);
      setIsSelectionMode(false);
    },
  });

  // Handlers for delete functionality
  const handleDeleteChat = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      await deleteChatMutation.mutateAsync(sessionId);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedChatIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedChatIds.length} chat(s)? This action cannot be undone.`)) {
      await bulkDeleteChatsMutation.mutateAsync(selectedChatIds);
    }
  };

  const toggleChatSelection = (sessionId: string) => {
    setSelectedChatIds(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const toggleSelectAll = () => {
    if (sessions && selectedChatIds.length === sessions.length) {
      setSelectedChatIds([]);
    } else if (sessions) {
      setSelectedChatIds(sessions.map((s: any) => s.id));
    }
  };

  // Load messages for current session
  const { data: sessionMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/sessions', currentSessionId, 'messages'],
    enabled: !!currentSessionId,
  });

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages || []);
    }
  }, [sessionMessages]);

  // Refetch messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      refetchMessages();
    }
  }, [currentSessionId, refetchMessages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (isProfileDropdownOpen && !target.closest('.profile-dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
      
      if (isPlusDropdownOpen && !target.closest('.plus-dropdown-container')) {
        setIsPlusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileDropdownOpen, isPlusDropdownOpen]);

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
    if (!chatInput.trim() || isLoading) return;
    
    const messageContent = chatInput.trim();
    
    // Ensure we have a session ID
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, agentType: 'query' })
        });
        if (response.ok) {
          const session = await response.json();
          sessionId = session.id;
          setCurrentSessionId(session.id);
        } else {
          console.error('Failed to create session');
          return;
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }
    
    // Auto-detect context and set mode
    const detectedMode = detectContextMode(messageContent);
    setAgentMode(detectedMode);
    
    setChatInput('');
    setIsLoading(true);

    try {
      // Send message via WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'chat_message',
          sessionId: sessionId,
          content: messageContent,
          agentType: detectedMode === 'query' ? 'query' : 'yaml',
          userId: userId
        }));
        socket.close();
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsLoading(false);
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
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

  // Toggle agent status
  const toggleAgentStatus = (agentId: string) => {
    setAgentStatuses(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
  };

  // Available mentions for autocomplete - filtered by active agents
  const availableMentions = [
    { id: 'domain-model', label: 'Semantic-Model', description: 'Semantic data modeling and relationships', icon: 'S', type: 'agent', active: agentStatuses['semantic-model'] },
    { id: 'query', label: 'Query', description: 'SQL queries and data analysis', icon: 'Q', type: 'agent', active: agentStatuses['query'] },
    { id: 'dashboards', label: 'Dashboards', description: 'Interactive dashboards and visualizations', icon: 'B', type: 'agent', active: agentStatuses['dashboards'] }
  ].filter(mention => mention.active);

  // Handle @mention input detection and autocomplete
  const handleInputChange = (value: string) => {
    setChatInput(value);
    
    // Check for @ symbol and show dropdown
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      // Just typed @, show all options
      setShowMentionDropdown(true);
      setMentionPosition(lastAtIndex);
      setCurrentMentionQuery('');
    } else if (lastAtIndex !== -1) {
      // Check if we're still in mention context
      const afterAt = value.substring(lastAtIndex + 1);
      const hasSpace = afterAt.includes(' ');
      
      if (!hasSpace) {
        // Still typing mention
        setShowMentionDropdown(true);
        setMentionPosition(lastAtIndex);
        setCurrentMentionQuery(afterAt.toLowerCase());
      } else {
        // Space pressed, close dropdown
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
    
    // Check for specific mentions to set modes
    setIsGenerateMode(value.includes('@domain-model') || value.includes('@dashboards'));
  };

  // Filter mentions based on query
  const filteredMentions = availableMentions.filter(mention =>
    mention.label.toLowerCase().includes(currentMentionQuery) ||
    mention.description.toLowerCase().includes(currentMentionQuery)
  );

  // Handle mention selection
  const selectMention = (mention: typeof availableMentions[0]) => {
    const beforeMention = chatInput.substring(0, mentionPosition);
    const afterMention = chatInput.substring(mentionPosition + 1 + currentMentionQuery.length);
    const newValue = `${beforeMention}@${mention.label.toLowerCase()} ${afterMention}`;
    
    setChatInput(newValue);
    setShowMentionDropdown(false);
    setIsGenerateMode(newValue.includes('@domain-model') || newValue.includes('@dashboards'));
  };

  // Handle keyboard navigation in mention dropdown
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMentions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMentions.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMentions[selectedMentionIndex]) {
          selectMention(filteredMentions[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
      }
    }
  };

  // Reset selected index when dropdown opens/query changes
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [currentMentionQuery, showMentionDropdown]);



  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateModel = () => {
    // Generate example YAML content
    const exampleYaml = `version: 1
name: "HMDA Compliance Model"
description: "Semantic model for HMDA compliance reporting and fair lending analysis"
created_at: "${new Date().toISOString()}"

data_sources:
  - name: "PostgreSQL - Primary"
    type: "postgresql"
    connection: "primary_db"

tables:
  - name: "borrower_demographics"
    source: "PostgreSQL - Primary"
    columns:
      - name: "borrower_id"
        type: "varchar"
        primary_key: true
      - name: "race"
        type: "varchar"
      - name: "ethnicity"
        type: "varchar"
      - name: "gender"
        type: "varchar"
      - name: "income"
        type: "decimal"
        
  - name: "census_tracts"
    source: "PostgreSQL - Primary"
    columns:
      - name: "census_tract"
        type: "varchar"
        primary_key: true
      - name: "minority_population_pct"
        type: "decimal"
      - name: "median_income"
        type: "decimal"

views:
  - name: "demographic_analysis"
    source: "PostgreSQL - Primary"
    query: |
      SELECT 
        bd.borrower_id,
        bd.race,
        bd.ethnicity,
        bd.income,
        ct.minority_population_pct,
        ct.median_income
      FROM borrower_demographics bd
      JOIN census_tracts ct ON bd.census_tract = ct.census_tract

relationships:
  - from: "borrower_demographics.borrower_id"
    to: "hmda_loans.borrower_id"
    type: "one_to_many"
  - from: "census_tracts.census_tract"
    to: "property_details.census_tract"
    type: "one_to_many"

metrics:
  - name: "approval_rate_by_race"
    description: "Loan approval rate segmented by borrower race"
    type: "percentage"
  - name: "avg_loan_amount_by_income_level"
    description: "Average loan amount by borrower income level"
    type: "currency"`;

    setYamlContent(exampleYaml);
    setSelectedModel('HMDA Compliance Model');
  };

  const handleOpenModel = (modelName: string) => {
    const existingYaml = `version: 1
name: "${modelName}"
description: "Complete HMDA compliance model with borrower demographics and loan outcomes"
created_at: "2024-12-20T10:30:00Z"
last_updated: "2024-12-22T15:45:00Z"

data_sources:
  - name: "PostgreSQL - Primary"
    type: "postgresql"
    connection: "primary_db"
    status: "connected"

tables:
  - name: "hmda_loans"
    source: "PostgreSQL - Primary"
    rows: 2100000
    columns:
      - name: "loan_id"
        type: "varchar"
        primary_key: true
      - name: "borrower_id"
        type: "varchar"
        foreign_key: "borrower_demographics.borrower_id"
      - name: "loan_amount"
        type: "decimal"
      - name: "loan_purpose"
        type: "varchar"
      - name: "action_taken"
        type: "varchar"
        
  - name: "borrower_demographics"
    source: "PostgreSQL - Primary"
    rows: 850000
    columns:
      - name: "borrower_id"
        type: "varchar"
        primary_key: true
      - name: "applicant_race"
        type: "varchar"
      - name: "applicant_ethnicity"
        type: "varchar"
      - name: "applicant_sex"
        type: "varchar"
      - name: "applicant_income"
        type: "decimal"

  - name: "loan_outcomes"
    source: "PostgreSQL - Primary"
    rows: 2100000
    columns:
      - name: "loan_id"
        type: "varchar"
        foreign_key: "hmda_loans.loan_id"
      - name: "approval_status"
        type: "varchar"
      - name: "denial_reason"
        type: "varchar"
      - name: "rate_spread"
        type: "decimal"

relationships:
  - from: "borrower_demographics.borrower_id"
    to: "hmda_loans.borrower_id"
    type: "one_to_many"
    description: "One borrower can have multiple loan applications"
  - from: "hmda_loans.loan_id"
    to: "loan_outcomes.loan_id"
    type: "one_to_one"
    description: "Each loan has one outcome record"

business_rules:
  - name: "fair_lending_check"
    description: "Ensure no discriminatory patterns in loan approvals"
    type: "validation"
  - name: "income_verification"
    description: "Verify borrower income meets minimum requirements"
    type: "business_logic"

compliance:
  regulations:
    - "Home Mortgage Disclosure Act (HMDA)"
    - "Fair Housing Act"
    - "Community Reinvestment Act (CRA)"
  reporting_frequency: "annually"
  last_audit: "2024-10-15"`;

    setYamlContent(existingYaml);
    setSelectedModel(modelName);
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
              onClick={() => {
                setCurrentSessionInfo(null); // Clear session info for new chat
                setMessages([]); // Clear messages
                setCurrentSessionId(''); // Clear session ID to create new one
                setCurrentView('chat');
              }}
              className={`w-full flex items-center justify-start ${isLeftSidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} text-sm font-medium rounded-md transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'New Chat' : ''}
            >
              <MessageSquare className={`${isLeftSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
              {!isLeftSidebarCollapsed && <span>new chat</span>}
            </button>
            
            {agentStatuses['dashboards'] && (
            <button
              onClick={() => setCurrentView('dashboards')}
              className={`w-full flex items-center justify-start ${isLeftSidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} text-sm font-medium rounded-md transition-colors ${
                currentView === 'dashboards'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Dashboards' : ''}
            >
              <BarChart3 className={`${isLeftSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
              {!isLeftSidebarCollapsed && <span>dashboards</span>}
            </button>
            )}
            
            {agentStatuses['query'] && (
            <button
              onClick={() => setCurrentView('query')}
              className={`w-full flex items-center justify-start ${isLeftSidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} text-sm font-medium rounded-md transition-colors ${
                currentView === 'query'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Query' : ''}
            >
              <Search className={`${isLeftSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
              {!isLeftSidebarCollapsed && <span>query</span>}
            </button>
            )}
            
            {agentStatuses['semantic-model'] && (
            <button
              onClick={() => setCurrentView('domain-model')}
              className={`w-full flex items-center justify-start ${isLeftSidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} text-sm font-medium rounded-md transition-colors ${
                currentView === 'domain-model'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Semantic Model' : ''}
            >
              <Database className={`${isLeftSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
              {!isLeftSidebarCollapsed && <span>semantic model</span>}
            </button>
            )}
            


            {/* Separator */}
            <div className="border-t border-gray-200 my-2"></div>

            <button
              onClick={() => setCurrentView('chats')}
              className={`w-full flex items-center justify-start ${isLeftSidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'} text-sm font-medium rounded-md transition-colors ${
                currentView === 'chats'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isLeftSidebarCollapsed ? 'Chat History' : ''}
            >
              <MessageSquare className={`${isLeftSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
              {!isLeftSidebarCollapsed && <span>chat history</span>}
            </button>

          </div>
        </nav>
        
        {/* Profile Section */}
        <div className="border-t border-gray-200 relative profile-dropdown-container">
          {!isLeftSidebarCollapsed ? (
            <div className="p-4">
              {/* Clickable User Profile Header */}
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">U</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">user@datamind.com</p>
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transform transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Upgrade plan</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setIsProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                      currentView === 'settings'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Help</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-full flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                title="Profile"
              >
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">U</span>
                </div>
              </button>
              
              {/* Collapsed Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute bottom-full left-full ml-2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-48">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">user@datamind.com</p>
                    <p className="text-xs text-gray-500">Free Plan</p>
                  </div>
                  
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Upgrade plan</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setIsProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                      currentView === 'settings'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Help</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentView === 'chat' ? (
          /* New Chat View - Fullscreen Chat Interface */
          (<div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getContextualAgentMode() 
                      ? `${getContextualAgentMode() === 'query' ? 'Query' : getContextualAgentMode() === 'semantic-model' ? 'Semantic Model' : 'Dashboard'} Assistant`
                      : currentSessionInfo 
                        ? (currentSessionInfo.agentType === 'yaml' ? 'Data Generation Chat' : 'Query Analysis Chat')
                        : 'DataMind Assistant'
                    }
                  </h2>
                  {(getContextualAgentMode() || currentSessionInfo) && (
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${
                      getContextualAgentMode() === 'query' || currentSessionInfo?.agentType === 'query'
                        ? 'bg-green-100 text-green-700'
                        : getContextualAgentMode() === 'semantic-model' || currentSessionInfo?.agentType === 'yaml' 
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                    }`}>
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                        getContextualAgentMode() === 'query' || currentSessionInfo?.agentType === 'query'
                          ? 'bg-green-600'
                          : getContextualAgentMode() === 'semantic-model' || currentSessionInfo?.agentType === 'yaml'
                            ? 'bg-blue-600'
                            : 'bg-purple-600'
                      }`}>
                        {getContextualAgentMode() === 'query' || currentSessionInfo?.agentType === 'query' ? 'Q' : 
                         getContextualAgentMode() === 'semantic-model' || currentSessionInfo?.agentType === 'yaml' ? 'S' : 'B'}
                      </div>
                      <span>
                        {getContextualAgentMode() 
                          ? (getContextualAgentMode() === 'query' ? 'Query Agent' : 
                             getContextualAgentMode() === 'semantic-model' ? 'Semantic Agent' : 'Dashboard Agent')
                          : (currentSessionInfo?.agentType || 'query')
                        }
                      </span>
                    </span>
                  )}
                </div>
                {currentSessionInfo && (
                  <div className="text-sm text-gray-500">
                    {new Date(currentSessionInfo.createdAt).toLocaleDateString()} • {new Date(currentSessionInfo.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
              <p className="text-gray-600">
                {currentSessionInfo 
                  ? `Continue your ${currentSessionInfo.agentType === 'yaml' ? 'data generation' : 'query analysis'} conversation`
                  : 'Welcome to your AI-powered data analytics platform'
                }
              </p>
            </div>
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {getContextualAgentMode() 
                        ? `${getContextualAgentMode() === 'query' ? 'Query' : getContextualAgentMode() === 'semantic-model' ? 'Semantic Model' : 'Dashboard'} Assistant Ready`
                        : 'Welcome to DataMind'
                      }
                    </h4>
                    <p className="text-gray-500">
                      {getContextualAgentMode()
                        ? `You're in ${getContextualAgentMode() === 'query' ? 'Query' : getContextualAgentMode() === 'semantic-model' ? 'Semantic Model' : 'Dashboard'} mode. Ask questions specific to ${getContextualAgentMode() === 'query' ? 'data queries and analysis' : getContextualAgentMode() === 'semantic-model' ? 'data modeling and relationships' : 'dashboards and visualizations'}.`
                        : 'Start by typing @ to explore our AI agents for data analysis, modeling, and visualization'
                      }
                    </p>
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
            {/* Chat Input */}
            <div className="border-t border-gray-200 p-6">
              <div className="max-w-4xl mx-auto">
                {/* Uploaded Files Display */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Uploaded Files</span>
                      <button
                        onClick={() => setUploadedFiles([])}
                        className="text-xs text-blue-700 hover:text-blue-900"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-white px-3 py-1 rounded-md border border-blue-200">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => removeUploadedFile(index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={handleChatSubmit} className="flex space-x-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        getContextualAgentMode() 
                          ? `Ask the ${getContextualAgentMode() === 'query' ? 'Query' : getContextualAgentMode() === 'semantic-model' ? 'Semantic Model' : 'Dashboard'} agent anything...`
                          : isGenerateMode ? "What would you like me to help you with?" : "Ask me anything... (Type @ for agents)"
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                        getContextualAgentMode()
                          ? `border-${getContextualAgentMode() === 'query' ? 'green' : getContextualAgentMode() === 'semantic-model' ? 'blue' : 'purple'}-400 bg-${getContextualAgentMode() === 'query' ? 'green' : getContextualAgentMode() === 'semantic-model' ? 'blue' : 'purple'}-50 focus:ring-${getContextualAgentMode() === 'query' ? 'green' : getContextualAgentMode() === 'semantic-model' ? 'blue' : 'purple'}-500 text-${getContextualAgentMode() === 'query' ? 'green' : getContextualAgentMode() === 'semantic-model' ? 'blue' : 'purple'}-900 placeholder-${getContextualAgentMode() === 'query' ? 'green' : getContextualAgentMode() === 'semantic-model' ? 'blue' : 'purple'}-600`
                          : isGenerateMode 
                            ? 'border-blue-400 bg-blue-50 focus:ring-blue-500 text-blue-900 placeholder-blue-600'
                            : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      disabled={isLoading}
                    />
                    
                    {/* @mention Autocomplete Dropdown - only show if not in contextual mode */}
                    {!getContextualAgentMode() && showMentionDropdown && filteredMentions.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          @agents
                        </div>
                        {filteredMentions.map((mention, index) => (
                          <button
                            key={mention.id}
                            type="button"
                            onClick={() => selectMention(mention)}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                              index === selectedMentionIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                            }`}
                          >
                            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">{mention.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">@{mention.label.toLowerCase()}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  mention.type === 'agent' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {mention.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{mention.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isLoading}
                    className={`px-6 py-3 text-white rounded-lg font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isGenerateMode
                        ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-600'
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {isGenerateMode ? 'Generate' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          </div>)
        ) : currentView === 'dashboard' ? (
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
        ) : currentView === 'chats' ? (
          <div className="flex-1 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Chats</h2>
                <p className="text-gray-600">Chat history and conversation management</p>
              </div>
              <div className="flex items-center space-x-2">
                {sessions && sessions.length > 0 && (
                  <button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    {isSelectionMode ? 'Cancel' : 'Select'}
                  </button>
                )}
                {isSelectionMode && selectedChatIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteChatsMutation.isPending}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete ({selectedChatIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Selection Controls */}
            {isSelectionMode && sessions && sessions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-900"
                    >
                      {selectedChatIds.length === sessions.length ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span>
                        {selectedChatIds.length === sessions.length ? 'Deselect All' : 'Select All'}
                      </span>
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {selectedChatIds.length} of {sessions.length} selected
                  </span>
                </div>
              </div>
            )}
            
            {/* Chat History List */}
            <div className="space-y-4">
              {sessions && sessions.length > 0 ? (
                sessions.map((session: any) => (
                  <div key={session.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between">
                      {isSelectionMode && (
                        <div className="mr-3">
                          <input
                            type="checkbox"
                            checked={selectedChatIds.includes(session.id)}
                            onChange={() => toggleChatSelection(session.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 cursor-pointer" onClick={() => {
                        if (!isSelectionMode) {
                          console.log('Opening session:', session.id);
                          setMessages([]);
                          setCurrentSessionId(session.id);
                          setCurrentSessionInfo(session);
                          setCurrentView('chat');
                          queryClient.invalidateQueries({
                            queryKey: ['/api/sessions', session.id, 'messages']
                          });
                        }
                      }}>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {session.agentType === 'yaml' ? 'Data Generation Chat' : 'Query Analysis Chat'}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            session.agentType === 'yaml' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {session.agentType || 'query'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()} • {new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!isSelectionMode && (
                          <>
                            <button
                              onClick={async () => {
                                console.log('Opening session:', session.id);
                                setMessages([]);
                                setCurrentSessionId(session.id);
                                setCurrentSessionInfo(session);
                                setCurrentView('chat');
                                await queryClient.invalidateQueries({
                                  queryKey: ['/api/sessions', session.id, 'messages']
                                });
                              }}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Open
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(session.id);
                              }}
                              disabled={deleteChatMutation.isPending}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Delete chat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No chat history</h4>
                  <p className="text-gray-500 mb-4">Start a new conversation to see your chat history here</p>
                  <button
                    onClick={() => {
                      setCurrentSessionInfo(null); // Clear session info for new chat
                      setMessages([]); // Clear messages
                      setCurrentSessionId(''); // Clear session ID to create new one
                      setCurrentView('chat');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start New Chat
                  </button>
                </div>
              )}
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
                  <button 
                    onClick={() => setActiveSettingsTab('integrations')}
                    className={`border-transparent py-2 px-1 text-sm font-medium border-b-2 ${
                      activeSettingsTab === 'integrations' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Integrations
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('agent-hub')}
                    className={`border-transparent py-2 px-1 text-sm font-medium border-b-2 ${
                      activeSettingsTab === 'agent-hub' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Agent Hub
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('general')}
                    className={`border-transparent py-2 px-1 text-sm font-medium border-b-2 ${
                      activeSettingsTab === 'general' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    General
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('security')}
                    className={`border-transparent py-2 px-1 text-sm font-medium border-b-2 ${
                      activeSettingsTab === 'security' 
                        ? 'text-blue-600 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Security
                  </button>
                </nav>
              </div>
            </div>

            {/* Integrations Content */}
            {activeSettingsTab === 'integrations' && (
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
            )}

            {/* Agent Hub Content */}
            {activeSettingsTab === 'agent-hub' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Agents */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Available Agents</h3>
                  <Bot className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">S</div>
                        <span className="text-sm font-medium">Semantic-Model Agent</span>
                      </div>
                      <button
                        onClick={() => toggleAgentStatus('semantic-model')}
                        className={`text-xs px-2 py-1 rounded-full cursor-pointer ${
                          agentStatuses['semantic-model'] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agentStatuses['semantic-model'] ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Semantic data modeling and relationships</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">Q</div>
                        <span className="text-sm font-medium">Query Agent</span>
                      </div>
                      <button
                        onClick={() => toggleAgentStatus('query')}
                        className={`text-xs px-2 py-1 rounded-full cursor-pointer ${
                          agentStatuses['query'] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agentStatuses['query'] ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">SQL queries and data analysis</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">B</div>
                        <span className="text-sm font-medium">Dashboard Agent</span>
                      </div>
                      <button
                        onClick={() => toggleAgentStatus('dashboards')}
                        className={`text-xs px-2 py-1 rounded-full cursor-pointer ${
                          agentStatuses['dashboards'] 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agentStatuses['dashboards'] ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Interactive dashboards and visualizations</p>
                  </div>
                  <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    Deploy New Agent
                  </button>
                </div>
              </div>

              {/* Agent Performance */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Agent Performance</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {agentStatuses['semantic-model'] && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Semantic-Model Agent</span>
                      <span className="text-sm font-medium">95.2%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '95.2%'}}></div>
                    </div>
                  </div>
                  )}
                  {agentStatuses['query'] && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Query Agent</span>
                      <span className="text-sm font-medium">88.7%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '88.7%'}}></div>
                    </div>
                  </div>
                  )}
                  {agentStatuses['dashboards'] && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Dashboard Agent</span>
                      <span className="text-sm font-medium">92.1%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '92.1%'}}></div>
                    </div>
                  </div>
                  )}
                  {!agentStatuses['semantic-model'] && !agentStatuses['query'] && !agentStatuses['dashboards'] && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No active agents to display performance data</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Configuration */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Agent Configuration</h3>
                  <Settings className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium block">Auto-detect Context</span>
                      <span className="text-xs text-gray-500">Automatically switch agents based on conversation</span>
                    </div>
                    <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium block">Response Streaming</span>
                      <span className="text-xs text-gray-500">Stream agent responses in real-time</span>
                    </div>
                    <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium block">Agent Collaboration</span>
                      <span className="text-xs text-gray-500">Allow agents to work together on complex tasks</span>
                    </div>
                    <div className="w-10 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Agent Actions</h3>
                  <Zap className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Train All Agents
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Reset Agent Memory
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Export Agent Configs
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    View Agent Logs
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        ) : currentView === 'models' ? (
          <div className="flex-1 p-6">
            {selectedModel ? (
              // YAML Editor View
              (<div className="h-full flex flex-col">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setSelectedModel(null)}
                      className="p-2 hover:bg-gray-100 rounded-md"
                      title="Back to Models"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedModel}</h2>
                      <p className="text-gray-600">Edit semantic model configuration in YAML</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                      Validate
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                      Save Model
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {/* YAML Editor */}
                  <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">YAML Configuration</h3>
                      <div className="flex space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400" title="Format YAML">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400" title="Copy to Clipboard">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      <textarea
                        value={yamlContent}
                        onChange={(e) => setYamlContent(e.target.value)}
                        className="w-full h-full font-mono text-sm border-none outline-none resize-none bg-gray-50 p-4 rounded"
                        style={{ minHeight: '500px' }}
                        spellCheck={false}
                      />
                    </div>
                  </div>
                </div>
              </div>)
            ) : (
              // Models List View
              (<div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Semantic Models</h2>
                  <p className="text-gray-600">Create and manage semantic data models from your connected data sources</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  {/* Data Source Selection */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
                      <Database className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">PostgreSQL - Primary</span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Selected</span>
                        </div>
                        <p className="text-xs text-blue-700">47 tables • 12 views • Connected</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">Snowflake - Analytics</span>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Available</span>
                        </div>
                        <p className="text-xs text-gray-500">23 tables • 8 views • Connected</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">MongoDB - Documents</span>
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Setup Required</span>
                        </div>
                        <p className="text-xs text-gray-500">15 collections • Not configured</p>
                      </div>
                    </div>
                  </div>

                  {/* Available Data Objects */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Available Data</h3>
                      <div className="flex space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
                          <Database className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {/* Tables Section */}
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tables</div>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">hmda_loans</span>
                          <p className="text-xs text-gray-500">2.1M rows • Loan application data</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" defaultChecked />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">borrower_demographics</span>
                          <p className="text-xs text-gray-500">850K rows • Borrower information</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">property_details</span>
                          <p className="text-xs text-gray-500">1.8M rows • Property characteristics</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" defaultChecked />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">census_tracts</span>
                          <p className="text-xs text-gray-500">74K rows • Geographic data</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">loan_outcomes</span>
                          <p className="text-xs text-gray-500">2.1M rows • Approval/denial data</p>
                        </div>
                      </label>
                      
                      {/* Views Section */}
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 mt-4">Views</div>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">hmda_summary</span>
                          <p className="text-xs text-gray-500">Aggregated loan data by year</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" defaultChecked />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">demographic_analysis</span>
                          <p className="text-xs text-gray-500">Combined borrower and census data</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" className="mr-3" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">fair_lending_metrics</span>
                          <p className="text-xs text-gray-500">Compliance and fairness indicators</p>
                        </div>
                      </label>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>3 of 8 items selected</span>
                        <button className="text-blue-600 hover:text-blue-700">Select All</button>
                      </div>
                    </div>
                  </div>

                  {/* Model Configuration */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Create Model</h3>
                      <Brain className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
                        <input 
                          type="text" 
                          placeholder="HMDA Compliance Model"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea 
                          placeholder="Semantic model for HMDA compliance reporting and fair lending analysis"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Key</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>loan_id</option>
                          <option>application_id</option>
                          <option>borrower_id</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Relationships</label>
                        <div className="space-y-2 text-xs">
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="font-medium">borrower_demographics</span> → <span className="text-gray-600">hmda_loans.borrower_id</span>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="font-medium">census_tracts</span> → <span className="text-gray-600">property_details.census_tract</span>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="font-medium">demographic_analysis</span> → <span className="text-gray-600">view relationship</span>
                          </div>
                        </div>
                        <button className="mt-2 text-xs text-blue-600 hover:text-blue-700">
                          + Add Relationship
                        </button>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <button 
                          onClick={handleCreateModel}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Create Semantic Model
                        </button>
                        <button className="w-full mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                          Save as Draft
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Existing Models */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Semantic Models</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-semibold text-gray-900">HMDA Reporting Model</h4>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Complete HMDA compliance model with borrower demographics and loan outcomes</p>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>5 tables • 2 views</span>
                        <span>Updated 2 days ago</span>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleOpenModel('HMDA Reporting Model')}
                          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Open
                        </button>
                        <button className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                          Edit
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-semibold text-gray-900">Fair Lending Analysis</h4>
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Draft</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Geographic and demographic analysis model for fair lending compliance</p>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>3 tables • 1 view</span>
                        <span>Updated 1 week ago</span>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleOpenModel('Fair Lending Analysis')}
                          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Continue
                        </button>
                        <button className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
              </div>)
            )}
          </div>
        ) : currentView === 'trainings' ? (
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
        ) : (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
              <p className="text-gray-600">Select a section from the navigation to get started</p>
            </div>
          </div>
        )}
      </div>
      {/* Right Assistant Sidebar */}
      {!isAssistantFullscreen && currentView !== 'chat' && currentView !== 'chats' && (
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