import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Contacts WhatsApp (prospects)
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  whatsappId: varchar("whatsappId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  profilePicUrl: text("profilePicUrl"),
  isGroup: boolean("isGroup").default(false).notNull(),
  tags: text("tags"), // JSON array of tags
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// Conversations
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  whatsappChatId: varchar("whatsappChatId", { length: 128 }).notNull().unique(),
  lastMessageAt: timestamp("lastMessageAt"),
  lastMessageBody: text("lastMessageBody"),
  lastMessageFromMe: boolean("lastMessageFromMe").default(false),
  unreadCount: int("unreadCount").default(0).notNull(),
  status: mysqlEnum("status", ["active", "archived", "pending"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Messages
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  whatsappMessageId: varchar("whatsappMessageId", { length: 128 }).notNull().unique(),
  body: text("body"),
  fromMe: boolean("fromMe").default(false).notNull(),
  type: varchar("type", { length: 32 }).default("chat").notNull(),
  mediaUrl: text("mediaUrl"),
  timestamp: timestamp("timestamp").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Relances (follow-ups)
export const followUps = mysqlTable("followUps", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  conversationId: int("conversationId"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).default("pending").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurringInterval: int("recurringInterval"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = typeof followUps.$inferInsert;

// Templates de messages
export const messageTemplates = mysqlTable("messageTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;