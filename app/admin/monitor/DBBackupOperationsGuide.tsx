"use client";

import { Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/use-translation";

interface DBBackupOperationsGuideProps {
  id: string;
}

export function DBBackupOperationsGuide({ id }: DBBackupOperationsGuideProps) {
  const { t } = useTranslation();

  return (
    <Card id={id} className="lg:col-span-3">
      <CardHeader id="db-backups-guide-header" className="pb-3">
        <CardTitle id="db-backups-guide-title" className="flex items-center gap-2 text-base">
          <Terminal id="db-backups-guide-icon" className="h-5 w-5 text-primary" />
          <span id="db-backups-guide-title-text">{t("dbBackups.guideTitle") || "Database Operations Guide"}</span>
        </CardTitle>
        <CardDescription id="db-backups-guide-desc" className="text-xs mt-1.5 leading-relaxed">
          {t("dbBackups.guideDesc") || "Run these commands from the backend repository to list, upload, restore, or switch databases for an environment."}
        </CardDescription>
      </CardHeader>
      <CardContent id="db-backups-guide-content" className="space-y-4 text-xs">
        <div id="db-backups-guide-list-section" className="space-y-1.5 border-b pb-3">
          <p id="db-backups-guide-list-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideListSyntax") || "List all databases and mark the current database:"}
          </p>
          <pre id="db-backups-guide-list-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=&lt;env&gt; make db-list
          </pre>
        </div>

        <div id="db-backups-guide-upload-section" className="space-y-1.5 border-b pb-3">
          <p id="db-backups-guide-upload-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideUploadSyntax") || "Upload a backup file (searches local ./backups/db/ by default):"}
          </p>
          <pre id="db-backups-guide-upload-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=&lt;env&gt; make upload-db &lt;file-name-or-path&gt;
          </pre>
          <p id="db-backups-guide-upload-example-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideUploadExample") || "Example (Upload to QA):"}
          </p>
          <pre id="db-backups-guide-upload-example-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=qa make upload-db backup-file.dump
          </pre>
        </div>

        <div id="db-backups-guide-restore-section" className="space-y-1.5 border-b pb-3">
          <p id="db-backups-guide-restore-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideSyntax") || "Restore a file from local DB_BACKUP_DIR into a database:"}
          </p>
          <pre id="db-backups-guide-restore-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=&lt;env&gt; make restore &lt;file-name&gt; &lt;new-db-name&gt;
          </pre>
          <p id="db-backups-guide-restore-example-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideExample") || "Example (Restore to QA with new DB):"}
          </p>
          <pre id="db-backups-guide-restore-example-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=qa make restore backup-file.dump ss_game_new_db
          </pre>
        </div>

        <div id="db-backups-guide-change-section" className="space-y-1.5">
          <p id="db-backups-guide-change-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideChangeSyntax") || "Point the backend to an existing database without renaming it:"}
          </p>
          <pre id="db-backups-guide-change-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=&lt;env&gt; make change-db &lt;new-db&gt;
          </pre>
          <p id="db-backups-guide-change-example-label" className="font-semibold text-muted-foreground">
            {t("dbBackups.guideChangeExample") || "Example (Use a restored QA database):"}
          </p>
          <pre id="db-backups-guide-change-example-command" className="bg-muted p-2.5 rounded break-all font-mono border text-[10px] select-all">
            ENV=qa make change-db ss_game_restore
          </pre>
        </div>

        <div id="db-backups-guide-note" className="text-[10px] text-amber-500 dark:text-amber-400 font-medium border-l-2 border-amber-500 pl-2 leading-relaxed">
          {t("dbBackups.guideNote") || "Restore requires an empty target database and never drops existing tables. Database switching shows current/new statistics, asks for confirmation, updates DB_NAME and POSTGRES_DB without renaming a database, then reloads the backend automatically. Remote restart failures roll back the configuration."}
        </div>
      </CardContent>
    </Card>
  );
}
