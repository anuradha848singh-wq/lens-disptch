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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LayoutDashboard, Building2, Users, FileText, PlusCircle, Edit, Trash2, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import globalTimesLogo from "@assets/generated_images/Global_Times_publisher_logo_ca784f81.png";
import techDailyLogo from "@assets/generated_images/Tech_Daily_publisher_logo_1c01fd2a.png";

interface Publisher {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website: string;
}

interface Editor {
  id: string;
  name: string;
  email: string;
  articlesCount: number;
}

export default function AdminDashboard() {
  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState<"overview" | "publishers" | "editors" | "articles">("overview");
  const [isAddPublisherOpen, setIsAddPublisherOpen] = useState(false);
  const [isAddEditorOpen, setIsAddEditorOpen] = useState(false);

  const menuItems = [
    { title: "Overview", icon: LayoutDashboard, view: "overview" as const },
    { title: "Publishers", icon: Building2, view: "publishers" as const },
    { title: "Editors", icon: Users, view: "editors" as const },
    { title: "Articles", icon: FileText, view: "articles" as const },
  ];

  const mockPublishers: Publisher[] = [
    {
      id: "1",
      name: "Global Times",
      description: "International news and analysis",
      logo: globalTimesLogo,
      website: "globaltimes.com",
    },
    {
      id: "2",
      name: "Tech Daily",
      description: "Technology news and innovation",
      logo: techDailyLogo,
      website: "techdaily.com",
    },
  ];

  const mockEditors: Editor[] = [
    { id: "1", name: "Sarah Johnson", email: "sarah@example.com", articlesCount: 24 },
    { id: "2", name: "Michael Chen", email: "michael@example.com", articlesCount: 18 },
    { id: "3", name: "Emma Rodriguez", email: "emma@example.com", articlesCount: 31 },
  ];

  const stats = [
    { label: "Total Articles", value: "1,234", icon: FileText },
    { label: "Publishers", value: "12", icon: Building2 },
    { label: "Editors", value: "45", icon: Users },
    { label: "Page Views", value: "2.4M", icon: LayoutDashboard },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>NewsHub Admin</SidebarGroupLabel>
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
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
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
            {activeView === "overview" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Analytics Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {stats.map((stat) => (
                    <Card key={stat.label} className="border-card-border">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.label}
                        </CardTitle>
                        <stat.icon className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                          {stat.value}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeView === "publishers" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Publishers</h2>
                  <Dialog open={isAddPublisherOpen} onOpenChange={setIsAddPublisherOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-publisher">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Publisher
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Publisher</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="publisher-name">Name</Label>
                          <Input id="publisher-name" placeholder="Publisher name" data-testid="input-publisher-name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="publisher-description">Description</Label>
                          <Input id="publisher-description" placeholder="Brief description" data-testid="input-publisher-description" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="publisher-website">Website</Label>
                          <Input id="publisher-website" placeholder="website.com" data-testid="input-publisher-website" />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            console.log("Publisher added");
                            setIsAddPublisherOpen(false);
                          }}
                          data-testid="button-save-publisher"
                        >
                          Save Publisher
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card className="border-card-border">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Logo</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockPublishers.map((publisher) => (
                          <TableRow key={publisher.id} data-testid={`row-publisher-${publisher.id}`}>
                            <TableCell>
                              <img src={publisher.logo} alt={publisher.name} className="w-12 h-12 rounded-md object-cover" />
                            </TableCell>
                            <TableCell className="font-medium">{publisher.name}</TableCell>
                            <TableCell className="text-muted-foreground">{publisher.description}</TableCell>
                            <TableCell>{publisher.website}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => console.log("Edit", publisher.id)}
                                  data-testid={`button-edit-publisher-${publisher.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => console.log("Delete", publisher.id)}
                                  data-testid={`button-delete-publisher-${publisher.id}`}
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
            )}

            {activeView === "editors" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Editors</h2>
                  <Dialog open={isAddEditorOpen} onOpenChange={setIsAddEditorOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-editor">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Editor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Editor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editor-name">Name</Label>
                          <Input id="editor-name" placeholder="Full name" data-testid="input-editor-name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editor-email">Email</Label>
                          <Input id="editor-email" type="email" placeholder="email@example.com" data-testid="input-editor-email" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editor-password">Password</Label>
                          <Input id="editor-password" type="password" placeholder="••••••••" data-testid="input-editor-password" />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            console.log("Editor added");
                            setIsAddEditorOpen(false);
                          }}
                          data-testid="button-save-editor"
                        >
                          Save Editor
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card className="border-card-border">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Articles</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockEditors.map((editor) => (
                          <TableRow key={editor.id} data-testid={`row-editor-${editor.id}`}>
                            <TableCell className="font-medium">{editor.name}</TableCell>
                            <TableCell className="text-muted-foreground">{editor.email}</TableCell>
                            <TableCell>{editor.articlesCount}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => console.log("Edit", editor.id)}
                                  data-testid={`button-edit-editor-${editor.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => console.log("Delete", editor.id)}
                                  data-testid={`button-delete-editor-${editor.id}`}
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
            )}

            {activeView === "articles" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">All Articles Management</h2>
                <Card className="border-card-border">
                  <CardContent className="p-8">
                    <p className="text-center text-muted-foreground">
                      Article management and moderation features will be displayed here.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
