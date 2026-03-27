import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Contact,
  Conversation,
  FollowUp,
  InsertContact,
  InsertConversation,
  InsertFollowUp,
  InsertMessage,
  InsertMessageTemplate,
  InsertUser,
  Message,
  MessageTemplate,
  contacts,
  conversations,
  followUps,
  messageTemplates,
  messages,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function upsertContact(contact: InsertContact): Promise<Contact | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(contacts).values(contact).onDuplicateKeyUpdate({
    set: {
      name: contact.name,
      phone: contact.phone,
      profilePicUrl: contact.profilePicUrl,
      updatedAt: new Date(),
    },
  });
  const result = await db.select().from(contacts).where(eq(contacts.whatsappId, contact.whatsappId)).limit(1);
  return result[0];
}

export async function getContacts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts).orderBy(desc(contacts.updatedAt));
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0];
}

export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set({ ...data, updatedAt: new Date() }).where(eq(contacts.id, id));
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function upsertConversation(conv: InsertConversation): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(conversations).values(conv).onDuplicateKeyUpdate({
    set: {
      lastMessageAt: conv.lastMessageAt,
      lastMessageBody: conv.lastMessageBody,
      lastMessageFromMe: conv.lastMessageFromMe,
      unreadCount: conv.unreadCount,
      updatedAt: new Date(),
    },
  });
  const result = await db.select().from(conversations).where(eq(conversations.whatsappChatId, conv.whatsappChatId)).limit(1);
  return result[0];
}

export async function getConversations(status?: "active" | "archived" | "pending") {
  const db = await getDb();
  if (!db) return [];
  const base = db
    .select({ conversation: conversations, contact: contacts })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .orderBy(desc(conversations.lastMessageAt));
  if (status) return base.where(eq(conversations.status, status));
  return base;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ conversation: conversations, contact: contacts })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(eq(conversations.id, id))
    .limit(1);
  return result[0];
}

export async function updateConversationStatus(id: number, status: "active" | "archived" | "pending") {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set({ status, updatedAt: new Date() }).where(eq(conversations.id, id));
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function insertMessage(msg: InsertMessage): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(messages).values(msg).onDuplicateKeyUpdate({ set: { body: msg.body } });
}

export async function getMessagesByConversation(conversationId: number, limit = 50): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.timestamp)).limit(limit);
}

export async function getRecentMessages(limit = 100): Promise<(Message & { contact: Contact | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ message: messages, conversation: conversations, contact: contacts })
    .from(messages)
    .leftJoin(conversations, eq(messages.conversationId, conversations.id))
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .orderBy(desc(messages.timestamp))
    .limit(limit);
  return result.map((r) => ({ ...r.message, contact: r.contact ?? null }));
}

// ─── Follow-ups (Relances) ────────────────────────────────────────────────────

export async function createFollowUp(data: InsertFollowUp): Promise<FollowUp | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(followUps).values(data);
  const id = (result as unknown as { insertId: number }).insertId;
  const rows = await db.select().from(followUps).where(eq(followUps.id, id)).limit(1);
  return rows[0];
}

export async function getFollowUps(status?: "pending" | "sent" | "failed" | "cancelled") {
  const db = await getDb();
  if (!db) return [];
  const base = db
    .select({ followUp: followUps, contact: contacts })
    .from(followUps)
    .leftJoin(contacts, eq(followUps.contactId, contacts.id))
    .orderBy(desc(followUps.createdAt));
  if (status) return base.where(eq(followUps.status, status));
  return base;
}

export async function getFollowUpById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ followUp: followUps, contact: contacts })
    .from(followUps)
    .leftJoin(contacts, eq(followUps.contactId, contacts.id))
    .where(eq(followUps.id, id))
    .limit(1);
  return result[0];
}

export async function updateFollowUp(id: number, data: Partial<InsertFollowUp>) {
  const db = await getDb();
  if (!db) return;
  await db.update(followUps).set({ ...data, updatedAt: new Date() }).where(eq(followUps.id, id));
}

export async function deleteFollowUp(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(followUps).where(eq(followUps.id, id));
}

export async function getPendingScheduledFollowUps() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(followUps).where(and(eq(followUps.status, "pending"), lte(followUps.scheduledAt, now)));
}

// ─── Message Templates ────────────────────────────────────────────────────────

export async function createTemplate(data: InsertMessageTemplate): Promise<MessageTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(messageTemplates).values(data);
  const id = (result as unknown as { insertId: number }).insertId;
  const rows = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id)).limit(1);
  return rows[0];
}

export async function getTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messageTemplates).orderBy(desc(messageTemplates.usageCount));
}

export async function updateTemplate(id: number, data: Partial<InsertMessageTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(messageTemplates).set({ ...data, updatedAt: new Date() }).where(eq(messageTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  const tmpl = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id)).limit(1);
  if (tmpl[0]) {
    await db.update(messageTemplates).set({ usageCount: (tmpl[0].usageCount ?? 0) + 1 }).where(eq(messageTemplates.id, id));
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  const db = await getDb();
  if (!db) return null;

  const [tc] = await db.select({ count: contacts.id }).from(contacts);
  const [tv] = await db.select({ count: conversations.id }).from(conversations);
  const [pf] = await db.select({ count: followUps.id }).from(followUps).where(eq(followUps.status, "pending"));
  const [sf] = await db.select({ count: followUps.id }).from(followUps).where(eq(followUps.status, "sent"));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMessages = await db
    .select({ message: messages, contact: contacts })
    .from(messages)
    .leftJoin(conversations, eq(messages.conversationId, conversations.id))
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(gte(messages.timestamp, sevenDaysAgo))
    .orderBy(desc(messages.timestamp))
    .limit(10);

  return {
    totalContacts: tc?.count ?? 0,
    totalConversations: tv?.count ?? 0,
    pendingFollowUps: pf?.count ?? 0,
    sentFollowUps: sf?.count ?? 0,
    recentMessages: recentMessages.map((r) => ({ ...r.message, contact: r.contact ?? null })),
  };
}
