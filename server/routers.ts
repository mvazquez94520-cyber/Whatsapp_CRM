import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createFollowUp,
  createTemplate,
  deleteFollowUp,
  deleteTemplate,
  getContacts,
  getContactById,
  getConversationById,
  getConversations,
  getFollowUpById,
  getFollowUps,
  getMessagesByConversation,
  getRecentMessages,
  getStats,
  getTemplates,
  incrementTemplateUsage,
  updateContact,
  updateConversationStatus,
  updateFollowUp,
  updateTemplate,
} from "./db";
import { whatsappService } from "./whatsapp";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  whatsapp: router({
    status: publicProcedure.query(() => whatsappService.getStatus()),
    disconnect: protectedProcedure.mutation(async () => {
      await whatsappService.disconnect();
      return { success: true };
    }),
    syncChats: protectedProcedure.mutation(async () => {
      await whatsappService.syncChats();
      return { success: true };
    }),
  }),

  contacts: router({
    list: protectedProcedure.query(async () => getContacts()),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getContactById(input.id)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), notes: z.string().optional(), tags: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateContact(id, data);
        return { success: true };
      }),
  }),

  conversations: router({
    list: protectedProcedure
      .input(z.object({ status: z.enum(["active", "archived", "pending"]).optional() }))
      .query(async ({ input }) => getConversations(input.status)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getConversationById(input.id)),
    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "archived", "pending"]) }))
      .mutation(async ({ input }) => {
        await updateConversationStatus(input.id, input.status);
        return { success: true };
      }),
    messages: protectedProcedure
      .input(z.object({ conversationId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => getMessagesByConversation(input.conversationId, input.limit)),
  }),

  messages: router({
    recent: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => getRecentMessages(input.limit)),
    send: protectedProcedure
      .input(z.object({ chatId: z.string(), message: z.string().min(1), templateId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const result = await whatsappService.sendMessage(input.chatId, input.message);
        if (input.templateId) await incrementTemplateUsage(input.templateId);
        return result;
      }),
  }),

  followUps: router({
    list: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "sent", "failed", "cancelled"]).optional() }))
      .query(async ({ input }) => getFollowUps(input.status)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getFollowUpById(input.id)),
    create: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        conversationId: z.number().optional(),
        title: z.string().min(1),
        message: z.string().min(1),
        scheduledAt: z.date().optional(),
        isRecurring: z.boolean().optional(),
        recurringInterval: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => createFollowUp({ ...input, status: "pending" })),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        message: z.string().optional(),
        scheduledAt: z.date().optional().nullable(),
        status: z.enum(["pending", "sent", "failed", "cancelled"]).optional(),
        notes: z.string().optional(),
        isRecurring: z.boolean().optional(),
        recurringInterval: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateFollowUp(id, data as Parameters<typeof updateFollowUp>[1]);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFollowUp(input.id);
        return { success: true };
      }),
    sendNow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const record = await getFollowUpById(input.id);
        if (!record) throw new Error("Relance introuvable");
        if (!record.contact) throw new Error("Contact introuvable");
        try {
          await whatsappService.sendMessage(record.contact.whatsappId, record.followUp.message);
          await updateFollowUp(input.id, { status: "sent", sentAt: new Date() });
          return { success: true };
        } catch (err) {
          await updateFollowUp(input.id, { status: "failed" });
          throw err;
        }
      }),
  }),

  templates: router({
    list: protectedProcedure.query(async () => getTemplates()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), body: z.string().min(1), category: z.string().optional() }))
      .mutation(async ({ input }) => createTemplate({ ...input, category: input.category ?? "general" })),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), body: z.string().optional(), category: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateTemplate(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTemplate(input.id);
        return { success: true };
      }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async () => getStats()),
  }),
});

export type AppRouter = typeof appRouter;
