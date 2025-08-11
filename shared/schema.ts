import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  role: text("role").default("analyst"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"),
  title: text("title"),
  agentType: text("agent_type").notNull(), // 'query' or 'yaml'
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id"),
  role: text("role").notNull(), // 'user' or 'assistant' or 'system'
  content: text("content").notNull(),
  metadata: text("metadata", { mode: 'json' }), // Store SQL queries, execution time, etc.
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const visualizations = sqliteTable("visualizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text("message_id"),
  userId: text("user_id"),
  title: text("title").notNull(),
  description: text("description"),
  chartType: text("chart_type").notNull(), // 'bar', 'line', 'pie', etc.
  chartConfig: text("chart_config", { mode: 'json' }).notNull(), // Plotly config
  data: text("data", { mode: 'json' }).notNull(), // Chart data
  sqlQuery: text("sql_query"),
  isPinned: integer("is_pinned", { mode: 'boolean' }).default(false),
  isPublished: integer("is_published", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const pinnedVisualizations = sqliteTable("pinned_visualizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"),
  visualizationId: text("visualization_id"),
  pinnedAt: integer("pinned_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Snowflake connections
export const snowflakeConnections = sqliteTable("snowflake_connections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(), // User-friendly name for the connection
  account: text("account").notNull(), // Snowflake account identifier
  username: text("username").notNull(),
  password: text("password"), // Encrypted password or PAT token
  database: text("database"),
  schema: text("schema"),
  warehouse: text("warehouse"),
  role: text("role"),
  authenticator: text("authenticator").default("SNOWFLAKE"), // SNOWFLAKE, OAUTH, PAT
  isDefault: integer("is_default", { mode: 'boolean' }).default(false),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  lastConnected: integer("last_connected", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Agent configurations
export const agentConfigurations = sqliteTable("agent_configurations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  configData: text("config_data", { mode: 'json' }).notNull(), // JSON containing functionTools, agentPrompts, agentConfigs
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatSessions: many(chatSessions),
  visualizations: many(visualizations),
  pinnedVisualizations: many(pinnedVisualizations),
  snowflakeConnections: many(snowflakeConnections),
  agentConfigurations: many(agentConfigurations),
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

export const snowflakeConnectionsRelations = relations(snowflakeConnections, ({ one }) => ({
  user: one(users, {
    fields: [snowflakeConnections.userId],
    references: [users.id],
  }),
}));

export const agentConfigurationsRelations = relations(agentConfigurations, ({ one }) => ({
  user: one(users, {
    fields: [agentConfigurations.userId],
    references: [users.id],
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

export const insertSnowflakeConnectionSchema = createInsertSchema(snowflakeConnections).pick({
  userId: true,
  name: true,
  account: true,
  username: true,
  password: true,
  database: true,
  schema: true,
  warehouse: true,
  role: true,
  authenticator: true,
  isDefault: true,
  isActive: true,
});

export type InsertSnowflakeConnection = z.infer<typeof insertSnowflakeConnectionSchema>;
export type SnowflakeConnection = typeof snowflakeConnections.$inferSelect;

export const insertAgentConfigurationSchema = createInsertSchema(agentConfigurations).pick({
  userId: true,
  configData: true,
});

export type InsertAgentConfiguration = z.infer<typeof insertAgentConfigurationSchema>;
export type AgentConfiguration = typeof agentConfigurations.$inferSelect;
