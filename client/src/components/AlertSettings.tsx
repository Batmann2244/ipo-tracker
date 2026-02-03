import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

interface AlertPreferences {
  id?: number;
  emailEnabled: boolean;
  email: string | null;
  alertOnNewIpo: boolean;
  alertOnGmpChange: boolean;
  alertOnOpenDate: boolean;
  alertOnWatchlistOnly: boolean;
}

export function AlertSettings() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const { data: prefs, isLoading } = useQuery<AlertPreferences>({
    queryKey: ["/api/alerts/preferences"],
  });

  const updatePrefs = useMutation({
    mutationFn: async (data: Partial<AlertPreferences>) => {
      return apiRequest("POST", "/api/alerts/preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/preferences"] });
      toast({ title: "Settings saved", description: "Alert preferences updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Mail className="h-4 w-4 text-primary" />
          Email Alerts
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="email-enabled" className="text-muted-foreground">Enable email alerts</Label>
          <Switch
            id="email-enabled"
            data-testid="switch-email-enabled"
            checked={prefs?.emailEnabled || false}
            onCheckedChange={(checked) => updatePrefs.mutate({ emailEnabled: checked })}
          />
        </div>

        {prefs?.emailEnabled && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground text-sm">Email address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="your@email.com"
                value={email || prefs?.email || ""}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background"
              />
              <Button 
                data-testid="button-save-email"
                onClick={() => updatePrefs.mutate({ email })}
                disabled={updatePrefs.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {updatePrefs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Email alerts require a Resend API key to be configured on the server.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <div className="text-foreground font-medium">Alert Types</div>
        <p className="text-sm text-muted-foreground">Choose which alerts to receive</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">New IPO announcements</Label>
              <p className="text-xs text-muted-foreground">Get notified when new IPOs are added</p>
            </div>
            <Switch
              data-testid="switch-alert-new-ipo"
              checked={prefs?.alertOnNewIpo ?? true}
              onCheckedChange={(checked) => updatePrefs.mutate({ alertOnNewIpo: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">GMP changes</Label>
              <p className="text-xs text-muted-foreground">Alert on significant GMP movements</p>
            </div>
            <Switch
              data-testid="switch-alert-gmp"
              checked={prefs?.alertOnGmpChange ?? true}
              onCheckedChange={(checked) => updatePrefs.mutate({ alertOnGmpChange: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">IPO opening reminders</Label>
              <p className="text-xs text-muted-foreground">Remind before IPO opens for subscription</p>
            </div>
            <Switch
              data-testid="switch-alert-open-date"
              checked={prefs?.alertOnOpenDate ?? true}
              onCheckedChange={(checked) => updatePrefs.mutate({ alertOnOpenDate: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Watchlist only</Label>
              <p className="text-xs text-muted-foreground">Only get alerts for watchlisted IPOs</p>
            </div>
            <Switch
              data-testid="switch-alert-watchlist-only"
              checked={prefs?.alertOnWatchlistOnly ?? false}
              onCheckedChange={(checked) => updatePrefs.mutate({ alertOnWatchlistOnly: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
