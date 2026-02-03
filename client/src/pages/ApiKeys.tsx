import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
  Check,
  Crown,
  Zap,
  Rocket,
  Building2,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ApiKeyInfo {
  id: number;
  name: string;
  keyPrefix: string;
  tier: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  todayUsage: number;
  dailyLimit: number;
}

interface Subscription {
  id: number;
  tier: string;
  status: string;
  tierLimits: {
    apiCallsPerDay: number;
    dataRefreshDelay: number;
    historyDays: number;
    webhooksEnabled: boolean;
    alertsEnabled: boolean;
    priceInr: number;
  };
}

interface TierInfo {
  name: string;
  apiCallsPerDay: number;
  dataRefreshDelay: number;
  historyDays: number;
  webhooksEnabled: boolean;
  alertsEnabled: boolean;
  priceInr: number;
  features: string[];
}

const TIER_ICONS = {
  free: Zap,
  basic: Crown,
  pro: Rocket,
  enterprise: Building2,
};

const TIER_COLORS = {
  free: "bg-gray-100 text-gray-800",
  basic: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
};

export default function ApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<ApiKeyInfo[]>({
    queryKey: ["/api/keys"],
  });

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  const { data: tiers } = useQuery<{ tiers: TierInfo[] }>({
    queryKey: ["/api/tiers"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/keys", { name });
      return response.json();
    },
    onSuccess: (data: any) => {
      setNewKeyValue(data.plainKey);
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "API Key Created",
        description: "Your new API key has been created. Make sure to copy it now!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      await apiRequest("DELETE", `/api/keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "API Key Revoked",
        description: "The API key has been permanently revoked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke API key",
        variant: "destructive",
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/subscription/upgrade", { tier });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "Subscription Updated",
        description: "Your subscription has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }
    createKeyMutation.mutate(newKeyName);
  };

  const handleCopyKey = async () => {
    if (newKeyValue) {
      await navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue(null);
    setShowKey(false);
  };

  const TierIcon = TIER_ICONS[subscription?.tier as keyof typeof TIER_ICONS] || Zap;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">API Keys & Subscription</h1>
        <p className="text-muted-foreground">Manage your API keys and subscription tier.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TierIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Your subscription tier and limits</CardDescription>
              </div>
            </div>
            <Badge className={TIER_COLORS[subscription?.tier as keyof typeof TIER_COLORS] || TIER_COLORS.free}>
              {subscription?.tier?.toUpperCase() || "FREE"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {subscription && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {subscription.tierLimits.apiCallsPerDay === -1 
                    ? "Unlimited" 
                    : subscription.tierLimits.apiCallsPerDay.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">API Calls/Day</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">{subscription.tierLimits.dataRefreshDelay}</p>
                <p className="text-xs text-muted-foreground">Min Refresh Delay</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {subscription.tierLimits.historyDays === -1 
                    ? "Unlimited" 
                    : subscription.tierLimits.historyDays}
                </p>
                <p className="text-xs text-muted-foreground">Days History</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {subscription.tierLimits.webhooksEnabled ? "Yes" : "No"}
                </p>
                <p className="text-xs text-muted-foreground">Webhooks</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">API Keys</CardTitle>
                <CardDescription>Manage your API keys for programmatic access</CardDescription>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-key">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    {newKeyValue 
                      ? "Your new API key has been created. Copy it now - you won't be able to see it again!"
                      : "Give your API key a name to help you identify it later."}
                  </DialogDescription>
                </DialogHeader>
                
                {!newKeyValue ? (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Key Name</label>
                      <Input
                        placeholder="e.g., Production API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        data-testid="input-key-name"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Save this key now!</p>
                          <p className="text-sm text-amber-700">You won't be able to see it again.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your API Key</label>
                      <div className="flex gap-2">
                        <Input
                          type={showKey ? "text" : "password"}
                          value={newKeyValue}
                          readOnly
                          className="font-mono text-sm"
                          data-testid="input-api-key"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowKey(!showKey)}
                          data-testid="button-toggle-key"
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyKey}
                          data-testid="button-copy-key"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  {!newKeyValue ? (
                    <>
                      <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                      <Button 
                        onClick={handleCreateKey} 
                        disabled={createKeyMutation.isPending}
                        data-testid="button-confirm-create"
                      >
                        {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleCloseDialog} data-testid="button-done">Done</Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No API keys yet</p>
              <p className="text-sm text-muted-foreground">Create your first API key to start using the API</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div 
                  key={key.id} 
                  className="flex items-center justify-between p-4 border rounded-lg flex-wrap gap-4"
                  data-testid={`api-key-${key.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {key.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono">{key.keyPrefix}...</span>
                      <span>
                        {key.lastUsedAt 
                          ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : "Never used"}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {key.todayUsage} / {key.dailyLimit === -1 ? "Unlimited" : key.dailyLimit} calls today
                        </span>
                      </div>
                      {key.dailyLimit !== -1 && (
                        <Progress 
                          value={(key.todayUsage / key.dailyLimit) * 100} 
                          className="h-1 mt-1"
                        />
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-revoke-${key.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke "{key.name}"? This action cannot be undone. Any applications using this key will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revokeKeyMutation.mutate(key.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers?.tiers.map((tier) => {
              const TierIcon = TIER_ICONS[tier.name as keyof typeof TIER_ICONS] || Zap;
              const isCurrentTier = subscription?.tier === tier.name;
              
              return (
                <div
                  key={tier.name}
                  className={`p-4 border rounded-lg ${isCurrentTier ? "border-primary bg-primary/5" : "border-border"}`}
                  data-testid={`tier-${tier.name}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TierIcon className="h-5 w-5 text-primary" />
                    <span className="font-semibold capitalize">{tier.name}</span>
                    {isCurrentTier && (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold">
                      {tier.priceInr === 0 ? "Free" : `₹${tier.priceInr.toLocaleString()}`}
                    </span>
                    {tier.priceInr > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                  <ul className="space-y-2 mb-4 text-sm">
                    {tier.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {!isCurrentTier && (
                    <Button
                      variant={tier.name === "pro" ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => upgradeMutation.mutate(tier.name)}
                      disabled={upgradeMutation.isPending}
                      data-testid={`button-select-${tier.name}`}
                    >
                      {tier.priceInr === 0 ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            API Documentation
          </CardTitle>
          <CardDescription>Quick reference for API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
              <p className="text-muted-foreground mb-2"># Authentication</p>
              <p>curl -H "Authorization: Bearer YOUR_API_KEY" \</p>
              <p className="pl-4">https://your-domain.replit.app/api/v1/ipos</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Available Endpoints</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos</code> - List all IPOs</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos/upcoming</code> - Upcoming IPOs</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos/open</code> - Open IPOs</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos/:symbol</code> - IPO details</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/gmp/live</code> - Live GMP data</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Pro/Enterprise Endpoints</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos/:symbol/live</code> - Live data</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos/:symbol/history</code> - Historical</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/ipos/:symbol/peers</code> - Peer comparison</li>
                  <li><code className="text-xs bg-muted px-1 rounded">GET /api/v1/subscription/live</code> - Live subs</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
