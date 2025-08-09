import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  role: text("role").default("analyst"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title"),
  agentType: text("agent_type").notNull(), // 'query' or 'yaml'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => chatSessions.id),
  role: text("role").notNull(), // 'user' or 'assistant' or 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store SQL queries, execution time, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const visualizations = pgTable("visualizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").references(() => chatMessages.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  chartType: text("chart_type").notNull(), // 'bar', 'line', 'pie', etc.
  chartConfig: jsonb("chart_config").notNull(), // Plotly config
  data: jsonb("data").notNull(), // Chart data
  sqlQuery: text("sql_query"),
  isPinned: boolean("is_pinned").default(false),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pinnedVisualizations = pgTable("pinned_visualizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  visualizationId: varchar("visualization_id").references(() => visualizations.id),
  pinnedAt: timestamp("pinned_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatSessions: many(chatSessions),
  visualizations: many(visualizations),
  pinnedVisualizations: many(pinnedVisualizations),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  visualizations: many(visualizations),
}));

export const visualizationsRelations = relations(visualizations, ({ one, many }) => ({
  message: one(chatMessages, {
    fields: [visualizations.messageId],
    references: [chatMessages.id],
  }),
  user: one(users, {
    fields: [visualizations.userId],
    references: [users.id],
  }),
  pinnedBy: many(pinnedVisualizations),
}));

export const pinnedVisualizationsRelations = relations(pinnedVisualizations, ({ one }) => ({
  user: one(users, {
    fields: [pinnedVisualizations.userId],
    references: [users.id],
  }),
  visualization: one(visualizations, {
    fields: [pinnedVisualizations.visualizationId],
    references: [visualizations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  role: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  userId: true,
  title: true,
  agentType: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  role: true,
  content: true,
  metadata: true,
});

export const insertVisualizationSchema = createInsertSchema(visualizations).pick({
  messageId: true,
  userId: true,
  title: true,
  description: true,
  chartType: true,
  chartConfig: true,
  data: true,
  sqlQuery: true,
  isPinned: true,
  isPublished: true,
});

export const insertPinnedVisualizationSchema = createInsertSchema(pinnedVisualizations).pick({
  userId: true,
  visualizationId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertVisualization = z.infer<typeof insertVisualizationSchema>;
export type Visualization = typeof visualizations.$inferSelect;

export type InsertPinnedVisualization = z.infer<typeof insertPinnedVisualizationSchema>;
export type PinnedVisualization = typeof pinnedVisualizations.$inferSelect;
