"use client";

import { Terminal } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/use-translation";

interface DBBackupOperationsGuideProps {
  id: string;
}

const LABEL_CLASS = "font-semibold text-muted-foreground";

function GuideCommand({ id, command }: { id: string; command: string }) {
  const { t } = useTranslation();
  return (
    <div id={`${id}-wrap`} className="group relative rounded-md border bg-muted">
      <pre id={id} className="overflow-x-auto whitespace-pre-wrap break-all py-3 pl-4 pr-12 font-mono text-sm leading-relaxed text-foreground select-all">
        {command}
      </pre>
      <CopyButton
        id={`${id}-copy`}
        iconId={`${id}-copy-icon`}
        text={command}
        label={t("dbBackups.copyCommand") || "Copy command"}
        size="h-4 w-4"
        className="absolute right-2 top-2 ml-0 rounded-md border bg-background p-1.5 shadow-sm"
      />
    </div>
  );
}

function GuideBullets({ id, items }: { id: string; items: { key: string; text: string }[] }) {
  return (
    <ul id={id} className="list-disc pl-4 space-y-1 leading-relaxed">
      {items.map((item) => (
        <li key={item.key} id={`${id}-${item.key}`}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export function DBBackupOperationsGuide({ id }: DBBackupOperationsGuideProps) {
  const { t } = useTranslation();

  const prerequisites = [
    { key: "file", text: t("dbBackups.guideRestorePrereqFile") || "Put the backup file in the local DB_BACKUP_DIR (default ./backups/db/) or upload it first with make upload-db." },
    { key: "admin", text: t("dbBackups.guideRestorePrereqAdmin") || "DB_ADMIN_USER / DB_ADMIN_PASSWORD are optional: restore uses them as the superuser, and falls back to DB_USER / DB_PASSWORD when unset. Set them once DB_USER is ss_app, because that role cannot create databases or roles." },
    { key: "safety", text: t("dbBackups.guideRestoreSafety") || "Production safety: ENV=pro and database names containing \"prod\" need PG_RESTORE_ALLOW_PROD=true. RESTORE_CONFIRM=yes skips the confirmation prompt." },
  ];

  const behaviour = [
    { key: "new", text: t("dbBackups.guideRestoreWhatNew") || "New database (does not exist yet): creates the application role if missing (an existing role is never modified), creates the database owned by that role, restores the file, then gives that role ownership of the tables, sequences, views, types and functions in the public schema." },
    { key: "existing", text: t("dbBackups.guideRestoreWhatExisting") || "Existing database: restored only when it is empty, exactly as before. Its owner, objects and roles are never changed." },
  ];

  const afterSteps = [
    { key: "env", text: t("dbBackups.guideRestoreAfterStep1") || "In .env.<env> set DB_NAME to the new database, DB_USER to DB_APP_USER and DB_PASSWORD to the value of DB_APP_PASSWORD. make change-db shows the owner role of the current and new database and warns when it differs from DB_USER, but it only updates DB_NAME, so set DB_USER and DB_PASSWORD yourself." },
    { key: "deploy", text: t("dbBackups.guideRestoreAfterStep2") || "Deploy the updated .env.<env> and restart the backend (for example make deploy-code)." },
    { key: "migrate", text: t("dbBackups.guideRestoreAfterStep3") || "Run make deploy-migrate. When the database owner is not ss_user, migrations run as the owner role, so new tables stay owned by it. A migration that runs CREATE EXTENSION needs a superuser and must be applied separately." },
    { key: "rollback", text: t("dbBackups.guideRestoreRollback") || "Rollback: the previous database and its owner are untouched. Set DB_NAME, DB_USER and DB_PASSWORD back to the old values and redeploy." },
  ];

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
      <CardContent id="db-backups-guide-content" className="space-y-5 text-sm">
        <div id="db-backups-guide-list-section" className="space-y-1.5 border-b pb-3">
          <p id="db-backups-guide-list-label" className={LABEL_CLASS}>
            {t("dbBackups.guideListSyntax") || "List all databases and mark the current database:"}
          </p>
          <GuideCommand id="db-backups-guide-list-command" command="ENV=<env> make db-list" />
        </div>

        <div id="db-backups-guide-upload-section" className="space-y-1.5 border-b pb-3">
          <p id="db-backups-guide-upload-label" className={LABEL_CLASS}>
            {t("dbBackups.guideUploadSyntax") || "Upload a backup file (searches local ./backups/db/ by default):"}
          </p>
          <GuideCommand id="db-backups-guide-upload-command" command="ENV=<env> make upload-db <file-name-or-path>" />
          <p id="db-backups-guide-upload-example-label" className={LABEL_CLASS}>
            {t("dbBackups.guideUploadExample") || "Example (Upload to local):"}
          </p>
          <GuideCommand id="db-backups-guide-upload-example-command" command="ENV=local make upload-db backup-file.dump" />
        </div>

        <div id="db-backups-guide-restore-section" className="space-y-3 border-b pb-3">
          <div id="db-backups-guide-restore-command-block" className="space-y-1.5">
            <p id="db-backups-guide-restore-label" className={LABEL_CLASS}>
              {t("dbBackups.guideSyntax") || "Restore a file from local DB_BACKUP_DIR into a database:"}
            </p>
            <GuideCommand id="db-backups-guide-restore-command" command="ENV=<env> make restore <file-name> <new-db-name>" />
            <p id="db-backups-guide-restore-example-label" className={LABEL_CLASS}>
              {t("dbBackups.guideExample") || "Example (Restore to local with new DB):"}
            </p>
            <GuideCommand id="db-backups-guide-restore-example-command" command="ENV=local make restore backup-file.dump ss_game_new_db" />
          </div>

          <div id="db-backups-guide-restore-prereq-block" className="space-y-1.5">
            <p id="db-backups-guide-restore-prereq-title" className={LABEL_CLASS}>
              {t("dbBackups.guideRestorePrereqTitle") || "Before you run restore"}
            </p>
            <p id="db-backups-guide-restore-prereq-env-label" className="leading-relaxed">
              {t("dbBackups.guideRestorePrereqEnv") || "Add these variables to .env.<env> (DB_APP_PASSWORD is required only when the target database does not exist yet; letters and digits only):"}
            </p>
            <GuideCommand id="db-backups-guide-restore-env-example" command={"DB_APP_USER=ss_app\nDB_APP_PASSWORD=<letters-and-digits>\nDB_ADMIN_USER=ss_user\nDB_ADMIN_PASSWORD=<superuser password>"} />
            <GuideBullets id="db-backups-guide-restore-prereq-list" items={prerequisites} />
          </div>

          <div id="db-backups-guide-restore-what-block" className="space-y-1.5">
            <p id="db-backups-guide-restore-what-title" className={LABEL_CLASS}>
              {t("dbBackups.guideRestoreWhatTitle") || "What restore does"}
            </p>
            <GuideBullets id="db-backups-guide-restore-what-list" items={behaviour} />
          </div>

          <div id="db-backups-guide-restore-after-block" className="space-y-1.5">
            <p id="db-backups-guide-restore-after-title" className={LABEL_CLASS}>
              {t("dbBackups.guideRestoreAfterTitle") || "After restore: switch the backend to the new database"}
            </p>
            <GuideCommand id="db-backups-guide-restore-after-example" command={"ENV=<env> make restore <file-name> <new-db-name>\n# .env.<env>: DB_NAME=<new-db-name>  DB_USER=ss_app  DB_PASSWORD=<DB_APP_PASSWORD>\nENV=<env> make deploy-code\nENV=<env> make deploy-migrate"} />
            <GuideBullets id="db-backups-guide-restore-after-list" items={afterSteps} />
          </div>
        </div>

        <div id="db-backups-guide-change-section" className="space-y-1.5">
          <p id="db-backups-guide-change-label" className={LABEL_CLASS}>
            {t("dbBackups.guideChangeSyntax") || "Point the backend to an existing database without renaming it:"}
          </p>
          <GuideCommand id="db-backups-guide-change-command" command="ENV=<env> make change-db <new-db>" />
          <p id="db-backups-guide-change-example-label" className={LABEL_CLASS}>
            {t("dbBackups.guideChangeExample") || "Example (Use a restored local database):"}
          </p>
          <GuideCommand id="db-backups-guide-change-example-command" command="ENV=local make change-db ss_game_restore" />
        </div>

        <div id="db-backups-guide-note" className="text-xs text-amber-500 dark:text-amber-400 font-medium border-l-2 border-amber-500 pl-2 leading-relaxed">
          {t("dbBackups.guideNote") || "Restore requires an empty target database and never drops existing tables. Database switching shows current/new statistics, asks for confirmation, updates DB_NAME without renaming a database, then reloads the backend automatically. Remote restart failures roll back the configuration."}
        </div>
      </CardContent>
    </Card>
  );
}
