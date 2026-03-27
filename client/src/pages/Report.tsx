import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileDown,
  MessageSquare,
  Bell,
  TrendingUp,
  Users,
  Loader2,
  Filter,
  CheckCheck,
  Clock,
  XCircle,
} from "lucide-react";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function Report() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = subDays(new Date(), 30);
    return format(d, "yyyy-MM-dd");
  });
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filterType, setFilterType] = useState<"all" | "sent" | "received">("all");

  const { data: recentMessages, isLoading: msgsLoading } = trpc.messages.recent.useQuery({ limit: 500 });
  const { data: followUps, isLoading: fuLoading } = trpc.followUps.list.useQuery({});
  const { data: stats } = trpc.dashboard.stats.useQuery();

  const filteredMessages = useMemo(() => {
    if (!recentMessages) return [];
    const from = startOfDay(new Date(dateFrom));
    const to = endOfDay(new Date(dateTo));
    return recentMessages.filter((msg) => {
      const msgDate = new Date(msg.timestamp);
      if (!isWithinInterval(msgDate, { start: from, end: to })) return false;
      if (filterType === "sent" && !msg.fromMe) return false;
      if (filterType === "received" && msg.fromMe) return false;
      return true;
    });
  }, [recentMessages, dateFrom, dateTo, filterType]);

  const filteredFollowUps = useMemo(() => {
    if (!followUps) return [];
    const from = startOfDay(new Date(dateFrom));
    const to = endOfDay(new Date(dateTo));
    return followUps.filter((fu) => {
      const d = new Date(fu.followUp.createdAt);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [followUps, dateFrom, dateTo]);

  // Chart data: messages per day
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; envoyés: number; reçus: number }> = {};
    filteredMessages.forEach((msg) => {
      const day = format(new Date(msg.timestamp), "dd/MM");
      if (!map[day]) map[day] = { date: day, envoyés: 0, reçus: 0 };
      if (msg.fromMe) map[day].envoyés++;
      else map[day].reçus++;
    });
    return Object.values(map).slice(-14);
  }, [filteredMessages]);

  const followUpStats = useMemo(() => {
    const total = filteredFollowUps.length;
    const sent = filteredFollowUps.filter((f) => f.followUp.status === "sent").length;
    const pending = filteredFollowUps.filter((f) => f.followUp.status === "pending").length;
    const failed = filteredFollowUps.filter((f) => f.followUp.status === "failed").length;
    return { total, sent, pending, failed };
  }, [filteredFollowUps]);

  const handleExportCSV = () => {
    const headers = ["Date", "Contact", "Direction", "Message", "Type"];
    const rows = filteredMessages.map((msg) => [
      format(new Date(msg.timestamp), "dd/MM/yyyy HH:mm"),
      msg.contact?.name ?? msg.contact?.phone ?? "Inconnu",
      msg.fromMe ? "Envoyé" : "Reçu",
      (msg.body ?? "").replace(/,/g, ";"),
      msg.type,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_whatsapp_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const handleExportFollowUpsCSV = () => {
    const headers = ["Date création", "Titre", "Contact", "Statut", "Message", "Planifié le", "Envoyé le"];
    const rows = filteredFollowUps.map((item) => [
      format(new Date(item.followUp.createdAt), "dd/MM/yyyy"),
      item.followUp.title.replace(/,/g, ";"),
      (item.contact?.name ?? item.contact?.phone ?? "Inconnu"),
      item.followUp.status,
      (item.followUp.message ?? "").replace(/,/g, ";").replace(/\n/g, " "),
      item.followUp.scheduledAt ? format(new Date(item.followUp.scheduledAt), "dd/MM/yyyy HH:mm") : "",
      item.followUp.sentAt ? format(new Date(item.followUp.sentAt), "dd/MM/yyyy HH:mm") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_relances_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export relances téléchargé");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapport d'activité</h1>
          <p className="text-muted-foreground mt-0.5">
            Analysez votre activité de prospection WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <FileDown className="w-4 h-4" />
            Export messages
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportFollowUpsCSV}>
            <FileDown className="w-4 h-4" />
            Export relances
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Du</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Au</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type de messages</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les messages</SelectItem>
                  <SelectItem value="sent">Envoyés uniquement</SelectItem>
                  <SelectItem value="received">Reçus uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Messages filtrés"
          value={filteredMessages.length}
          sub={`${filteredMessages.filter((m) => m.fromMe).length} envoyés / ${filteredMessages.filter((m) => !m.fromMe).length} reçus`}
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="Relances créées"
          value={followUpStats.total}
          sub={`${followUpStats.sent} envoyées`}
          color="text-orange-500"
          bg="bg-orange-50 dark:bg-orange-900/20"
        />
        <StatCard
          icon={<CheckCheck className="w-5 h-5" />}
          label="Relances réussies"
          value={followUpStats.sent}
          sub={followUpStats.total > 0 ? `${Math.round((followUpStats.sent / followUpStats.total) * 100)}% de succès` : "—"}
          color="text-green-500"
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="En attente"
          value={followUpStats.pending}
          sub={`${followUpStats.failed} échouées`}
          color="text-yellow-500"
          bg="bg-yellow-50 dark:bg-yellow-900/20"
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité des messages (14 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="envoyés" fill="var(--wa-green)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reçus" fill="var(--wa-teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Messages table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique des messages ({filteredMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {msgsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun message dans cette période
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.slice(0, 50).map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(msg.timestamp), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {msg.contact?.name ?? msg.contact?.phone ?? "Inconnu"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            msg.fromMe
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {msg.fromMe ? (
                            <>
                              <CheckCheck className="w-3 h-3" /> Envoyé
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3" /> Reçu
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {msg.body ?? "(média)"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredMessages.length > 50 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Affichage des 50 premiers résultats. Exportez en CSV pour voir tout.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-ups table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique des relances ({filteredFollowUps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fuLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune relance dans cette période
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Envoyé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowUps.map((item) => {
                    const fu = item.followUp;
                    const sc = {
                      pending: "status-pending",
                      sent: "status-sent",
                      failed: "status-failed",
                      cancelled: "status-cancelled",
                    }[fu.status] ?? "status-pending";
                    return (
                      <TableRow key={fu.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(fu.createdAt), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{fu.title}</TableCell>
                        <TableCell className="text-sm">
                          {item.contact?.name ?? item.contact?.phone ?? "Inconnu"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc}`}>
                            {fu.status === "sent" ? "Envoyé" : fu.status === "pending" ? "En attente" : fu.status === "failed" ? "Échoué" : "Annulé"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fu.sentAt ? format(new Date(fu.sentAt), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
