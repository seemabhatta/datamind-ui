import { storage } from '../storage';

// Agent Context - Replicated from your Python AgentContext but enhanced for web platform
export interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  warehouse?: string;
  role?: string;
  authenticator?: string;
}

export interface AgentContext {
  sessionId: string;
  userId: string;
  connectionId?: string;
  snowflakeConfig?: SnowflakeConfig;
  currentDatabase?: string;
  currentSchema?: string;
  currentStage?: string;
  selectedTables: string[];
  yamlContent?: string;
  yamlData?: any;
  tables: Array<{
    name: string;
    schema: string;
    database: string;
    columns?: Array<{
      name: string;
      type: string;
      nullable: boolean;
      comment?: string;
    }>;
  }>;
  lastQueryResults?: any[];
  lastQueryColumns?: string[];
  lastQuerySql?: string;
  lastVisualization?: any;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'function';
    content: string;
    functionCall?: string;
    timestamp: Date;
  }>;
}

export class AgentContextManager {
  private contexts = new Map<string, AgentContext>();

  constructor() {}

  async getContext(sessionId: string, userId: string): Promise<AgentContext> {
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      // Initialize new context
      context = {
        sessionId,
        userId,
        selectedTables: [],
        tables: [],
        conversationHistory: []
      };
      
      // Try to restore from previous session if exists
      await this.restoreContext(context);
      this.contexts.set(sessionId, context);
    }
    
    return context;
  }

  async updateContext(sessionId: string, updates: Partial<AgentContext>): Promise<AgentContext> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found for session: ${sessionId}`);
    }

    Object.assign(context, updates);
    
    // Persist important state changes
    await this.persistContext(context);
    
    return context;
  }

  async addToHistory(sessionId: string, entry: AgentContext['conversationHistory'][0]): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    context.conversationHistory.push({
      ...entry,
      timestamp: new Date()
    });

    // Keep only last 50 entries to prevent memory bloat
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }
  }

  async clearContext(sessionId: string): Promise<void> {
    this.contexts.delete(sessionId);
  }

  private async restoreContext(context: AgentContext): Promise<void> {
    try {
      // Try to get default Snowflake connection for user
      const connections = await storage.getSnowflakeConnections(context.userId);
      const defaultConnection = connections.find(c => c.isDefault && c.isActive);
      
      if (defaultConnection) {
        context.connectionId = defaultConnection.id;
        context.currentDatabase = defaultConnection.database || undefined;
        context.currentSchema = defaultConnection.schema || undefined;
      }
    } catch (error) {
      console.log('Could not restore context:', error);
    }
  }

  private async persistContext(context: AgentContext): Promise<void> {
    try {
      // Context persistence is handled in-memory for now
      // Future enhancement: persist to database
      console.log('Context persisted for session:', context.sessionId);
    } catch (error) {
      console.log('Could not persist context:', error);
    }
  }

  // Get context summary for AI prompts
  getContextSummary(context: AgentContext): string {
    const parts = [];
    
    if (context.connectionId) {
      parts.push(`Connected to Snowflake (Connection: ${context.connectionId})`);
    }
    
    if (context.currentDatabase) {
      parts.push(`Database: ${context.currentDatabase}`);
    }
    
    if (context.currentSchema) {
      parts.push(`Schema: ${context.currentSchema}`);
    }
    
    if (context.selectedTables.length > 0) {
      parts.push(`Selected Tables: ${context.selectedTables.join(', ')}`);
    }
    
    if (context.tables.length > 0) {
      parts.push(`Available Tables: ${context.tables.map(t => t.name).join(', ')}`);
    }
    
    if (context.lastQuerySql) {
      parts.push(`Last Query: ${context.lastQuerySql.substring(0, 100)}...`);
    }
    
    if (context.yamlContent) {
      parts.push(`YAML Model Loaded: ${context.yamlContent.substring(0, 100)}...`);
    }

    return parts.length > 0 
      ? `\n\nCurrent Context:\n${parts.join('\n')}`
      : '\n\nNo active context.';
  }
}

export const agentContextManager = new AgentContextManager();