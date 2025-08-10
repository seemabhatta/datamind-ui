import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import type { ChatSession } from '@shared/schema';

interface ChatHistoryProps {
  userId: string;
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatHistory({
  userId,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  isCollapsed,
  onToggleCollapse
}: ChatHistoryProps) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<ChatSession[]>({
    queryKey: ['/api/sessions', userId],
    enabled: !!userId
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => 
      apiRequest(`/api/sessions/${sessionId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', userId] });
    }
  });

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteSessionMutation.mutate(sessionId);
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center p-2 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="w-full p-2"
            title="New Chat"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Chat History
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          onClick={onNewChat}
          className="w-full mt-3 text-sm"
          size="sm"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions?.map((session: ChatSession) => (
                <div
                  key={session.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-shrink-0">
                          {session.agentType === 'query' && (
                            <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center justify-center text-xs font-medium">Q</div>
                          )}
                          {session.agentType === 'yaml' && (
                            <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-medium">O</div>
                          )}
                          {session.agentType === 'dashboards' && (
                            <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-medium">D</div>
                          )}
                          {session.agentType === 'general' && (
                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-medium">G</div>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {session.title || 'Untitled Chat'}
                        </h3>
                      </div>
                      
                      {session.summary && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {session.summary}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {session.messageCount || 0} messages
                        </span>
                        <span>
                          {session.lastMessageAt 
                            ? formatDistanceToNow(new Date(session.lastMessageAt as any), { addSuffix: true })
                            : formatDistanceToNow(new Date(session.createdAt as any), { addSuffix: true })
                          }
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}