import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Edit, Trash2, Save, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatDistanceToNow } from "date-fns";

type ArticleStatus = "draft" | "published";
type Bias = "left" | "center" | "right";

interface EditorArticle {
  id: string;
  title: string;
  category: string;
  bias: Bias;
  status: ArticleStatus;
  publishedAt: Date;
}

export default function EditorDashboard() {
  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState<"list" | "create">("list");

  const menuItems = [
    { title: "My Articles", icon: FileText, view: "list" as const },
    { title: "Create New", icon: PlusCircle, view: "create" as const },
  ];

  const mockArticles: EditorArticle[] = [
    {
      id: "1",
      title: "Global Markets Rally as Economic Indicators Show Strong Growth",
      category: "Business",
      bias: "center",
      status: "published",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "2",
      title: "Tech Innovation Drives New Economic Opportunities",
      category: "Technology",
      bias: "left",
      status: "draft",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    bias: "",
    tags: "",
  });

  const handleSubmit = (status: "draft" | "published") => {
    console.log(`Article ${status}:`, formData);
    setFormData({ title: "", content: "", category: "", bias: "", tags: "" });
    setActiveView("list");
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>NewsHub Editor</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => setActiveView(item.view)}
                        data-active={activeView === item.view}
                        data-testid={`button-nav-${item.view}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-bold">Editor Dashboard</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-8">
            {activeView === "list" ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My Articles</h2>
                  <Button onClick={() => setActiveView("create")} data-testid="button-create-new">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create New
                  </Button>
                </div>

                <Card className="border-card-border">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Bias</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Published</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockArticles.map((article) => (
                          <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                            <TableCell className="font-medium">{article.title}</TableCell>
                            <TableCell>{article.category}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{article.bias}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={article.status === "published" ? "default" : "secondary"}>
                                {article.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDistanceToNow(article.publishedAt, { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => console.log("Edit", article.id)}
                                  data-testid={`button-edit-${article.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => console.log("Delete", article.id)}
                                  data-testid={`button-delete-${article.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Create New Article</h2>
                  <Button variant="ghost" onClick={() => setActiveView("list")} data-testid="button-cancel">
                    Cancel
                  </Button>
                </div>

                <div className="max-w-4xl space-y-6">
                  <Card className="border-card-border">
                    <CardHeader>
                      <CardTitle>Article Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter article title..."
                          data-testid="input-title"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                            <SelectTrigger id="category" data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Politics">Politics</SelectItem>
                              <SelectItem value="Business">Business</SelectItem>
                              <SelectItem value="Technology">Technology</SelectItem>
                              <SelectItem value="Sports">Sports</SelectItem>
                              <SelectItem value="World">World</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bias">Bias</Label>
                          <Select value={formData.bias} onValueChange={(value) => setFormData({ ...formData, bias: value })}>
                            <SelectTrigger id="bias" data-testid="select-bias">
                              <SelectValue placeholder="Select bias" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tags">Tags</Label>
                          <Input
                            id="tags"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="comma, separated"
                            data-testid="input-tags"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          placeholder="Write your article content..."
                          className="min-h-96 resize-none"
                          data-testid="textarea-content"
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button onClick={() => handleSubmit("draft")} variant="outline" data-testid="button-save-draft">
                          <Save className="w-4 h-4 mr-2" />
                          Save as Draft
                        </Button>
                        <Button onClick={() => handleSubmit("published")} data-testid="button-publish">
                          Publish Article
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
