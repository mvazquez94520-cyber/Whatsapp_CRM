import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getContacts: vi.fn().mockResolvedValue([]),
  getContactById: vi.fn().mockResolvedValue(undefined),
  updateContact: vi.fn().mockResolvedValue(undefined),
  getConversations: vi.fn().mockResolvedValue([]),
  getConversationById: vi.fn().mockResolvedValue(undefined),
  updateConversationStatus: vi.fn().mockResolvedValue(undefined),
  getMessagesByConversation: vi.fn().mockResolvedValue([]),
  getRecentMessages: vi.fn().mockResolvedValue([]),
  getFollowUps: vi.fn().mockResolvedValue([]),
  getFollowUpById: vi.fn().mockResolvedValue(undefined),
  createFollowUp: vi.fn().mockResolvedValue({ id: 1, title: "Test", status: "pending" }),
  updateFollowUp: vi.fn().mockResolvedValue(undefined),
  deleteFollowUp: vi.fn().mockResolvedValue(undefined),
  getTemplates: vi.fn().mockResolvedValue([]),
  createTemplate: vi.fn().mockResolvedValue({ id: 1, name: "Test", body: "Hello", category: "general" }),
  updateTemplate: vi.fn().mockResolvedValue(undefined),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  incrementTemplateUsage: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockResolvedValue({
    totalContacts: 5,
    totalConversations: 3,
    pendingFollowUps: 2,
    sentFollowUps: 1,
    recentMessages: [],
  }),
  upsertContact: vi.fn().mockResolvedValue({ id: 1, whatsappId: "123@c.us", name: "Test" }),
  upsertConversation: vi.fn().mockResolvedValue({ id: 1, whatsappChatId: "123@c.us" }),
  insertMessage: vi.fn().mockResolvedValue(undefined),
}));

// Mock the whatsapp service
vi.mock("./whatsapp", () => ({
  whatsappService: {
    getStatus: vi.fn().mockReturnValue({
      status: "disconnected",
      qrCode: null,
      phoneNumber: null,
      error: null,
      lastSync: null,
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    syncChats: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: "test123" }),
  },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("WhatsApp Manager - Routes tRPC", () => {
  describe("whatsapp.status", () => {
    it("retourne le statut WhatsApp sans authentification", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const status = await caller.whatsapp.status();
      expect(status.status).toBe("disconnected");
      expect(status.qrCode).toBeNull();
    });
  });

  describe("contacts.list", () => {
    it("retourne la liste des contacts pour un utilisateur authentifié", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const contacts = await caller.contacts.list();
      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  describe("conversations.list", () => {
    it("retourne les conversations actives", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const convs = await caller.conversations.list({ status: "active" });
      expect(Array.isArray(convs)).toBe(true);
    });
  });

  describe("messages.recent", () => {
    it("retourne les messages récents", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const msgs = await caller.messages.recent({ limit: 10 });
      expect(Array.isArray(msgs)).toBe(true);
    });
  });

  describe("messages.send", () => {
    it("envoie un message avec succès", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.messages.send({
        chatId: "33612345678@c.us",
        message: "Bonjour, je me permets de vous relancer.",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("followUps.list", () => {
    it("retourne les relances en attente", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const followUps = await caller.followUps.list({ status: "pending" });
      expect(Array.isArray(followUps)).toBe(true);
    });
  });

  describe("followUps.create", () => {
    it("crée une nouvelle relance", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.followUps.create({
        contactId: 1,
        title: "Relance devis",
        message: "Bonjour, avez-vous eu le temps de consulter notre devis ?",
      });
      expect(result).toBeDefined();
    });
  });

  describe("templates.list", () => {
    it("retourne la liste des modèles", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const templates = await caller.templates.list();
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe("templates.create", () => {
    it("crée un nouveau modèle de message", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.templates.create({
        name: "Relance standard",
        body: "Bonjour {prénom}, je me permets de vous relancer concernant notre échange.",
        category: "relance",
      });
      expect(result).toBeDefined();
    });
  });

  describe("dashboard.stats", () => {
    it("retourne les statistiques du tableau de bord", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.dashboard.stats();
      expect(stats).toBeDefined();
      expect(stats?.totalContacts).toBe(5);
      expect(stats?.pendingFollowUps).toBe(2);
    });
  });
});
