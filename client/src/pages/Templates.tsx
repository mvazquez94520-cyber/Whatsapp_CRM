import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Copy,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "prospection", label: "Prospection" },
  { value: "relance", label: "Relance" },
  { value: "devis", label: "Devis" },
  { value: "suivi", label: "Suivi" },
  { value: "remerciement", label: "Remerciement" },
];

export default function Templates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number;
    name: string;
    body: string;
    category: string;
  } | null>(null);

  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Modèle créé");
      setIsCreateOpen(false);
      utils.templates.list.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Modèle mis à jour");
      setEditingTemplate(null);
      utils.templates.list.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Modèle supprimé");
      utils.templates.list.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles de messages</h1>
          <p className="text-muted-foreground mt-0.5">
            Créez des modèles réutilisables pour vos relances
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau modèle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un modèle</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg">Aucun modèle</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm">
              Créez des modèles de messages pour accélérer vos relances.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Créer un modèle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{tmpl.name}</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">
                      {categoryLabel(tmpl.category)}
                    </span>
                  </div>
                  {tmpl.usageCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      {tmpl.usageCount}x
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-4 bg-muted/50 rounded-lg p-3">
                  {tmpl.body}
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(tmpl.body);
                      toast.success("Copié dans le presse-papier");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    Copier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setEditingTemplate({
                        id: tmpl.id,
                        name: tmpl.name,
                        body: tmpl.body,
                        category: tmpl.category,
                      })
                    }
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ id: tmpl.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le modèle</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              defaultValues={editingTemplate}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingTemplate.id, ...data })
              }
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: { name: string; body: string; category: string };
  onSubmit: (data: { name: string; body: string; category: string }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [body, setBody] = useState(defaultValues?.body ?? "");
  const [category, setCategory] = useState(defaultValues?.category ?? "general");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, body, category });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Nom du modèle *</Label>
        <Input
          placeholder="Ex: Relance devis 48h"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Catégorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Message *</Label>
        <Textarea
          placeholder="Bonjour {prénom}, je me permets de vous relancer..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
        />
        <p className="text-xs text-muted-foreground">
          Astuce : utilisez {"{prénom}"}, {"{société}"} comme variables personnalisables.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isPending || !name || !body}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {defaultValues ? "Mettre à jour" : "Créer le modèle"}
      </Button>
    </form>
  );
}
