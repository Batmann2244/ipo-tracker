import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Check, ChevronDown } from "lucide-react";

export default function ApiDashboard() {
  const { user } = useAuth();
  
  const planFeatures = [
    "1 API Key",
    "Up to 750 requests per month",
    "Request cap at 25 requests per day",
    "Basic usage analytics",
    "Basic query params (only currently open ipos)",
    "Max Limit: 1 IPO / request",
    "Community support"
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName || 'User'}</h1>
        <p className="text-muted-foreground">Manage your account, API keys and monitor usage</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Free</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Start for free. No credit card required.</p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Plan Features</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-foreground rounded-full mb-2"></div>
            <p className="text-2xl font-bold mb-1">1 / 1</p>
            <p className="text-xs text-muted-foreground">
              You've created 1 API Key(s) and have <span className="text-primary font-medium">0</span> remaining based on your current plan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full mb-2">
              <div className="h-2 bg-foreground rounded-full w-0"></div>
            </div>
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-2xl font-bold">0 / 25</p>
              <p className="text-xs text-muted-foreground">Renews on 23/1/2026</p>
            </div>
            <p className="text-xs text-muted-foreground">
              You've used <span className="text-primary font-medium">0</span> requests. You have a <strong>daily</strong> quota of <span className="text-primary font-medium">25</span> requests based on your current plan.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Usage Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Upgrade to a paid plan to see your usage trend over time.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
