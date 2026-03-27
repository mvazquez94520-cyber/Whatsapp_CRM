import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  Bell,
  Archive,
  CheckCheck,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Conversations() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  const { data: conversations, isLoading } = trpc.conversations.list.useQuery({ status: "active" });
  const { data: convDetail } = trpc.conversations.messages.useQuery(
    { conversationId: selectedId! },
    { enabled: !!selectedId }
  );

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      toast.success("Message envoyé");
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const archiveMutation = trpc.conversations.updateStatus.useMutation({
    onSuccess: () => toast.success("Conversation archivée"),
  });

  const utils = trpc.useUtils();

  const filtered = conversations?.filter((c) => {
    const name = c.contact?.name ?? c.contact?.phone ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations?.find((c) => c.conversation.id === selectedId);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv) return;
    sendMutation.mutate({
      chatId: selectedConv.conversation.whatsappChatId,
      message: messageText.trim(),
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar: conversation list */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg mb-3">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune conversation</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Connectez WhatsApp pour voir vos chats
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const isSelected = item.conversation.id === selectedId;
                const name = item.contact?.name ?? item.contact?.phone ?? item.conversation.whatsappChatId;
                const initial = name[0]?.toUpperCase() ?? "?";
                const lastMsgAt = item.conversation.lastMessageAt;

                return (
                  <button
                    key={item.conversation.id}
                    onClick={() => setSelectedId(item.conversation.id)}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-semibold">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {lastMsgAt && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(lastMsgAt), { addSuffix: false, locale: fr })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.conversation.lastMessageFromMe && (
                            <CheckCheck className="w-3 h-3 inline mr-1 text-primary" />
                          )}
                          {item.conversation.lastMessageBody ?? "Aucun message"}
                        </p>
                        {item.conversation.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mt-1">
                            {item.conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main: message view */}
      <div className="flex-1 flex flex-col">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="font-semibold text-lg">Sélectionnez une conversation</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Choisissez une conversation dans la liste pour afficher les messages.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-6 py-4 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  {(selectedConv.contact?.name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedConv.contact?.name ?? selectedConv.contact?.phone ?? "Inconnu"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConv.contact?.phone ?? selectedConv.conversation.whatsappChatId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/followups?contactId=${selectedConv.contact?.id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Bell className="w-4 h-4" />
                    Relancer
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    archiveMutation.mutate({ id: selectedConv.conversation.id, status: "archived" })
                  }
                >
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 flex flex-col">
                {!convDetail || convDetail.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Aucun message chargé
                  </div>
                ) : (
                  [...convDetail].reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 text-sm ${
                          msg.fromMe
                            ? "bubble-out text-foreground"
                            : "bubble-in text-foreground"
                        }`}
                      >
                        <p>{msg.body ?? "(média)"}</p>
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {format(new Date(msg.timestamp), "HH:mm", { locale: fr })}
                          {msg.fromMe && <CheckCheck className="w-3 h-3 inline ml-1 text-primary" />}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Écrire un message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  className="gap-2"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
