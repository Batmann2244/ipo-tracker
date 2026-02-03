import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Activity, BarChart3, CheckCircle, XCircle, Loader2, Clock, AlertTriangle, Server, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SyncResult {
  success: boolean;
  message?: string;
  created?: number;
  updated?: number;
  total?: number;
  markedAsListed?: number;
  error?: string;
}

interface Stats {
  total: number;
  upcoming: number;
  open: number;
  closed: number;
  listed?: number;
  withScores: number;
  avgScore: number;
}

interface TestResult {
  success: boolean;
  count: number;
  sample: Array<{
    symbol: string;
    companyName: string;
    status: string;
  }>;
}

interface SourceHealth {
  sources: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: string | null;
  }>;
  overallHealth: 'healthy' | 'degraded' | 'down';
}

interface SourceStats {
  source: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastSuccess: string | null;
  lastError: string | null;
  successRate: number;
}

interface ScraperLog {
  id: number;
  source: string;
  operation: string;
  status: string;
  recordsCount: number;
  responseTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

const DATA_SOURCES = [
  { id: 'chittorgarh', name: 'Chittorgarh IPO Dashboard', description: 'Main source for IPO listings, dates, and basic info', type: 'IPO Data' },
  { id: 'investorgain', name: 'InvestorGain', description: 'Live GMP data, subscription details, and activity dates', type: 'GMP & Subscription' },
  { id: 'ipoalerts', name: 'IPO Alerts API', description: 'Premium IPO data with schedule, strengths, and risks (25/day limit)', type: 'Premium Data' },
  { id: 'groww', name: 'Groww', description: 'IPO calendar, subscription data, and listing info', type: 'Calendar & Subscription' },
  { id: 'nsetools', name: 'NSE Tools', description: 'Official NSE data for mainboard IPOs', type: 'Exchange Data' },
  { id: 'nse', name: 'NSE Direct', description: 'Direct NSE API for real-time data', type: 'Exchange Data' },
  { id: 'bse', name: 'BSE', description: 'Mainboard, SME, and DEBT IPO listings (Beta since Jan 2, 2026)', type: 'Exchange Data' },
  { id: 'ipowatch', name: 'IPO Watch', description: 'Grey Market Premium trends and expected listing gains', type: 'GMP & Trends' },
  { id: 'zerodha', name: 'Zerodha', description: 'Data enrichment and market insights for IPO analysis', type: 'Data Enrichment' },
];

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: sourceHealth, refetch: refetchHealth } = useQuery<SourceHealth>({
    queryKey: ["/api/admin/scraper-health"],
    refetchInterval: 30000,
  });

  const { data: sourceStats } = useQuery<SourceStats[]>({
    queryKey: ["/api/admin/scraper-stats"],
    refetchInterval: 30000,
  });

  const { data: recentLogs, refetch: refetchLogs } = useQuery<ScraperLog[]>({
    queryKey: ["/api/admin/scraper-logs"],
    enabled: showLogs,
  });

  const { data: schedulerStatus } = useQuery<{ running: boolean; lastPoll: string | null; pollCount: number }>({
    queryKey: ["/api/scheduler/status"],
    refetchInterval: 10000,
  });

  const { data: ipoAlertsUsage } = useQuery<{ date: string; used: number; remaining: number; limit: number; canMakeRequest: boolean; scheduledFetchType: string | null }>({
    queryKey: ["/api/ipoalerts/usage"],
    refetchInterval: 60000,
  });

  const startSchedulerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/start");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Scheduler Started", description: "Auto-sync is now running every 30 minutes" });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
    },
  });

  const stopSchedulerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/stop");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Scheduler Stopped", description: "Auto-sync has been stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
    },
  });

  const manualPollMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/poll");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Manual Poll Complete", description: data.message || "Data refreshed from all sources" });
      refetchHealth();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ["/api/ipos"] });
    },
    onError: () => {
      toast({ title: "Poll Failed", variant: "destructive" });
    },
  });

  const getSourceStatus = (sourceId: string) => {
    const health = sourceHealth?.sources.find(s => s.name === sourceId);
    const stat = sourceStats?.find(s => s.source === sourceId);
    return { health, stat };
  };

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'down' | undefined) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Degraded</Badge>;
      case 'down':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Inactive</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">Unknown</Badge>;
    }
  };

  const testMutation = useMutation<TestResult>({
    mutationFn: async () => {
      const res = await fetch("/api/admin/sync/test");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test Successful",
          description: `Found ${data.count} IPOs from Chittorgarh`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: "Could not connect to data source",
          variant: "destructive",
        });
      }
    },
  });

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/sync");
      return res.json();
    },
    onSuccess: (data) => {
      setLastSync(data);
      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `${data.created} new, ${data.updated} updated IPOs`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/ipos"] });
        refetchStats();
      }
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const cleanSyncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/sync/clean");
      return res.json();
    },
    onSuccess: (data) => {
      setLastSync(data);
      if (data.success) {
        toast({
          title: "Clean Sync Complete",
          description: `Archived ${data.markedAsListed} old IPOs. ${data.created} new, ${data.updated} updated.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/ipos"] });
        refetchStats();
      }
    },
    onError: (error) => {
      toast({
        title: "Clean Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const importIpoAlertsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ipoalerts/import-all");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Import Complete",
          description: `Imported ${data.imported} IPOs from IPO Alerts API`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/ipos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ipoalerts/usage"] });
        refetchStats();
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage IPO data and trigger manual syncs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Total IPOs</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-ipos">
                {statsLoading ? "..." : stats?.total || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Open Now</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500" data-testid="text-open-ipos">
                {statsLoading ? "..." : stats?.open || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500" data-testid="text-upcoming-ipos">
                {statsLoading ? "..." : stats?.upcoming || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500" data-testid="text-avg-score">
                {statsLoading ? "..." : stats?.avgScore?.toFixed(1) || "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Sync</CardTitle>
            <CardDescription>
              Fetch latest IPO data from Chittorgarh. This will update existing records
              and add new IPOs to the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                data-testid="button-test-connection"
              >
                {testMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>

              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-sync-data"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync IPO Data
              </Button>

              <Button
                onClick={() => cleanSyncMutation.mutate()}
                disabled={cleanSyncMutation.isPending}
                variant="destructive"
                data-testid="button-clean-sync"
              >
                {cleanSyncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Clean Sync (Reset Data)
              </Button>

              <Button
                onClick={() => importIpoAlertsMutation.mutate()}
                disabled={importIpoAlertsMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                data-testid="button-import-ipoalerts"
              >
                {importIpoAlertsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Import from IPO Alerts
              </Button>
            </div>

            {testMutation.data && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  {testMutation.data.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {testMutation.data.success
                      ? `Connection OK - Found ${testMutation.data.count} IPOs`
                      : "Connection failed"}
                  </span>
                </div>
                {testMutation.data.sample?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Sample data:</p>
                    <div className="flex flex-wrap gap-2">
                      {testMutation.data.sample.map((ipo, i) => (
                        <Badge key={i} variant="secondary">
                          {ipo.companyName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {lastSync && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {lastSync.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {lastSync.success
                      ? `Sync Complete: ${lastSync.created} created, ${lastSync.updated} updated`
                      : lastSync.error || "Sync failed"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>
                  All data providers used for IPO information
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {sourceHealth?.overallHealth && (
                  <Badge variant={sourceHealth.overallHealth === 'healthy' ? 'default' : 'destructive'}>
                    System: {sourceHealth.overallHealth}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DATA_SOURCES.map(source => {
                const { health, stat } = getSourceStatus(source.id);
                return (
                  <div
                    key={source.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedSource(selectedSource === source.id ? null : source.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{source.name}</p>
                          <Badge variant="secondary" className="text-xs">{source.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {source.description}
                        </p>
                        {source.id === 'ipoalerts' && ipoAlertsUsage && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                              {ipoAlertsUsage.used}/{ipoAlertsUsage.limit} used today
                            </Badge>
                            {ipoAlertsUsage.scheduledFetchType && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                Next: {ipoAlertsUsage.scheduledFetchType}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(health?.status)}
                        {selectedSource === source.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {selectedSource === source.id && stat && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{stat.totalCalls}</p>
                          <p className="text-xs text-muted-foreground">Total Calls (24h)</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{stat.successRate}%</p>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{stat.avgResponseTime}ms</p>
                          <p className="text-xs text-muted-foreground">Avg Response</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{stat.errorCount}</p>
                          <p className="text-xs text-muted-foreground">Errors (24h)</p>
                        </div>
                        {stat.lastSuccess && (
                          <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Last success: {new Date(stat.lastSuccess).toLocaleTimeString()}
                          </div>
                        )}
                        {stat.lastError && (
                          <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            Last error: {new Date(stat.lastError).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Auto-Sync Scheduler
                </CardTitle>
                <CardDescription>
                  Automatically sync data from all sources every 30 minutes
                </CardDescription>
              </div>
              <Badge variant={schedulerStatus?.running ? 'default' : 'secondary'}>
                {schedulerStatus?.running ? 'Running' : 'Stopped'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {schedulerStatus?.running ? (
                <Button
                  variant="outline"
                  onClick={() => stopSchedulerMutation.mutate()}
                  disabled={stopSchedulerMutation.isPending}
                >
                  {stopSchedulerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Stop Scheduler
                </Button>
              ) : (
                <Button
                  onClick={() => startSchedulerMutation.mutate()}
                  disabled={startSchedulerMutation.isPending}
                >
                  {startSchedulerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Scheduler
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => manualPollMutation.mutate()}
                disabled={manualPollMutation.isPending}
              >
                {manualPollMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Now
              </Button>
            </div>
            {schedulerStatus && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Poll count: {schedulerStatus.pollCount}</p>
                {schedulerStatus.lastPoll && (
                  <p>Last poll: {new Date(schedulerStatus.lastPoll).toLocaleString()}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Scraper Logs
                </CardTitle>
                <CardDescription>
                  Detailed activity log for all data sources
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowLogs(!showLogs);
                  if (!showLogs) refetchLogs();
                }}
              >
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </Button>
            </div>
          </CardHeader>
          {showLogs && (
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {recentLogs?.map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-sm ${log.status === 'success' ? 'border-green-500/30 bg-green-500/5' :
                      log.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
                        'border-yellow-500/30 bg-yellow-500/5'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : log.status === 'error' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium uppercase">{log.source}</span>
                        <Badge variant="secondary" className="text-xs">{log.operation}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {log.recordsCount > 0 && <span>{log.recordsCount} records</span>}
                      {log.responseTimeMs && <span>{log.responseTimeMs}ms</span>}
                      {log.errorMessage && <span className="text-red-500">{log.errorMessage}</span>}
                    </div>
                  </div>
                ))}
                {(!recentLogs || recentLogs.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No logs available yet</p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
