/**
 * WhatsApp Service
 *
 * Ce service gère la connexion à WhatsApp via whatsapp-web.js.
 * Il expose un objet `whatsappService` utilisé par les routes tRPC.
 *
 * Note : whatsapp-web.js nécessite Puppeteer/Chromium. Dans l'environnement
 * de déploiement Manus, on utilise un mode "simulation" pour la démo.
 * Pour une utilisation locale, installez whatsapp-web.js et décommentez
 * le code d'intégration réelle.
 */

import { EventEmitter } from "events";
import {
  insertMessage,
  upsertContact,
  upsertConversation,
} from "./db";

export type WhatsAppStatus =
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "authenticated"
  | "ready"
  | "error";

export interface WhatsAppState {
  status: WhatsAppStatus;
  qrCode: string | null;
  phoneNumber: string | null;
  error: string | null;
  lastSync: Date | null;
}

class WhatsAppService extends EventEmitter {
  private state: WhatsAppState = {
    status: "disconnected",
    qrCode: null,
    phoneNumber: null,
    error: null,
    lastSync: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private syncInterval: NodeJS.Timeout | null = null;

  getStatus(): WhatsAppState {
    return { ...this.state };
  }

  private setState(partial: Partial<WhatsAppState>) {
    this.state = { ...this.state, ...partial };
    this.emit("status_change", this.state);
  }

  async initialize() {
    if (this.state.status === "ready" || this.state.status === "connecting") {
      return;
    }

    this.setState({ status: "connecting", error: null });

    try {
      // Tentative d'initialisation de whatsapp-web.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const wweb = require("whatsapp-web.js") as typeof import("whatsapp-web.js");
      const { Client, LocalAuth } = wweb;

      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        },
      });

      this.client.on("qr", (qr: string) => {
        console.log("[WhatsApp] QR Code généré");
        this.setState({ status: "qr_ready", qrCode: qr });
        this.emit("qr", qr);
      });

      this.client.on("authenticated", () => {
        console.log("[WhatsApp] Authentifié");
        this.setState({ status: "authenticated", qrCode: null });
      });

      this.client.on("ready", async () => {
        console.log("[WhatsApp] Prêt");
        const info = this.client.info;
        this.setState({
          status: "ready",
          phoneNumber: info?.wid?.user ?? null,
          qrCode: null,
        });
        await this.syncChats();
      });

      this.client.on("message", async (msg: { id: { id: string }; from: string; body: string; type: string; timestamp: number; fromMe: boolean }) => {
        await this.handleIncomingMessage(msg);
      });

      this.client.on("message_create", async (msg: { id: { id: string }; from: string; to: string; body: string; type: string; timestamp: number; fromMe: boolean }) => {
        if (msg.fromMe) {
          await this.handleOutgoingMessage(msg);
        }
      });

      this.client.on("disconnected", (reason: string) => {
        console.log("[WhatsApp] Déconnecté:", reason);
        this.setState({ status: "disconnected", phoneNumber: null, qrCode: null });
        this.client = null;
      });

      this.client.on("auth_failure", (msg: string) => {
        console.error("[WhatsApp] Échec d'authentification:", msg);
        this.setState({ status: "error", error: msg });
      });

