import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  MessageSquare,
  Bell,
  Edit,
  Loader2,
  Phone,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [editingContact, setEditingContact] = useState<{
    id: number;
    name: string | null;
    notes: string | null;
    tags: string | null;
  } | null>(null);

  const { data: contacts, isLoading } = trpc.contacts.list.useQuery();
  const utils = trpc.useUtils();

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact mis à jour");
      setEditingContact(null);
      utils.contacts.list.invalidate();
    },
    onError: (err) => toast.error("Erreur : " + err.message),
  });

  const filtered = contacts?.filter((c) => {
    const name = c.name ?? c.phone ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-0.5">
            {contacts?.length ?? 0} contact{(contacts?.length ?? 0) !== 1 ? "s" : ""} synchronisé{(contacts?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un contact..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Contacts grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg">Aucun contact</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm">
              Vos contacts WhatsApp apparaîtront ici après la synchronisation.
            </p>
            <Link href="/connect">
              <Button className="mt-4">Connecter WhatsApp</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold text-lg">
                    {(contact.name ?? contact.phone ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {contact.name ?? contact.phone ?? "Inconnu"}
                    </p>
                    {contact.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </p>
                    )}
                    {contact.isGroup && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                        Groupe
                      </span>
                    )}
                    {contact.tags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {JSON.parse(contact.tags).map((tag: string) => (
                          <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-1.5 italic line-clamp-2">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Link href="/conversations" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <MessageSquare className="w-3 h-3" />
                      Message
                    </Button>
                  </Link>
                  <Link href={`/followups?contactId=${contact.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <Bell className="w-3 h-3" />
                      Relancer
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setEditingContact({
                        id: contact.id,
                        name: contact.name,
                        notes: contact.notes,
                        tags: contact.tags,
                      })
                    }
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le contact</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: editingContact.id,
                  name: fd.get("name") as string,
                  notes: fd.get("notes") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input name="name" defaultValue={editingContact.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" defaultValue={editingContact.notes ?? ""} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Enregistrer
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
