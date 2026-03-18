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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, PlusCircle, Edit, Trash2, Moon, Sun, Eye, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatDistanceToNow } from "date-fns";
import { type ArticleWithDetails, type Publisher, type Category } from "@shared/schema";

type View = "list" | "create" | "edit";

const EMPTY_FORM = { title: "", slug: "", excerpt: "", bodyHtml: "", heroImageUrl: "", publisherId: "", bias: "", categoryIds: [] as string[], tagNames: "" };

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function EditorDashboard() {
  const { user, profile, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("list");
  const [editingArticle, setEditingArticle] = useState<ArticleWithDetails | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!user) {
    setLocation("/");
    return null;
  }

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["/api/articles", { authorId: user.id }],
    queryFn: () => api.articles.list({ limit: 50 }),
  });

  const { data: publishers = [] } = useQuery({ queryKey: ["/api/publishers"], queryFn: api.publishers.list });
  const { data: categories = [] } = useQuery({ queryKey: ["/api/categories"], queryFn: api.categories.list });

  const myArticles = articlesData?.articles.filter((a: ArticleWithDetails) => a.authorId === user.id) ?? [];

  const createMutation = useMutation({
    mutationFn: (status: "draft" | "published") => {
      const payload = { ...form, status, authorId: user.id };
      return api.articles.create(payload);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: status === "published" ? "Article published!" : "Draft saved!" });
      setView("list");
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.articles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Article updated!" });
      setView("list");
      setEditingArticle(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.articles.publish(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/articles"] }); toast({ title: "Published!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.articles.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/articles"] }); toast({ title: "Deleted" }); setDeleteId(null); },
  });

  const startEdit = (article: ArticleWithDetails) => {
    setEditingArticle(article);
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      bodyHtml: article.bodyHtml,
      heroImageUrl: article.heroImageUrl ?? "",
      publisherId: article.publisherId,
      bias: article.bias,
      categoryIds: article.categories?.map((c) => c.id) ?? [],
      tagNames: article.tags?.map((t) => t.name).join(", ") ?? "",
    });
    setView("edit");
  };

  const handleTitleChange = (title: string) => {
    setForm((f) => ({ ...f, title, slug: f.slug || slugify(title) }));
  };

  const statusBadge = (status: string) => {
    if (status === "published") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">{status}</Badge>;
    return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  };

  const menuItems = [
    { icon: FileText, label: "My Articles", action: () => setView("list") },
    { icon: PlusCircle, label: "Write New", action: () => { setForm(EMPTY_FORM); setEditingArticle(null); setView("create"); } },
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
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton onClick={item.action} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setLocation("/")} data-testid="nav-back-to-site">
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
              <SidebarTrigger data-testid="sidebar-trigger" />
              <div>
                <h1 className="font-bold text-base">Editor Dashboard</h1>
                <p className="text-xs text-muted-foreground">{profile?.displayName} · Editor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-1.5 rounded-md hover-elevate active-elevate-2 text-muted-foreground hover:text-foreground"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <Button variant="outline" size="sm" onClick={logout} className="h-8 text-xs">Sign Out</Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {view === "list" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">My Articles</h2>
                  <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setEditingArticle(null); setView("create"); }} data-testid="button-new-article">
                    <PlusCircle className="w-4 h-4 mr-1.5" />New Article
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : myArticles.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No articles yet</p>
                    <p className="text-sm mt-1">Click "New Article" to start writing</p>
                  </div>
                ) : (
                  <div className="border border-card-border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Title</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead className="hidden md:table-cell">Bias</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myArticles.map((article: ArticleWithDetails) => (
                          <TableRow key={article.id} className="hover:bg-muted/30" data-testid={`row-${article.id}`}>
                            <TableCell>
                              <p className="font-medium text-sm line-clamp-1">{article.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{article.excerpt}</p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{article.categories?.[0]?.name ?? "—"}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${article.bias === "left" ? "bg-blue-100 text-blue-700" : article.bias === "right" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                                {article.bias}
                              </span>
                            </TableCell>
                            <TableCell>{statusBadge(article.status)}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) : "Draft"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {article.status === "draft" && (
                                  <button
                                    onClick={() => publishMutation.mutate(article.id)}
                                    className="p-1.5 hover-elevate active-elevate-2 rounded text-green-600 hover:text-green-700"
                                    title="Publish"
                                    data-testid={`publish-${article.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => startEdit(article)}
                                  className="p-1.5 hover-elevate active-elevate-2 rounded text-muted-foreground hover:text-foreground"
                                  title="Edit"
                                  data-testid={`edit-${article.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(article.id)}
                                  className="p-1.5 hover-elevate active-elevate-2 rounded text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                  data-testid={`delete-${article.id}`}
                                >
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

            {(view === "create" || view === "edit") && (
              <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">{view === "create" ? "Write New Article" : "Edit Article"}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setView("list")}>Cancel</Button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Enter article title..."
                      className="text-base font-semibold"
                      data-testid="input-title"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="article-url-slug"
                      data-testid="input-slug"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="excerpt">Summary *</Label>
                    <Textarea
                      id="excerpt"
                      value={form.excerpt}
                      onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                      placeholder="Brief summary of the article..."
                      className="h-20 resize-none"
                      data-testid="input-excerpt"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Publisher *</Label>
                      <Select value={form.publisherId} onValueChange={(v) => setForm({ ...form, publisherId: v })}>
                        <SelectTrigger data-testid="select-publisher">
                          <SelectValue placeholder="Select publisher" />
                        </SelectTrigger>
                        <SelectContent>
                          {(publishers as Publisher[]).map((p: Publisher) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select
                        value={form.categoryIds[0] ?? ""}
                        onValueChange={(v) => setForm({ ...form, categoryIds: [v] })}
                      >
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(categories as Category[]).map((c: Category) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Political Bias *</Label>
                      <Select value={form.bias} onValueChange={(v) => setForm({ ...form, bias: v })}>
                        <SelectTrigger data-testid="select-bias">
                          <SelectValue placeholder="Select bias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={form.tagNames}
                      onChange={(e) => setForm({ ...form, tagNames: e.target.value })}
                      placeholder="economy, markets, investing"
                      data-testid="input-tags"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="content">Article Content *</Label>
                    <Textarea
                      id="content"
                      value={form.bodyHtml}
                      onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                      placeholder="Write your article here... HTML is supported."
                      className="min-h-80 resize-none font-mono text-sm"
                      data-testid="input-content"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    {view === "create" ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => createMutation.mutate("draft")}
                          disabled={createMutation.isPending || !form.title || !form.slug || !form.excerpt || !form.bodyHtml || !form.publisherId || !form.bias}
                          data-testid="button-save-draft"
                        >
                          <Clock className="w-4 h-4 mr-1.5" />Save Draft
                        </Button>
                        <Button
                          onClick={() => createMutation.mutate("published")}
                          disabled={createMutation.isPending || !form.title || !form.slug || !form.excerpt || !form.bodyHtml || !form.publisherId || !form.bias}
                          data-testid="button-publish"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />Publish Article
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => updateMutation.mutate({ id: editingArticle!.id, data: form })}
                        disabled={updateMutation.isPending}
                        data-testid="button-update"
                      >
                        Update Article
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Article?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteId!)} className="flex-1" data-testid="confirm-delete">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
