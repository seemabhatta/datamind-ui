import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './use-websocket';
import { ChatMessage } from '@shared/schema';
import { useToast } from './use-toast';

export function useChat(sessionId: string | null, agentType: 'query' | 'yaml', userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { lastMessage, sendMessage: sendWsMessage } = useWebSocket(sessionId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages for the current session
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/sessions', sessionId, 'messages'],
    enabled: !!sessionId
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'message_saved':
        // Invalidate messages query to refetch
        queryClient.invalidateQueries({ 
          queryKey: ['/api/sessions', sessionId, 'messages'] 
        });
        break;

      case 'agent_response':
        setIsLoading(false);
        // Invalidate messages query to show new response
        queryClient.invalidateQueries({ 
          queryKey: ['/api/sessions', sessionId, 'messages'] 
        });
        break;

      case 'agent_typing':
        setIsLoading(lastMessage.isTyping);
        break;

      case 'visualization_created':
        // Invalidate visualization queries
        queryClient.invalidateQueries({ 
          queryKey: ['/api/visualizations'] 
        });
        break;

      case 'error':
        setIsLoading(false);
        toast({
          title: "Error",
          description: lastMessage.message,
          variant: "destructive"
        });
        break;

      default:
        console.log('Unhandled message type:', lastMessage.type);
    }
  }, [lastMessage, queryClient, sessionId, toast]);

  const sendMessage = (content: string) => {
    if (!sessionId || !content.trim()) return;

    setIsLoading(true);
    
    sendWsMessage({
      type: 'chat_message',
      sessionId,
      content: content.trim(),
      agentType,
      userId
    });
  };

  return {
    messages: messages as ChatMessage[],
    isLoading: messagesLoading || isLoading,
    sendMessage
  };
}
