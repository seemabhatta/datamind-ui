import { 
  users, chatSessions, chatMessages, visualizations, pinnedVisualizations,
  type User, type InsertUser, type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage, type Visualization, type InsertVisualization,
  type PinnedVisualization, type InsertPinnedVisualization
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
