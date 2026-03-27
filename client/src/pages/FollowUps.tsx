import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bell,
  Plus,
  Send,
  Trash2,
  Clock,
  CheckCheck,
  XCircle,
  Loader2,
  Calendar,
  User,
  MessageSquare,
  Edit,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useLocation } from "wouter";

type FollowUpStatus = "pending" | "sent" | "failed" | "cancelled";

const statusConfig: Record<FollowUpStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", className: "status-pending", icon: <Clock className="w-3 h-3" /> },
  sent: { label: "Envoyé", className: "status-sent", icon: <CheckCheck className="w-3 h-3" /> },
  failed: { label: "Échoué", className: "status-failed", icon: <XCircle className="w-3 h-3" /> },
  cancelled: { label: "Annulé", className: "status-cancelled", icon: <XCircle className="w-3 h-3" /> },
};

export default function FollowUps() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const preselectedContactId = params.get("contactId") ? Number(params.get("contactId")) : undefined;

  const [activeTab, setActiveTab] = useState<"all" | FollowUpStatus>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(!!preselectedContactId);
  const [editingId, setEditingId] = useState<number | null>(null);

  const statusFilter = activeTab === "all" ? undefined : activeTab;
  const { data: followUps, isLoading, refetch } = trpc.followUps.list.useQuery({ status: statusFilter });
  const { data: contacts } = trpc.contacts.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.followUps.create.useMutation({
    onSuccess: () => {
      toast.success("Relance créée avec succès");
      setIsCreateOpen(false);
      utils.followUps.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const sendNowMutation = trpc.followUps.sendNow.useMutation({
    onSuccess: () => {
      toast.success("Relance envoyée !");
      utils.followUps.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error("Erreur d'envoi : " + err.message),
  });

  const deleteMutation = trpc.followUps.delete.useMutation({
    onSuccess: () => {
      toast.success("Relance supprimée");
      utils.followUps.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const updateMutation = trpc.followUps.update.useMutation({
    onSuccess: () => {
      toast.success("Relance mise à jour");
      setEditingId(null);
      utils.followUps.list.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const counts = {
    all: followUps?.length ?? 0,
    pending: followUps?.filter((f) => f.followUp.status === "pending").length ?? 0,
    sent: followUps?.filter((f) => f.followUp.status === "sent").length ?? 0,
    failed: followUps?.filter((f) => f.followUp.status === "failed").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relances</h1>
          <p className="text-muted-foreground mt-0.5">
            Gérez et planifiez vos relances de prospection
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle relance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer une relance</DialogTitle>
            </DialogHeader>
            <CreateFollowUpForm
              contacts={contacts ?? []}
              templates={templates ?? []}
              preselectedContactId={preselectedContactId}
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="sent">Envoyées ({counts.sent})</TabsTrigger>
          <TabsTrigger value="failed">Échouées ({counts.failed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !followUps || followUps.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="font-semibold text-lg">Aucune relance</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-sm">
                  Créez des relances pour ne jamais oublier de recontacter vos prospects.
                </p>
                <Button className="mt-4 gap-2" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Créer une relance
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {followUps.map((item) => {
                const fu = item.followUp;
                const contact = item.contact;
                const sc = statusConfig[fu.status as FollowUpStatus] ?? statusConfig.pending;

                return (
                  <Card key={fu.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-sm">{fu.title}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  {contact?.name ?? contact?.phone ?? "Contact inconnu"}
                                </span>
                                {fu.scheduledAt && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(fu.scheduledAt), "dd MMM yyyy HH:mm", { locale: fr })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {fu.message}
                          </p>

                          {fu.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">
                              Note : {fu.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-3">
                            {fu.status === "pending" && (
                              <Button
                                size="sm"
                                className="gap-1.5 h-7 text-xs"
                                onClick={() => sendNowMutation.mutate({ id: fu.id })}
                                disabled={sendNowMutation.isPending}
                              >
                                {sendNowMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Envoyer maintenant
                              </Button>
                            )}
                            {fu.status === "failed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-7 text-xs"
                                onClick={() => sendNowMutation.mutate({ id: fu.id })}
                                disabled={sendNowMutation.isPending}
                              >
                                <RefreshCw className="w-3 h-3" />
                                Réessayer
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate({ id: fu.id })}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateFollowUpForm({
  contacts,
  templates,
  preselectedContactId,
  onSubmit,
  isPending,
}: {
  contacts: Array<{ id: number; name: string | null; phone: string | null }>;
  templates: Array<{ id: number; name: string; body: string }>;
  preselectedContactId?: number;
  onSubmit: (data: {
    contactId: number;
    title: string;
    message: string;
    scheduledAt?: Date;
    notes?: string;
    isRecurring?: boolean;
    recurringInterval?: number;
  }) => void;
  isPending: boolean;
}) {
  const [contactId, setContactId] = useState<string>(preselectedContactId ? String(preselectedContactId) : "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const handleTemplateSelect = (templateId: string) => {
    const tmpl = templates.find((t) => String(t.id) === templateId);
    if (tmpl) {
      setMessage(tmpl.body);
      setSelectedTemplate(templateId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !title || !message) return;
    onSubmit({
      contactId: Number(contactId),
      title,
      message,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Contact *</Label>
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un contact" />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name ?? c.phone ?? `Contact #${c.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          placeholder="Ex: Relance devis, Suivi réunion..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {templates.length > 0 && (
        <div className="space-y-2">
          <Label>Utiliser un modèle</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un modèle (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Message *</Label>
        <Textarea
          placeholder="Rédigez votre message de relance..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Planifier à (optionnel)</Label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes internes</Label>
        <Input
          placeholder="Notes pour vous-même..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isPending || !contactId || !title || !message}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        Créer la relance
      </Button>
    </form>
  );
}
