import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Smartphone, RefreshCw, CheckCircle2, XCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export default function Connect() {
  const { data: status, refetch, isLoading } = trpc.whatsapp.status.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const syncMutation = trpc.whatsapp.syncChats.useMutation({
    onSuccess: () => toast.success("Synchronisation lancée avec succès"),
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Déconnecté de WhatsApp");
      refetch();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const statusConfig = {
    disconnected: {
      label: "Déconnecté",
      color: "bg-gray-100 text-gray-600",
      icon: <WifiOff className="w-4 h-4" />,
    },
    connecting: {
      label: "Connexion en cours...",
      color: "bg-yellow-100 text-yellow-700",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    qr_ready: {
      label: "En attente du scan",
      color: "bg-blue-100 text-blue-700",
      icon: <Smartphone className="w-4 h-4" />,
    },
    authenticated: {
      label: "Authentifié",
      color: "bg-green-100 text-green-700",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    ready: {
      label: "Connecté",
      color: "bg-green-100 text-green-700",
      icon: <Wifi className="w-4 h-4" />,
    },
    error: {
      label: "Erreur",
      color: "bg-red-100 text-red-700",
      icon: <XCircle className="w-4 h-4" />,
    },
  };

  const currentStatus = status?.status ?? "disconnected";
  const config = statusConfig[currentStatus] ?? statusConfig.disconnected;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Connexion WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Connectez votre compte WhatsApp pour commencer à gérer vos conversations.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">État de la connexion</CardTitle>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
              {config.icon}
              {config.label}
            </span>
          </div>
          {status?.phoneNumber && (
            <CardDescription>Connecté en tant que : +{status.phoneNumber}</CardDescription>
          )}
          {status?.lastSync && (
            <CardDescription>
              Dernière synchronisation : {new Date(status.lastSync).toLocaleString("fr-FR")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code */}
          {currentStatus === "qr_ready" && status?.qrCode && (
            <div className="space-y-4">
              <div className="bg-white border-2 border-primary/20 rounded-xl p-6 flex flex-col items-center gap-4">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-foreground">Scannez le QR code</h3>
                  <p className="text-sm text-muted-foreground">
                    Ouvrez WhatsApp sur votre téléphone → Appareils liés → Lier un appareil
                  </p>
                </div>

                {status.qrCode === "DEMO_QR_CODE_PLACEHOLDER" ? (
                  <div className="w-48 h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30">
                    <Smartphone className="w-12 h-12 text-primary/60" />
                    <div className="text-center px-4">
                      <p className="text-xs font-medium text-primary/80">Mode démo</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pour utiliser WhatsApp réel, installez l'application localement
                      </p>
                    </div>
                  </div>
                ) : (
                  <QRCodeDisplay value={status.qrCode} />
                )}

                <div className="flex gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    En attente du scan...
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Comment scanner :</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Ouvrez WhatsApp sur votre téléphone</li>
                  <li>Appuyez sur les 3 points en haut à droite</li>
                  <li>Sélectionnez "Appareils liés"</li>
                  <li>Appuyez sur "Lier un appareil"</li>
                  <li>Scannez le QR code ci-dessus</li>
                </ol>
              </div>
            </div>
          )}

          {/* Ready state */}
          {currentStatus === "ready" && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">WhatsApp connecté</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Vos conversations sont synchronisées automatiquement.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {currentStatus === "error" && status?.error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">Erreur de connexion</p>
                <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {currentStatus === "ready" && (
              <>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Synchroniser les chats
                </Button>
                <Button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  variant="destructive"
                  className="gap-2"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  Déconnecter
                </Button>
              </>
            )}
            {(currentStatus === "disconnected" || currentStatus === "error") && (
              <Button onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Utilisation locale recommandée</p>
              <p className="text-sm text-muted-foreground">
                Pour une connexion WhatsApp réelle, téléchargez et exécutez cette application
                sur votre ordinateur avec Node.js. La connexion via QR code fonctionne uniquement
                en mode local.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QRCodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, value, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    });
  }, [value]);

  return <canvas ref={canvasRef} className="rounded-lg" />;
}
