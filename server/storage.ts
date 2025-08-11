import { 
  users, chatSessions, chatMessages, visualizations, pinnedVisualizations, snowflakeConnections, agentConfigurations,
  type User, type InsertUser, type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage, type Visualization, type InsertVisualization,
  type PinnedVisualization, type InsertPinnedVisualization,
  type SnowflakeConnection, type InsertSnowflakeConnection,
  type AgentConfiguration, type InsertAgentConfiguration
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat session methods
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getChatSessionsByUser(userId: string): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession>;
  deleteChatSession(id: string): Promise<void>;
  deleteChatSessions(ids: string[]): Promise<void>;

  // Chat message methods
  getMessagesBySession(sessionId: string): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Visualization methods
  getVisualization(id: string): Promise<Visualization | undefined>;
  getVisualizationsByUser(userId: string): Promise<Visualization[]>;
  createVisualization(visualization: InsertVisualization): Promise<Visualization>;
  updateVisualization(id: string, updates: Partial<Visualization>): Promise<Visualization>;
  deleteVisualization(id: string): Promise<void>;

  // Pinned visualization methods
  getPinnedVisualizationsByUser(userId: string): Promise<(PinnedVisualization & { visualization: Visualization })[]>;
  pinVisualization(pin: InsertPinnedVisualization): Promise<PinnedVisualization>;
  unpinVisualization(userId: string, visualizationId: string): Promise<void>;

  // Published visualizations
  getPublishedVisualizations(): Promise<Visualization[]>;

  // Snowflake connection methods
  getSnowflakeConnections(userId: string): Promise<SnowflakeConnection[]>;
  getSnowflakeConnection(id: string): Promise<SnowflakeConnection | undefined>;
  getDefaultSnowflakeConnection(userId: string): Promise<SnowflakeConnection | undefined>;
  createSnowflakeConnection(connection: InsertSnowflakeConnection): Promise<SnowflakeConnection>;
  updateSnowflakeConnection(id: string, updates: Partial<SnowflakeConnection>): Promise<SnowflakeConnection>;
  deleteSnowflakeConnection(id: string): Promise<void>;
  setDefaultSnowflakeConnection(userId: string, connectionId: string): Promise<void>;

  // Agent configuration methods
  getAgentConfiguration(userId: string): Promise<AgentConfiguration | null>;
  saveAgentConfiguration(userId: string, config: any): Promise<AgentConfiguration>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [newSession] = await db
      .insert(chatSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const [updated] = await db
      .update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return updated;
  }

  async deleteChatSession(id: string): Promise<void> {
    // Delete messages first (cascade)
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    // Then delete the session
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
  }

  async deleteChatSessions(ids: string[]): Promise<void> {
    // Delete messages for all sessions
    await db.delete(chatMessages).where(
      inArray(chatMessages.sessionId, ids)
    );
    // Then delete the sessions
    await db.delete(chatSessions).where(
      inArray(chatSessions.id, ids)
    );
  }

  async getMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async createMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getVisualization(id: string): Promise<Visualization | undefined> {
    const [viz] = await db.select().from(visualizations).where(eq(visualizations.id, id));
    return viz || undefined;
  }

  async getVisualizationsByUser(userId: string): Promise<Visualization[]> {
    return await db
      .select()
      .from(visualizations)
      .where(eq(visualizations.userId, userId))
      .orderBy(desc(visualizations.createdAt));
  }

  async createVisualization(visualization: InsertVisualization): Promise<Visualization> {
    const [newViz] = await db
      .insert(visualizations)
      .values(visualization)
      .returning();
    return newViz;
  }

  async updateVisualization(id: string, updates: Partial<Visualization>): Promise<Visualization> {
    const [updated] = await db
      .update(visualizations)
      .set(updates)
      .where(eq(visualizations.id, id))
      .returning();
    return updated;
  }

  async deleteVisualization(id: string): Promise<void> {
    await db.delete(visualizations).where(eq(visualizations.id, id));
  }

  async getPinnedVisualizationsByUser(userId: string): Promise<(PinnedVisualization & { visualization: Visualization })[]> {
    return await db
      .select({
        id: pinnedVisualizations.id,
        userId: pinnedVisualizations.userId,
        visualizationId: pinnedVisualizations.visualizationId,
        pinnedAt: pinnedVisualizations.pinnedAt,
        visualization: visualizations,
      })
      .from(pinnedVisualizations)
      .innerJoin(visualizations, eq(pinnedVisualizations.visualizationId, visualizations.id))
      .where(eq(pinnedVisualizations.userId, userId))
      .orderBy(desc(pinnedVisualizations.pinnedAt));
  }

  async pinVisualization(pin: InsertPinnedVisualization): Promise<PinnedVisualization> {
    const [newPin] = await db
      .insert(pinnedVisualizations)
      .values(pin)
      .returning();
    return newPin;
  }

  async unpinVisualization(userId: string, visualizationId: string): Promise<void> {
    await db
      .delete(pinnedVisualizations)
      .where(
        and(
          eq(pinnedVisualizations.userId, userId),
          eq(pinnedVisualizations.visualizationId, visualizationId)
        )
      );
  }

  async getPublishedVisualizations(): Promise<Visualization[]> {
    return await db
      .select()
      .from(visualizations)
      .where(eq(visualizations.isPublished, true))
      .orderBy(desc(visualizations.createdAt));
  }

  // Snowflake connection methods
  async getSnowflakeConnections(userId: string): Promise<SnowflakeConnection[]> {
    return await db
      .select()
      .from(snowflakeConnections)
      .where(eq(snowflakeConnections.userId, userId))
      .orderBy(desc(snowflakeConnections.isDefault), desc(snowflakeConnections.updatedAt));
  }

  async getSnowflakeConnection(id: string): Promise<SnowflakeConnection | undefined> {
    const [connection] = await db
      .select()
      .from(snowflakeConnections)
      .where(eq(snowflakeConnections.id, id));
    return connection || undefined;
  }

  async getDefaultSnowflakeConnection(userId: string): Promise<SnowflakeConnection | undefined> {
    const [connection] = await db
      .select()
      .from(snowflakeConnections)
      .where(and(
        eq(snowflakeConnections.userId, userId),
        eq(snowflakeConnections.isDefault, true),
        eq(snowflakeConnections.isActive, true)
      ));
    return connection || undefined;
  }

  async createSnowflakeConnection(connection: InsertSnowflakeConnection): Promise<SnowflakeConnection> {
    const [newConnection] = await db
      .insert(snowflakeConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateSnowflakeConnection(id: string, updates: Partial<SnowflakeConnection>): Promise<SnowflakeConnection> {
    const [updated] = await db
      .update(snowflakeConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(snowflakeConnections.id, id))
      .returning();
    return updated;
  }

  async deleteSnowflakeConnection(id: string): Promise<void> {
    await db.delete(snowflakeConnections).where(eq(snowflakeConnections.id, id));
  }

  async setDefaultSnowflakeConnection(userId: string, connectionId: string): Promise<void> {
    // First, unset all other default connections for this user
    await db
      .update(snowflakeConnections)
      .set({ isDefault: false })
      .where(eq(snowflakeConnections.userId, userId));

    // Then set the specified connection as default
    await db
      .update(snowflakeConnections)
      .set({ isDefault: true })
      .where(eq(snowflakeConnections.id, connectionId));
  }

  async getAgentConfiguration(userId: string): Promise<AgentConfiguration | null> {
    const [config] = await db
      .select()
      .from(agentConfigurations)
      .where(eq(agentConfigurations.userId, userId))
      .orderBy(desc(agentConfigurations.updatedAt))
      .limit(1);
    
    return config || null;
  }

  async saveAgentConfiguration(userId: string, config: any): Promise<AgentConfiguration> {
    console.log(`Saving agent configuration for user ${userId}:`, {
      functionToolsCount: config.functionTools?.length || 0,
      agentPromptsCount: config.agentPrompts?.length || 0,
      agentConfigsCount: config.agentConfigs?.length || 0
    });

    // Check if configuration exists for this user
    const existingConfig = await this.getAgentConfiguration(userId);
    
    if (existingConfig) {
      // Update existing configuration
      const [updated] = await db
        .update(agentConfigurations)
        .set({ 
          configData: config,
          updatedAt: new Date()
        })
        .where(eq(agentConfigurations.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new configuration
      const [newConfig] = await db
        .insert(agentConfigurations)
        .values({
          userId,
          configData: config
        })
        .returning();
      return newConfig;
    }
  }
}

export const storage = new DatabaseStorage();
