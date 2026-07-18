"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  AlertTriangle, 
  Calendar, 
  Database, 
  Download, 
  Folder, 
  Loader2, 
  RefreshCw, 
  Clock,
  Settings,
  Cpu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useToast } from "@/hooks/use-toast";
import { 
  getDBBackups, 
  downloadDBBackup, 
  getWorkersStatus, 
  triggerWorker, 
  getSystemStats,
  type DBBackupItem, 
  type Worker,
  type SystemStats
} from "@/lib/admin-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatISODate } from "@/lib/utils/date-utils";
import { safeGetItem, safeSetItem } from "@/lib/storage-utils";

const AUTO_REFRESH_STORAGE_KEY = "db-backups-auto-refresh";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function AdminDBBackupsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const capabilities = useCapabilities();

  const [backups, setBackups] = useState<DBBackupItem[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = safeGetItem(AUTO_REFRESH_STORAGE_KEY);
    return saved !== "false"; // default to true
  });

  const handleToggleAutoRefresh = (checked: boolean) => {
    setAutoRefresh(checked);
    safeSetItem(AUTO_REFRESH_STORAGE_KEY, String(checked));
  };

  // Poll system stats every 2s
  useEffect(() => {
    if (!capabilities.is_super_admin) return;

    const fetchStats = async () => {
      try {
        const stats = await getSystemStats();
        setSystemStats(stats);
      } catch (err) {
        console.error("Failed to fetch system stats:", err);
      }
    };

    void fetchStats();

    if (!autoRefresh) return;

    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [capabilities.is_super_admin, autoRefresh]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Load backup list
      const backupResult = await getDBBackups();
      setBackups(backupResult.items || []);

      // Load backup worker status
      const workersResult = await getWorkersStatus();
      const backupWorker = workersResult.workers.find(w => w.name === "db_backup");
      setWorker(backupWorker || null);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: t("dbBackups.loadError") || "Failed to load database backups."
      });
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (capabilities.is_super_admin) {
      void loadData();
    }
  }, [capabilities.is_super_admin, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleDownload = async (fileName: string) => {
    setActionLoading(fileName);
    try {
      await downloadDBBackup(fileName);
      toast({
        title: "Success",
        description: t("dbBackups.downloadSuccess") || "Download started successfully."
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: t("dbBackups.downloadError") || "Failed to download backup file."
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerBackup = async () => {
    setActionLoading("trigger");
    try {
      await triggerWorker("db_backup");
      toast({
        title: "Success",
        description: "Database backup completed successfully."
      });
      // Silent reload after brief delay
      setTimeout(() => {
        void loadData(true);
      }, 2000);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to trigger database backup."
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!capabilities.is_super_admin) {
    return null;
  }

  // Helper to render state badges
  const renderStateBadge = (state?: string) => {
    switch (state) {
      case "running":
        return (
          <Badge id="db-backups-worker-badge-running" className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block animate-ping" />
            {t("dbBackups.running") || "Running"}
          </Badge>
        );
      case "idle":
        return (
          <Badge id="db-backups-worker-badge-idle" className="bg-blue-400 hover:bg-blue-500 text-white flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
            {t("dbBackups.idle") || "Idle"}
          </Badge>
        );
      case "disabled":
      default:
        return (
          <Badge id="db-backups-worker-badge-disabled" variant="secondary" className="text-gray-400 flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400 inline-block" />
            {t("dbBackups.disabled") || "Disabled"}
          </Badge>
        );
    }
  };

  return (
    <div id="db-backups-tab-container" className="space-y-6">
      {/* Header section inside tab */}
      <div id="db-backups-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div id="db-backups-header-titles">
          <h2 id="db-backups-header-title" className="text-lg font-semibold">
            {t("dbBackups.title") || "Database Backups"}
          </h2>
          <p id="db-backups-header-desc" className="text-sm text-muted-foreground mt-0.5">
            {t("dbBackups.description") || "View, manage, and download database backup snapshots."}
          </p>
        </div>

        <div id="db-backups-header-actions" className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="db-backups-refresh-btn"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleRefresh()}
                  disabled={loading || refreshing}
                  className="h-9 w-9"
                >
                  <RefreshCw
                    id="db-backups-refresh-icon"
                    className={`h-4 w-4 ${(loading || refreshing) ? "animate-spin" : ""}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p id="db-backups-refresh-tooltip-text">{t("dbBackups.refresh") || "Refresh list"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                id="db-backups-trigger-btn"
                variant="default"
                disabled={loading || actionLoading !== null || worker?.state === "running"}
                className="flex items-center gap-2"
              >
                {actionLoading === "trigger" ? (
                  <Loader2 id="db-backups-trigger-loader" className="h-4 w-4 animate-spin" />
                ) : (
                  <Database id="db-backups-trigger-icon" className="h-4 w-4" />
                )}
                Backup Now
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent id="db-backups-confirm-dialog">
              <AlertDialogHeader id="db-backups-confirm-header">
                <AlertDialogTitle id="db-backups-confirm-title">
                  {t("dbBackups.confirmTitle") || "Trigger Database Backup"}
                </AlertDialogTitle>
                <AlertDialogDescription id="db-backups-confirm-desc">
                  {t("dbBackups.confirmDescription") || "Are you sure you want to trigger a database backup? This will execute a logical dump of the entire PostgreSQL database. Running this during peak hours can impact database CPU and I/O performance."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter id="db-backups-confirm-footer">
                <AlertDialogCancel id="db-backups-confirm-cancel-btn">
                  {t("dbBackups.confirmCancel") || "Cancel"}
                </AlertDialogCancel>
                <AlertDialogAction id="db-backups-confirm-confirm-btn" onClick={() => void handleTriggerBackup()}>
                  {t("dbBackups.confirmAction") || "Confirm Backup"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {loading ? (
        <div id="db-backups-loading-container" className="space-y-4">
          <Card id="db-backups-loading-card-1">
            <CardContent id="db-backups-loading-card-content-1" className="h-32 flex items-center justify-center">
              <Loader2 id="db-backups-loading-spinner-1" className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
          <Card id="db-backups-loading-card-2">
            <CardContent id="db-backups-loading-card-content-2" className="h-64 flex items-center justify-center">
              <Loader2 id="db-backups-loading-spinner-2" className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div id="db-backups-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Worker Status side panel */}
          <div id="db-backups-side-panel" className="lg:col-span-1 space-y-6">
            {/* Server Resource Monitor Card */}
            <Card id="db-backups-resource-card">
              <CardHeader id="db-backups-resource-header" className="pb-3">
                <div id="db-backups-resource-header-row" className="flex items-center justify-between">
                  <CardTitle id="db-backups-resource-title" className="flex items-center gap-2 text-base">
                    <Cpu id="db-backups-resource-cpu-icon" className="h-5 w-5 text-primary" />
                    <span>{t("dbBackups.resourceTitle") || "Server Resource Monitor"}</span>
                  </CardTitle>
                  <div id="db-backups-resource-toggle-container" className="flex items-center gap-2">
                    <span id="db-backups-resource-toggle-label" className="text-xs text-muted-foreground font-medium">
                      {autoRefresh ? (t("dbBackups.autoRefreshOn") || "Live") : (t("dbBackups.autoRefreshOff") || "Paused")}
                    </span>
                    <Switch
                      id="db-backups-resource-toggle-switch"
                      checked={autoRefresh}
                      onCheckedChange={handleToggleAutoRefresh}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent id="db-backups-resource-content" className="space-y-4">
                {/* CPU Progress */}
                <div id="db-backups-resource-cpu-group" className="space-y-2">
                  <div id="db-backups-resource-cpu-header" className="flex items-center justify-between text-sm">
                    <span id="db-backups-resource-cpu-label" className="font-medium text-xs">{t("dbBackups.cpuUsage") || "CPU Usage"}</span>
                    <span id="db-backups-resource-cpu-value" className="font-mono text-xs font-semibold text-primary">
                      {systemStats ? `${systemStats.cpu_pct.toFixed(1)}%` : (t("dbBackups.loading") || "Loading...")}
                    </span>
                  </div>
                  <Progress 
                    id="db-backups-resource-cpu-progress"
                    value={systemStats?.cpu_pct ?? 0} 
                    className="h-1.5" 
                  />
                </div>

                {/* RAM Progress */}
                <div id="db-backups-resource-ram-group" className="space-y-2">
                  <div id="db-backups-resource-ram-header" className="flex items-center justify-between text-sm">
                    <span id="db-backups-resource-ram-label" className="font-medium text-xs">{t("dbBackups.ramUsage") || "RAM Usage"}</span>
                    <span id="db-backups-resource-ram-value" className="font-mono text-xs font-semibold text-primary">
                      {systemStats ? `${systemStats.ram_pct.toFixed(1)}%` : (t("dbBackups.loading") || "Loading...")}
                    </span>
                  </div>
                  <Progress 
                    id="db-backups-resource-ram-progress"
                    value={systemStats?.ram_pct ?? 0} 
                    className="h-1.5" 
                  />
                  {systemStats && (
                    <p id="db-backups-resource-ram-details" className="text-right text-[10px] text-muted-foreground font-mono">
                      {systemStats.ram_used_mb.toFixed(0)} MB / {systemStats.ram_total_mb.toFixed(0)} MB
                    </p>
                  )}
                </div>

                {/* Disk Progress */}
                <div id="db-backups-resource-disk-group" className="space-y-2">
                  <div id="db-backups-resource-disk-header" className="flex items-center justify-between text-sm">
                    <span id="db-backups-resource-disk-label" className="font-medium text-xs">{t("dbBackups.diskUsage") || "Disk Usage"}</span>
                    <span id="db-backups-resource-disk-value" className="font-mono text-xs font-semibold text-primary">
                      {systemStats ? `${systemStats.disk_pct.toFixed(1)}%` : (t("dbBackups.loading") || "Loading...")}
                    </span>
                  </div>
                  <Progress 
                    id="db-backups-resource-disk-progress"
                    value={systemStats?.disk_pct ?? 0} 
                    className="h-1.5" 
                  />
                  {systemStats && (
                    <p id="db-backups-resource-disk-details" className="text-right text-[10px] text-muted-foreground font-mono">
                      {systemStats.disk_used_gb.toFixed(1)} GB / {systemStats.disk_total_gb.toFixed(1)} GB
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card id="db-backups-worker-card">
              <CardHeader id="db-backups-worker-header">
                <CardTitle id="db-backups-worker-title" className="flex items-center justify-between">
                  <span>{t("dbBackups.status") || "Worker Status"}</span>
                  {renderStateBadge(worker?.state)}
                </CardTitle>
                <CardDescription id="db-backups-worker-desc">
                  PostgreSQL database daily backup service.
                </CardDescription>
              </CardHeader>
              <CardContent id="db-backups-worker-content" className="space-y-4">
                <div id="db-backups-worker-stat-last-run" className="flex items-start justify-between border-b pb-3">
                  <div id="db-backups-worker-stat-last-run-label" className="space-y-1">
                    <p className="text-sm font-medium leading-none">{t("dbBackups.lastRun") || "Last Run"}</p>
                    <p className="text-xs text-muted-foreground">Last backup execution</p>
                  </div>
                  <div id="db-backups-worker-stat-last-run-value" className="text-right">
                    <p className="text-sm font-medium">{worker?.last_run ? formatISODate(worker.last_run) : "—"}</p>
                    {worker?.details?.last_status && (
                      <Badge 
                        id="db-backups-worker-badge-last-status" 
                        variant={worker.details.last_status === "success" ? "outline" : "destructive"}
                        className="mt-1 text-[10px] h-4 py-0"
                      >
                        {worker.details.last_status.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <div id="db-backups-worker-stat-next-run" className="flex items-start justify-between border-b pb-3">
                  <div id="db-backups-worker-stat-next-run-label" className="space-y-1">
                    <p className="text-sm font-medium leading-none">{t("dbBackups.nextRun") || "Next Run"}</p>
                    <p className="text-xs text-muted-foreground">Scheduled next run</p>
                  </div>
                  <div id="db-backups-worker-stat-next-run-value" className="text-right">
                    <p className="text-sm font-medium">{worker?.next_notify_at ? formatISODate(worker.next_notify_at) : "—"}</p>
                  </div>
                </div>

                <div id="db-backups-worker-stat-retention" className="flex items-start justify-between border-b pb-3">
                  <div id="db-backups-worker-stat-retention-label" className="space-y-1">
                    <p className="text-sm font-medium leading-none">{t("dbBackups.retention") || "Retention Period"}</p>
                    <p className="text-xs text-muted-foreground">Backup files retention policy</p>
                  </div>
                  <div id="db-backups-worker-stat-retention-value" className="text-right">
                    <p className="text-sm font-medium">
                      {worker?.details?.retention 
                        ? (t("dbBackups.retentionValue") || "{count} days").replace("{count}", worker.details.retention)
                        : "—"}
                    </p>
                  </div>
                </div>

                <div id="db-backups-worker-stat-directory" className="space-y-1.5">
                  <p id="db-backups-worker-stat-directory-label" className="text-sm font-medium leading-none">{t("dbBackups.backupDir") || "Backup Directory"}</p>
                  <div id="db-backups-worker-stat-directory-value-box" className="bg-muted p-2 rounded text-xs break-all font-mono border flex items-start gap-1">
                    <Folder id="db-backups-worker-stat-directory-icon" className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span id="db-backups-worker-stat-directory-text">{worker?.details?.backup_dir || "—"}</span>
                  </div>
                </div>

                {worker?.details?.last_error && (
                  <div id="db-backups-worker-error-alert" className="bg-destructive/15 text-destructive p-3 rounded text-xs border border-destructive/20 flex items-start gap-2">
                    <Folder id="db-backups-worker-error-alert-icon" className="h-4 w-4 shrink-0 mt-0.5" />
                    <div id="db-backups-worker-error-alert-content" className="space-y-1">
                      <p className="font-semibold">Last Backup Error:</p>
                      <p className="break-all">{worker.details.last_error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Backup List section */}
          <div id="db-backups-list-panel" className="lg:col-span-2 space-y-6">
            <Card id="db-backups-list-card">
              <CardContent id="db-backups-list-content" className="p-0">
                {backups.length === 0 ? (
                  <div id="db-backups-empty-container" className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Database id="db-backups-empty-icon" className="h-10 w-10 text-muted-foreground/50" />
                    <p id="db-backups-empty-text" className="font-medium text-sm">
                      {t("dbBackups.noBackups") || "No database backup files found."}
                    </p>
                  </div>
                ) : (
                  <Table id="db-backups-table">
                    <TableHeader id="db-backups-table-header">
                      <TableRow id="db-backups-table-header-row">
                        <TableHead id="db-backups-th-name">{t("dbBackups.fileName") || "File Name"}</TableHead>
                        <TableHead id="db-backups-th-modified">{t("dbBackups.modifiedAt") || "Modified Date"}</TableHead>
                        <TableHead id="db-backups-th-size" className="text-right">{t("dbBackups.size") || "Size"}</TableHead>
                        <TableHead id="db-backups-th-actions" className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="db-backups-table-body">
                      {backups.map((item) => (
                        <TableRow id={`backup-row-${item.file_name}`} key={item.file_name} className="hover:bg-muted/50">
                          <TableCell id={`backup-cell-name-${item.file_name}`} className="font-mono font-medium text-xs break-all max-w-[250px] sm:max-w-none">
                            {item.file_name}
                          </TableCell>
                          <TableCell id={`backup-cell-date-${item.file_name}`} className="text-xs text-muted-foreground">
                            {formatISODate(item.modified_at)}
                          </TableCell>
                          <TableCell id={`backup-cell-size-${item.file_name}`} className="text-right text-xs">
                            {formatBytes(item.size_bytes)}
                          </TableCell>
                          <TableCell id={`backup-cell-actions-${item.file_name}`} className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    id={`backup-download-btn-${item.file_name}`}
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void handleDownload(item.file_name)}
                                    disabled={actionLoading !== null}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    {actionLoading === item.file_name ? (
                                      <Loader2 id={`backup-download-loader-${item.file_name}`} className="h-4 w-4 animate-spin text-primary" />
                                    ) : (
                                      <Download id={`backup-download-icon-${item.file_name}`} className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p id={`backup-download-tooltip-${item.file_name}`}>{t("dbBackups.download") || "Download"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
