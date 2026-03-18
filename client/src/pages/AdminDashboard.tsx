import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Building2, FileText, Moon, Sun, PlusCircle, Edit, Trash2, ArrowLeft, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { type Publisher, type ArticleWithDetails, type Category } from "@shared/schema";

type AdminView = "overview" | "publishers" | "articles" | "categories";

const EMPTY_PUBLISHER = { name: "", slug: "", description: "", website: "", biasRating: "", logoUrl: "" };

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function AdminDashboard() {
  const { user, profile, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<AdminView>("overview");
  const [pubModal, setPubModal] = useState(false);
  const [editPub, setEditPub] = useState<Publisher | null>(null);
  const [pubForm, setPubForm] = useState(EMPTY_PUBLISHER);
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [deleteId, setDeleteId] = useState<{ type: "publisher" | "article"; id: string } | null>(null);

  if (!user || user.role !== "admin") { setLocation("/"); return null; }

  const { data: publishersData = [], isLoading: loadingPubs } = useQuery({
    queryKey: ["/api/publishers"],
    queryFn: api.publishers.list,
  });

  const { data: articlesData, isLoading: loadingArticles } = useQuery({
    queryKey: ["/api/articles", { limit: 50 }],
    queryFn: () => api.articles.list({ limit: 50 }),
  });

  const { data: categories = [] } = useQuery({ queryKey: ["/api/categories"], queryFn: api.categories.list });

  const publishers = publishersData as Publisher[];
  const articles = articlesData?.articles ?? [];

  const createPubMutation = useMutation({
    mutationFn: (data: any) => editPub ? api.publishers.update(editPub.id, data) : api.publishers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      toast({ title: editPub ? "Publisher updated!" : "Publisher added!" });
      setPubModal(false); setEditPub(null); setPubForm(EMPTY_PUBLISHER);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePubMutation = useMutation({
    mutationFn: (id: string) => api.publishers.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/publishers"] }); toast({ title: "Deleted" }); setDeleteId(null); },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => api.articles.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/articles"] }); toast({ title: "Article deleted" }); setDeleteId(null); },
  });

  const createCatMutation = useMutation({
    mutationFn: (name: string) => api.categories.create({ name, slug: slugify(name) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); toast({ title: "Category added!" }); setCatModal(false); setCatName(""); },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.articles.publish(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/articles"] }); toast({ title: "Published!" }); },
  });

  const startEditPub = (pub: Publisher) => {
    setEditPub(pub);
    setPubForm({ name: pub.name, slug: pub.slug, description: pub.description ?? "", website: pub.website ?? "", biasRating: pub.biasRating ?? "", logoUrl: pub.logoUrl ?? "" });
    setPubModal(true);
  };

  const stats = [
    { label: "Total Articles", value: articlesData?.total ?? 0, icon: FileText },
    { label: "Publishers", value: publishers.length, icon: Building2 },
    { label: "Published", value: articles.filter((a: ArticleWithDetails) => a.status === "published").length, icon: ShieldCheck },
    { label: "Drafts", value: articles.filter((a: ArticleWithDetails) => a.status === "draft").length, icon: LayoutDashboard },
  ];

  const navItems: { icon: any; label: string; view: AdminView }[] = [
    { icon: LayoutDashboard, label: "Overview", view: "overview" },
    { icon: Building2, label: "Publishers", view: "publishers" },
    { icon: FileText, label: "Articles", view: "articles" },
    { icon: ShieldCheck, label: "Categories", view: "categories" },
  ];

  const style = { "--sidebar-width": "14rem" } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>
                <span className="font-black"><span className="text-primary">G</span>ROUND NEWS</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        onClick={() => setView(item.view)}
                        data-active={view === item.view}
                        data-testid={`nav-${item.view}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setLocation("/")} data-testid="nav-back">
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Site</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-3 border-b bg-background flex-shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="font-bold text-base">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">{profile?.displayName} · Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="p-1.5 rounded-md hover-elevate active-elevate-2 text-muted-foreground">
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <Button variant="outline" size="sm" onClick={logout} className="h-8 text-xs">Sign Out</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {view === "overview" && (
              <div>
                <h2 className="text-xl font-bold mb-6">Platform Overview</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-card border border-card-border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                        <s.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-3xl font-bold" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-card border border-card-border rounded-md p-4">
                  <h3 className="font-semibold mb-3">Quick Links</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setView("publishers")}>Manage Publishers</Button>
                    <Button size="sm" variant="outline" onClick={() => setView("articles")}>Manage Articles</Button>
                    <Button size="sm" variant="outline" onClick={() => setView("categories")}>Manage Categories</Button>
                  </div>
                </div>
              </div>
            )}

            {view === "publishers" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Publishers</h2>
                  <Button size="sm" onClick={() => { setEditPub(null); setPubForm(EMPTY_PUBLISHER); setPubModal(true); }} data-testid="button-add-publisher">
                    <PlusCircle className="w-4 h-4 mr-1.5" />Add Publisher
                  </Button>
                </div>
                {loadingPubs ? <Skeleton className="h-40 w-full" /> : (
                  <div className="border border-card-border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Publisher</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Bias</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {publishers.map((pub) => (
                          <TableRow key={pub.id} className="hover:bg-muted/30" data-testid={`pub-row-${pub.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                                  {pub.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{pub.name}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{pub.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{pub.website}</TableCell>
                            <TableCell>
                              {pub.biasRating && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pub.biasRating === "left" ? "bg-blue-100 text-blue-700" : pub.biasRating === "right" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                                  {pub.biasRating}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <button onClick={() => startEditPub(pub)} className="p-1.5 hover-elevate active-elevate-2 rounded text-muted-foreground hover:text-foreground" data-testid={`edit-pub-${pub.id}`}>
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteId({ type: "publisher", id: pub.id })} className="p-1.5 hover-elevate active-elevate-2 rounded text-muted-foreground hover:text-destructive" data-testid={`delete-pub-${pub.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {view === "articles" && (
              <div>
                <h2 className="text-xl font-bold mb-6">All Articles</h2>
                {loadingArticles ? <Skeleton className="h-60 w-full" /> : (
                  <div className="border border-card-border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Title</TableHead>
                          <TableHead>Publisher</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {articles.map((article: ArticleWithDetails) => (
                          <TableRow key={article.id} className="hover:bg-muted/30">
                            <TableCell><p className="text-sm font-medium line-clamp-1 max-w-xs">{article.title}</p></TableCell>
                            <TableCell className="text-sm">{article.publisher?.name}</TableCell>
                            <TableCell className="text-sm">{article.author?.displayName}</TableCell>
                            <TableCell>
                              <Badge variant={article.status === "published" ? "default" : "secondary"} className="text-xs">
                                {article.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {article.status === "draft" && (
                                  <button onClick={() => publishMutation.mutate(article.id)} className="p-1.5 hover-elevate active-elevate-2 rounded text-green-600" title="Publish" data-testid={`publish-${article.id}`}>
                                    <ShieldCheck className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => setDeleteId({ type: "article", id: article.id })} className="p-1.5 hover-elevate active-elevate-2 rounded text-muted-foreground hover:text-destructive" data-testid={`delete-art-${article.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {view === "categories" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Categories</h2>
                  <Button size="sm" onClick={() => setCatModal(true)} data-testid="button-add-category">
                    <PlusCircle className="w-4 h-4 mr-1.5" />Add Category
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(categories as Category[]).map((cat: Category) => (
                    <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 bg-card border border-card-border rounded-md text-sm">
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Publisher modal */}
      <Dialog open={pubModal} onOpenChange={(o) => { setPubModal(o); if (!o) { setEditPub(null); setPubForm(EMPTY_PUBLISHER); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editPub ? "Edit Publisher" : "Add Publisher"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(["name", "slug", "description", "website", "logoUrl"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field} className="capitalize">{field === "logoUrl" ? "Logo URL" : field}</Label>
                <Input id={field} value={pubForm[field]} onChange={(e) => {
                  const v = e.target.value;
                  setPubForm((f) => ({ ...f, [field]: v, ...(field === "name" && !editPub ? { slug: slugify(v) } : {}) }));
                }} data-testid={`input-pub-${field}`} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Bias Rating</Label>
              <Select value={pubForm.biasRating} onValueChange={(v) => setPubForm({ ...pubForm, biasRating: v })}>
                <SelectTrigger data-testid="select-pub-bias"><SelectValue placeholder="Select bias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createPubMutation.mutate({ ...pubForm, biasRating: pubForm.biasRating || null })} disabled={createPubMutation.isPending || !pubForm.name} className="w-full" data-testid="button-save-publisher">
              {editPub ? "Update" : "Add Publisher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category modal */}
      <Dialog open={catModal} onOpenChange={setCatModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Technology" data-testid="input-cat-name" />
            </div>
            <Button onClick={() => createCatMutation.mutate(catName)} disabled={!catName || createCatMutation.isPending} className="w-full" data-testid="button-save-category">
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteId?.type === "publisher") deletePubMutation.mutate(deleteId.id);
              else if (deleteId?.type === "article") deleteArticleMutation.mutate(deleteId.id);
            }} className="flex-1" data-testid="confirm-delete">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
