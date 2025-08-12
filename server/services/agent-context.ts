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

  async createContext(sessionId: string): Promise<AgentContext> {
    const context: AgentContext = {
      sessionId,
      tables: [],
      conversationHistory: []
    };
    this.contexts.set(sessionId, context);
    
    // Auto-connect to the default Snowflake connection
    await this.autoConnectToSnowflake(context);
    
    return context;
  }

  private async autoConnectToSnowflake(context: AgentContext): Promise<void> {
    try {
      // Import function tools to access connect_to_snowflake
      const { getFunctionTool } = await import('./function-tools');
      const connectTool = getFunctionTool('connect_to_snowflake');
      
      if (connectTool) {
        console.log(`Auto-connecting session ${context.sessionId} to Snowflake...`);
        await connectTool.execute(context, {});
        console.log(`Auto-connection successful for session ${context.sessionId}`);
      }
    } catch (error) {
      console.log(`Auto-connection failed for session ${context.sessionId}:`, error);
      // Don't throw - let the session continue without auto-connection
    }
  }

  async getContext(sessionId: string): Promise<AgentContext> {
    let context = this.contexts.get(sessionId);
    if (!context) {
      context = await this.createContext(sessionId);
    }
    return context;
  }

  async updateContext(sessionId: string, updates: Partial<AgentContext>): Promise<void> {
    const context = await this.getContext(sessionId);
    Object.assign(context, updates);
    this.contexts.set(sessionId, context);
  }

  async addToHistory(sessionId: string, entry: {
    role: 'user' | 'assistant' | 'function';
    content: string;
    functionCall?: string;
    timestamp: Date;
  }): Promise<void> {
    const context = await this.getContext(sessionId);
    context.conversationHistory.push(entry);
    
    // Keep only last 50 entries to prevent memory bloat
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }
    
    this.contexts.set(sessionId, context);
  }

  async getContextSummary(sessionId: string): Promise<string> {
    const context = await this.getContext(sessionId);
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