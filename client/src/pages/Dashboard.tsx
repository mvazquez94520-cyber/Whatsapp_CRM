import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  MessageSquare,
  Users,
  Bell,
  CheckCheck,
  ArrowRight,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: waStatus } = trpc.whatsapp.status.useQuery(undefined, { refetchInterval: 5000 });
  const { data: recentMessages, isLoading: msgsLoading } = trpc.messages.recent.useQuery({ limit: 8 });
  const { data: pendingFollowUps } = trpc.followUps.list.useQuery({ status: "pending" });

  const isConnected = waStatus?.status === "ready";

  const statCards = [
    {
      title: "Contacts",
      value: statsLoading ? "—" : String(stats?.totalContacts ?? 0),
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      href: "/contacts",
    },
    {
      title: "Conversations",
      value: statsLoading ? "—" : String(stats?.totalConversations ?? 0),
      icon: <MessageSquare className="w-5 h-5" />,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/conversations",
    },
    {
      title: "Relances en attente",
      value: statsLoading ? "—" : String(stats?.pendingFollowUps ?? 0),
      icon: <Bell className="w-5 h-5" />,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      href: "/followups",
    },
    {
      title: "Relances envoyées",
      value: statsLoading ? "—" : String(stats?.sentFollowUps ?? 0),
      icon: <CheckCheck className="w-5 h-5" />,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
      href: "/followups",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-0.5">
            Vue d'ensemble de votre activité WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <Wifi className="w-3.5 h-3.5" />
              Connecté
            </span>
          ) : (
            <Link href="/connect">
              <Button size="sm" variant="outline" className="gap-2">
                <WifiOff className="w-4 h-4" />
                Se connecter
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold mt-1 text-foreground">{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                    {card.icon}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Voir détails</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Messages récents</CardTitle>
            <Link href="/conversations">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {msgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !recentMessages || recentMessages.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="w-8 h-8" />}
                message="Aucun message récent"
                sub="Connectez WhatsApp pour voir vos messages"
              />
            ) : (
              recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                    {(msg.contact?.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {msg.contact?.name ?? msg.contact?.phone ?? "Inconnu"}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {msg.fromMe && <span className="text-primary mr-1">Vous :</span>}
                      {msg.body ?? "(média)"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Relances à venir</CardTitle>
            <Link href="/followups">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {!pendingFollowUps || pendingFollowUps.length === 0 ? (
              <EmptyState
                icon={<Bell className="w-8 h-8" />}
                message="Aucune relance planifiée"
                sub="Créez des relances pour suivre vos prospects"
                action={
                  <Link href="/followups">
                    <Button size="sm" className="mt-3">Créer une relance</Button>
                  </Link>
                }
              />
            ) : (
              pendingFollowUps.slice(0, 6).map((item) => (
                <div
                  key={item.followUp.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{item.followUp.title}</p>
                      {item.followUp.scheduledAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.followUp.scheduledAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.contact?.name ?? item.contact?.phone ?? "Contact inconnu"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  message,
  sub,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-muted-foreground/40 mb-3">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>
      {action}
    </div>
  );
}
