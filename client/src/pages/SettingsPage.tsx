import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MainNav } from "@/components/MainNav";
import { NewsFooter } from "@/components/NewsFooter";
import { MapPin, Search, Globe, Filter, Save, CheckCircle2, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [localSearch, setLocalSearch] = useState("");
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => api.settings.get()
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your news preferences have been saved and will apply to future fetches.",
      });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      fetchCountry: formData.get("fetchCountry"),
      fetchLanguage: formData.get("fetchLanguage"),
      localNewsKeywords: formData.get("localNewsKeywords"),
      useBrowserLocation: formData.get("useBrowserLocation") === "on",
    };
    updateMutation.mutate(data);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Detecting location...",
      description: "Please allow access to your location.",
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Simple reverse geocoding via public API if available, 
        // or just let the user know we have the coords.
        // For Google News RSS, city/region names work best.
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state;
          if (city) {
            setLocalSearch(city);
            toast({
              title: "Location detected",
              description: `Set local news focus to ${city}`,
            });
          }
        } catch (err) {
          toast({
            title: "Warning",
            description: "Could not determine city name, but coordinates acquired.",
          });
        }
      },
      () => {
        toast({
          title: "Error",
          description: "Failed to detect location. Please enter it manually.",
          variant: "destructive"
        });
      }
    );
  };

  useEffect(() => {
    if (settings?.localNewsKeywords) {
      setLocalSearch(settings.localNewsKeywords);
    }
  }, [settings]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="text-muted-foreground mb-4">Please log in to manage your news settings.</p>
        <Button onClick={() => window.location.href = "/"}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav onSearch={() => {}} searchQuery="" />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Platform Settings</h1>
          <p className="text-muted-foreground">Configure how your news feed is generated and personalized.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Regional Focus */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe className="w-5 h-5 text-primary" />
                    Regional Focus
                  </CardTitle>
                  <CardDescription>
                    Select the primary country and language for your news.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Country (ISO Code)</label>
                    <Input 
                      name="fetchCountry" 
                      defaultValue={settings?.fetchCountry || "US"} 
                      placeholder="e.g. US, UK, IN"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language Code</label>
                    <Input 
                      name="fetchLanguage" 
                      defaultValue={settings?.fetchLanguage || "en"} 
                      placeholder="e.g. en, fr, es"
                      maxLength={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Local News Focus */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5 text-primary" />
                    Local News
                  </CardTitle>
                  <CardDescription>
                    Get headlines from your specific city or region.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region or City Name</label>
                    <div className="flex gap-2">
                      <Input 
                        name="localNewsKeywords" 
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="e.g. Austin, Texas"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={handleDetectLocation}
                        title="Detect my location"
                      >
                        <Navigation className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Use Browser Geolocation</label>
                      <p className="text-xs text-muted-foreground">Automatically update location on each visit.</p>
                    </div>
                    <Switch 
                      name="useBrowserLocation" 
                      defaultChecked={settings?.useBrowserLocation}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5 text-primary" />
                  Content Delivery
                </CardTitle>
                <CardDescription>
                  Manage delivery frequencies and automated fetch behaviors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="text-sm text-center text-muted-foreground italic">
                    All fetching is real-time from Google News RSS and other primary sources. 
                    Changes here affect the background fetcher immediately.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t py-4">
                <Button variant="ghost" type="button" onClick={() => window.location.href = "/"}>Cancel</Button>
                <Button type="submit" className="gap-2" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </main>

      <NewsFooter />
    </div>
  );
}
