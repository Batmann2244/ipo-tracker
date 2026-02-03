import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  LogOut,
  Settings as SettingsIcon
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AlertSettings } from "@/components/AlertSettings";

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Information
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{user?.firstName} {user?.lastName}</h3>
              <p className="text-muted-foreground text-sm">Member since 2024</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{user?.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account ID</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">{user?.id?.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Preferences
          </h2>
        </div>
        <div className="p-6 divide-y divide-border">
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your watchlist</p>
              </div>
            </div>
            <Switch defaultChecked data-testid="switch-notifications" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alert Notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Get notified about IPOs via email and Telegram</p>
        </div>
        <div className="p-6">
          <AlertSettings />
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          variant="ghost"
          onClick={() => logout()}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          data-testid="button-signout-settings"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
