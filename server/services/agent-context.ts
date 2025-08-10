/**
 * Agent Context Management - Enhanced from CLI implementation
 * Manages rich state for AI agents with comprehensive data tracking
 */

export interface AgentContext {
  sessionId: string;
  connectionId?: string;
  currentDatabase?: string;
  currentSchema?: string;
  currentStage?: string;
  yamlContent?: string;
  yamlFilename?: string;
  yamlData?: any;
  tables: Array<{
    name: string;
    schema: string;
    database: string;
  }>;
  stages?: Array<{
    name: string;
    database: string;
    schema: string;
    type: string;
  }>;
  lastQueryResults?: any[];
  lastQueryColumns?: string[];
  lastQuerySql?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'function';
    content: string;
    functionCall?: string;
    timestamp: Date;
  }>;
}

export class AgentContextManager {
  private contexts = new Map<string, AgentContext>();

  createContext(sessionId: string): AgentContext {
    const context: AgentContext = {
      sessionId,
      tables: [],
      conversationHistory: []
    };
    this.contexts.set(sessionId, context);
    return context;
  }

  getContext(sessionId: string): AgentContext {
    let context = this.contexts.get(sessionId);
    if (!context) {
      context = this.createContext(sessionId);
    }
    return context;
  }

  updateContext(sessionId: string, updates: Partial<AgentContext>): void {
    const context = this.getContext(sessionId);
    Object.assign(context, updates);
    this.contexts.set(sessionId, context);
  }

  addToHistory(sessionId: string, entry: {
    role: 'user' | 'assistant' | 'function';
    content: string;
    functionCall?: string;
    timestamp: Date;
  }): void {
    const context = this.getContext(sessionId);
    context.conversationHistory.push(entry);
    
    // Keep only last 50 entries to prevent memory bloat
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }
    
    this.contexts.set(sessionId, context);
  }

  getContextSummary(context: AgentContext): string {
    const parts = [];
    
    if (context.connectionId) {
      parts.push(`Connected to Snowflake`);
    }
    
    if (context.currentDatabase) {
      parts.push(`Database: ${context.currentDatabase}`);
    }
    
    if (context.currentSchema) {
      parts.push(`Schema: ${context.currentSchema}`);
    }
    
    if (context.tables.length > 0) {
      parts.push(`Tables loaded: ${context.tables.length}`);
    }
    
    if (context.lastQueryResults) {
      parts.push(`Last query returned ${context.lastQueryResults.length} rows`);
    }
    
    if (context.yamlContent) {
      parts.push(`YAML dictionary loaded`);
    }

    return parts.length > 0 ? `\n- ${parts.join('\n- ')}` : '\nNo active context';
  }

  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }
}

// Global instance
export const agentContextManager = new AgentContextManager();