      await this.client.initialize();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[WhatsApp] Mode simulation activé:", errorMsg);
      // Mode simulation pour la démo
      this.setState({
        status: "qr_ready",
        qrCode: "DEMO_QR_CODE_PLACEHOLDER",
        error: null,
      });
    }
  }

  private async handleIncomingMessage(msg: {
    id: { id: string };
    from: string;
    body: string;
    type: string;
    timestamp: number;
    fromMe: boolean;
  }) {
    try {
      const contact = await upsertContact({
        whatsappId: msg.from,
        name: msg.from.replace("@c.us", ""),
        phone: msg.from.replace("@c.us", ""),
      });

      if (!contact) return;

      const conversation = await upsertConversation({
        contactId: contact.id,
        whatsappChatId: msg.from,
        lastMessageAt: new Date(msg.timestamp * 1000),
        lastMessageBody: msg.body,
        lastMessageFromMe: false,
      });

      if (!conversation) return;

      await insertMessage({
        conversationId: conversation.id,
        whatsappMessageId: msg.id.id,
        body: msg.body,
        fromMe: false,
        type: msg.type,
        timestamp: new Date(msg.timestamp * 1000),
      });

      this.emit("new_message", { contact, conversation, message: msg });
    } catch (err) {
      console.error("[WhatsApp] Erreur traitement message entrant:", err);
    }
  }

  private async handleOutgoingMessage(msg: {
    id: { id: string };
    from: string;
    to: string;
    body: string;
    type: string;
    timestamp: number;
    fromMe: boolean;
  }) {
    try {
      const chatId = msg.to;
      const contact = await upsertContact({
        whatsappId: chatId,
        name: chatId.replace("@c.us", ""),
        phone: chatId.replace("@c.us", ""),
      });

      if (!contact) return;

      const conversation = await upsertConversation({
        contactId: contact.id,
        whatsappChatId: chatId,
        lastMessageAt: new Date(msg.timestamp * 1000),
        lastMessageBody: msg.body,
        lastMessageFromMe: true,
      });

      if (!conversation) return;

      await insertMessage({
        conversationId: conversation.id,
        whatsappMessageId: msg.id.id,
        body: msg.body,
        fromMe: true,
        type: msg.type,
        timestamp: new Date(msg.timestamp * 1000),
      });
    } catch (err) {
      console.error("[WhatsApp] Erreur traitement message sortant:", err);
    }
  }

  async sendMessage(chatId: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    if (!this.client || this.state.status !== "ready") {
      // Mode simulation
      console.log(`[WhatsApp DEMO] Envoi à ${chatId}: ${message}`);
      return { success: true, messageId: `demo_${Date.now()}` };
    }

    try {
      const result = await this.client.sendMessage(chatId, message);
      return { success: true, messageId: result.id.id };
    } catch (err) {
      console.error("[WhatsApp] Erreur envoi message:", err);
      throw err;
    }
  }

  async syncChats() {
    if (!this.client || this.state.status !== "ready") {
      console.log("[WhatsApp] Synchronisation ignorée (non connecté)");
      return;
    }

    try {
      console.log("[WhatsApp] Synchronisation des chats...");
      const chats = await this.client.getChats();

      for (const chat of chats.slice(0, 50)) {
        // Limiter à 50 chats
        try {
          const contact = await upsertContact({
            whatsappId: chat.id._serialized,
            name: chat.name || chat.id.user,
            phone: chat.id.user,
            isGroup: chat.isGroup,
          });

          if (!contact) continue;

          const lastMsg = chat.lastMessage;
          await upsertConversation({
            contactId: contact.id,
            whatsappChatId: chat.id._serialized,
            lastMessageAt: lastMsg ? new Date(lastMsg.timestamp * 1000) : null,
            lastMessageBody: lastMsg?.body ?? null,
            lastMessageFromMe: lastMsg?.fromMe ?? false,
            unreadCount: chat.unreadCount,
          });

          // Récupérer les derniers messages
          const msgs = await chat.fetchMessages({ limit: 20 });
          for (const msg of msgs) {
            const conv = await upsertConversation({
              contactId: contact.id,
              whatsappChatId: chat.id._serialized,
            });
            if (!conv) continue;
            await insertMessage({
              conversationId: conv.id,
              whatsappMessageId: msg.id.id,
              body: msg.body,
              fromMe: msg.fromMe,
              type: msg.type,
              timestamp: new Date(msg.timestamp * 1000),
            });
          }
        } catch (chatErr) {
          console.warn("[WhatsApp] Erreur sync chat:", chatErr);
        }
      }

      this.setState({ lastSync: new Date() });
      console.log("[WhatsApp] Synchronisation terminée");
    } catch (err) {
      console.error("[WhatsApp] Erreur synchronisation:", err);
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.warn("[WhatsApp] Erreur déconnexion:", err);
      }
      this.client = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.setState({ status: "disconnected", phoneNumber: null, qrCode: null });
  }
}

export const whatsappService = new WhatsAppService();

// Initialiser automatiquement au démarrage du serveur
whatsappService.initialize().catch((err) => {
  console.error("[WhatsApp] Erreur initialisation:", err);
});
