"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight, Dices, ExternalLink, Hammer, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { GachaPack, GachaPoolEntry, ItemDefinition, ItemRarity } from "@/types/inventory";
import { RARITY_COLORS } from "@/types/inventory";
import type { GameLimits } from "@/types/game";

function RarityBadge({ domId, rarity }: { domId: string; rarity: ItemRarity }) {
  const colors = RARITY_COLORS[rarity];

  if (!colors) {
    return (
      <span id={domId} className="gacha-pack-rarity-badge inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-gray-400 border-gray-400 bg-gray-400/10 capitalize w-fit">
        {rarity}
      </span>
    );
  }

  return (
    <span id={domId} className={`gacha-pack-rarity-badge inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${colors.text} ${colors.border} ${colors.bg} capitalize w-fit`}>
      {rarity}
    </span>
  );
}

function formatPct(pct: number): string {
  if (pct === 0) {
    return "0%";
  }
  if (pct >= 1) {
    return `${pct.toFixed(2)}%`;
  }
  if (pct >= 0.01) {
    return `${pct.toFixed(4)}%`;
  }
  if (pct >= 0.0001) {
    return `${pct.toFixed(6)}%`;
  }
  return `${pct.toFixed(10).replace(/\.?0+$/, "")}%`;
}

type GachaGroupTableProps = {
  gameId: string;
  gachaAllItems: ItemDefinition[];
  entries: GachaPoolEntry[];
  heading: string;
  sectionDomId: string;
};

function GachaGroupTable({ gameId, gachaAllItems, entries, heading, sectionDomId }: GachaGroupTableProps) {
  const { t } = useTranslation();
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  return (
    <div id={`${sectionDomId}-section`} className="gacha-pack-drop-table-section">
      <p id={`${sectionDomId}-heading`} className="gacha-pack-drop-table-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {heading}
      </p>
      {entries.length === 0 ? (
        <p id={`${sectionDomId}-empty`} className="gacha-pack-drop-table-empty text-xs text-muted-foreground italic">
          No items in pool
        </p>
      ) : (
        <div id={`${sectionDomId}-container`} className="gacha-pack-drop-table-container rounded-md border overflow-hidden">
          <Table id={`${sectionDomId}-table`} className="gacha-pack-drop-table">
            <TableHeader id={`${sectionDomId}-header`} className="gacha-pack-drop-table-header">
              <TableRow id={`${sectionDomId}-header-row`} className="gacha-pack-drop-table-header-row bg-muted/50">
                <TableHead id={`${sectionDomId}-header-link`} className="gacha-pack-drop-table-header-link text-xs h-8 w-8" />
                <TableHead id={`${sectionDomId}-header-name`} className="gacha-pack-drop-table-header-name text-xs h-8">{t("items.name")}</TableHead>
                <TableHead id={`${sectionDomId}-header-rate`} className="gacha-pack-drop-table-header-rate text-xs h-8 text-right w-24">{t("items.dropRate")}</TableHead>
                <TableHead id={`${sectionDomId}-header-weight`} className="gacha-pack-drop-table-header-weight text-xs h-8 text-right w-24">{t("items.weight")}</TableHead>
                <TableHead id={`${sectionDomId}-header-quantity-range`} className="gacha-pack-drop-table-header-quantity-range text-xs h-8 text-right w-20">
                  {t("items.min")} / {t("items.max")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody id={`${sectionDomId}-body`} className="gacha-pack-drop-table-body">
              {[...entries].sort((a, b) => b.weight - a.weight).map((entry, index) => {
                const item = gachaAllItems.find((record) => record.id === entry.item_definition_id);
                const pct = totalWeight > 0 ? (entry.weight / totalWeight) * 100 : 0;
                const dropRowDomId = `${sectionDomId}-drop-${index}-${entry.item_definition_id}`;

                return (
                  <TableRow key={index} id={`${dropRowDomId}-row`} className="gacha-pack-drop-row">
                    <TableCell id={`${dropRowDomId}-link-cell`} className="gacha-pack-drop-link-cell text-xs py-2 w-8">
                      <Link id={`${dropRowDomId}-link`} className="gacha-pack-drop-link" href={`/games/${gameId}/items/${entry.item_definition_id}`} target="_blank" title={t("items.goToItemDef")}>
                        <ExternalLink id={`${dropRowDomId}-link-icon`} className="gacha-pack-drop-link-icon h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </Link>
                    </TableCell>
                    <TableCell id={`${dropRowDomId}-name-cell`} className="gacha-pack-drop-name-cell text-xs py-2">
                      {item ? (
                        <div id={`${dropRowDomId}-item`} className="gacha-pack-drop-item">
                          <span id={`${dropRowDomId}-item-name`} className="gacha-pack-drop-item-name font-medium">{item.name}</span>
                        </div>
                      ) : (
                        <code id={`${dropRowDomId}-fallback-id`} className="gacha-pack-drop-fallback-id font-mono text-[11px] text-muted-foreground">
                          {entry.item_definition_id.slice(0, 8)}...
                        </code>
                      )}
                    </TableCell>
                    <TableCell id={`${dropRowDomId}-rate-cell`} className="gacha-pack-drop-rate-cell text-xs py-2 text-right">
                      <span id={`${dropRowDomId}-rate-value`} className="gacha-pack-drop-rate-value tabular-nums text-muted-foreground">
                        {formatPct(pct)}
                      </span>
                    </TableCell>
                    <TableCell id={`${dropRowDomId}-weight-cell`} className="gacha-pack-drop-weight-cell text-xs py-2 text-right tabular-nums text-muted-foreground">
                      {entry.weight.toLocaleString()}
                    </TableCell>
                    <TableCell id={`${dropRowDomId}-quantity-range-cell`} className="gacha-pack-drop-quantity-range-cell text-xs py-2 text-right tabular-nums font-medium">
                      {entry.quantity_min} – {entry.quantity_max}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

type ItemsPageGachaSectionProps = {
  gameId: string;
  gachaPacks: GachaPack[];
  filteredGachaPacks: GachaPack[];
  gachaAllItems: ItemDefinition[];
  gachaLoading: boolean;
  gachaError: string | null;
  gameLimits: GameLimits | null;
  gachaSearch: string;
  setGachaSearch: Dispatch<SetStateAction<string>>;
  expandedPack: string | null;
  setExpandedPack: Dispatch<SetStateAction<string | null>>;
  togglingId: string | null;
  setDeletingPack: Dispatch<SetStateAction<GachaPack | null>>;
  fetchGachaData: () => void | Promise<void>;
  gachaOpenCreate: () => void;
  gachaOpenEdit: (pack: GachaPack) => void;
  handleGachaToggle: (pack: GachaPack) => void | Promise<void>;
};

export function ItemsPageGachaSection({
  gameId,
  gachaPacks,
  filteredGachaPacks,
  gachaAllItems,
  gachaLoading,
  gachaError,
  gameLimits,
  gachaSearch,
  setGachaSearch,
  expandedPack,
  setExpandedPack,
  togglingId,
  setDeletingPack,
  fetchGachaData,
  gachaOpenCreate,
  gachaOpenEdit,
  handleGachaToggle,
}: ItemsPageGachaSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {t("items.gachaPacksTitle")}
            <Sheet>
              <SheetTrigger asChild>
                <button className="inline-flex items-center justify-center rounded-full h-5 w-5 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors" title={t("items.gachaAntiSpamTitle")}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    {t("items.gachaAntiSpamTitle")}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6 text-sm">
                  <div>
                    <h3 className="font-semibold text-base mb-2">{t("items.gachaAntiSpamFlow")}</h3>
                    <div className="space-y-1 rounded-md bg-muted/50 border px-3 py-3 font-mono text-xs leading-relaxed">
                      <p>{t("items.gachaAntiSpamFlowStep1")}</p>
                      <p className="pl-3 text-muted-foreground">? {t("items.gachaAntiSpamFlowStep2")}</p>
                      <p className="pl-3 text-muted-foreground">? {t("items.gachaAntiSpamFlowStep3")}</p>
                      <p className="pl-3 text-muted-foreground">? {t("items.gachaAntiSpamFlowStep4")}</p>
                      <p className="pl-8 text-muted-foreground">? {t("items.gachaAntiSpamFlowStep4a")}</p>
                      <p className="pl-8 text-muted-foreground">? {t("items.gachaAntiSpamFlowStep4b")}</p>
                      <p className="pl-3 text-muted-foreground">? {t("items.gachaAntiSpamFlowStep5")}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">{t("items.gachaAntiSpamCalcTitle")}</h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>{t("items.gachaAntiSpamCalcLine1")}</li>
                      <li>{t("items.gachaAntiSpamCalcLine2")}</li>
                      <li className="text-destructive font-medium">{t("items.gachaAntiSpamCalcLine3")}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">{t("items.gachaAntiSpamResetTitle")}</h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>{t("items.gachaAntiSpamResetLine1")}</li>
                      <li>{t("items.gachaAntiSpamResetLine2")}</li>
                      <li className="font-medium text-foreground">{t("items.gachaAntiSpamResetLine3")}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">{t("items.gachaAntiSpamExampleTitle")}</h3>
                    <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 border px-3 py-3 text-xs leading-relaxed font-mono text-foreground/80">
                      {[
                        "00:00  Player opens pack #1   -> count=1, set EXPIRE 60s",
                        "00:02  Player opens pack #2   -> count=2",
                        "...",
                        "00:15  Player opens pack #10  -> count=10",
                        "00:16  Player opens pack #11  -> count=11 > 10            -> 429",
                        "00:30  Resend old idempotency key                        -> cached",
                        "01:00  Key expires, counter resets",
                        "01:01  Player opens pack #1   -> count=1, set EXPIRE 60s",
                      ].join("\n")}
                    </pre>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {gameLimits?.max_gacha_packs != null ? (
              <>
                <span className={gachaPacks.length >= gameLimits.max_gacha_packs ? "text-destructive font-medium" : ""}>
                  {gachaPacks.length} / {gameLimits.max_gacha_packs} {t("items.gachaPacksUnit")}
                </span>
                <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                  <span
                    className={`block h-full rounded-full transition-all ${gachaPacks.length >= gameLimits.max_gacha_packs ? "bg-destructive" : gachaPacks.length / gameLimits.max_gacha_packs >= 0.8 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${Math.min((gachaPacks.length / (gameLimits.max_gacha_packs || 1)) * 100, 100)}%` }}
                  />
                </span>
                <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title={t("items.managePlugins")}>
                  <Hammer className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              `${gachaPacks.length} ${t("items.gachaPacksConfigured")}`
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input id="gacha-search-input" placeholder={t("items.searchByNameOrId")} value={gachaSearch} onChange={(e) => setGachaSearch(e.target.value)} className="pl-8 h-8 w-56 text-sm" />
            {gachaSearch && (
              <button id="gacha-search-clear-btn" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setGachaSearch("")} title={t("items.clearSearch")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={fetchGachaData} title={t("common.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={gachaOpenCreate} disabled={!!(gameLimits?.max_gacha_packs != null && gachaPacks.length >= gameLimits.max_gacha_packs)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("items.newGachaPack")}
          </Button>
        </div>
      </div>

      {gachaLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : gachaError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{gachaError}</CardContent>
        </Card>
      ) : gachaPacks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Dices className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("items.noGachaPacks")}</p>
            <Button onClick={gachaOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t("items.createFirstPack")}
            </Button>
          </CardContent>
        </Card>
      ) : filteredGachaPacks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Search className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">{t("items.noMatchingContainers")}</p>
            <Button variant="outline" size="sm" onClick={() => setGachaSearch("")}>
              {t("items.clearSearch")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div id="gacha-packs-list" className="space-y-3">
          {filteredGachaPacks.map((pack) => {
            const isExpanded = expandedPack === pack.id;
            const packDomId = `gacha-pack-${pack.id}`;

            return (
              <Card id={`${packDomId}-card`} key={pack.id} className={`gacha-pack-card transition-all ${!pack.is_enabled ? "opacity-60" : ""}`}>
                <div id={`${packDomId}-row`} className="gacha-pack-row cursor-pointer select-none" onClick={() => setExpandedPack(isExpanded ? null : pack.id)}>
                  <CardHeader id={`${packDomId}-row-header`} className="gacha-pack-row-header pb-3">
                    <div id={`${packDomId}-row-content`} className="gacha-pack-row-content flex items-center gap-3">
                      {isExpanded ? <ChevronDown id={`${packDomId}-row-collapse-icon`} className="gacha-pack-row-collapse-icon h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight id={`${packDomId}-row-expand-icon`} className="gacha-pack-row-expand-icon h-4 w-4 text-muted-foreground shrink-0" />}

                      <div id={`${packDomId}-identity`} className="gacha-pack-identity flex flex-col gap-0.5 min-w-0 flex-1">
                        <div id={`${packDomId}-title-row`} className="gacha-pack-title-row flex items-center gap-2 flex-wrap">
                          <CardTitle id={`${packDomId}-name`} className="gacha-pack-name text-base truncate">{pack.name}</CardTitle>
                          <Badge id={`${packDomId}-status`} variant={pack.is_enabled ? "default" : "secondary"} className="gacha-pack-status text-xs shrink-0">
                            {pack.is_enabled ? t("items.enabled") : t("items.disabled")}
                          </Badge>
                        </div>
                        <div id={`${packDomId}-id-row`} className="gacha-pack-id-row flex items-center gap-1 text-xs font-mono text-muted-foreground">
                          <span id={`${packDomId}-id-value`} className="gacha-pack-id-value">ID: {pack.id}</span>
                          <CopyButton id={`${packDomId}-id-copy`} iconId={`${packDomId}-id-copy-icon`} className="gacha-pack-id-copy" text={pack.id} size="h-3 w-3" />
                        </div>
                        {pack.code_name && (
                          <div id={`${packDomId}-code-row`} className="gacha-pack-code-row flex items-center gap-1 text-xs font-mono text-muted-foreground">
                            <span id={`${packDomId}-code-value`} className="gacha-pack-code-value">Code: {pack.code_name}</span>
                            <CopyButton id={`${packDomId}-code-copy`} iconId={`${packDomId}-code-copy-icon`} className="gacha-pack-code-copy" text={pack.code_name} size="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div id={`${packDomId}-delivery`} className="gacha-pack-delivery w-36 shrink-0 text-sm text-muted-foreground">
                        <span id={`${packDomId}-delivery-badge`} className="gacha-pack-delivery-badge inline-flex flex-col items-start px-2 py-1 rounded text-xs font-medium border bg-muted/40 leading-tight">
                          <span id={`${packDomId}-delivery-label`} className="gacha-pack-delivery-label text-muted-foreground">{t("items.deliveryToLabel")}</span>
                          <span id={`${packDomId}-delivery-value`} className="gacha-pack-delivery-value text-foreground">
                            {pack.collect_destination === "inventory" ? t("items.collectDestinationMainInventoryShort") : t("items.collectDestinationMailboxShort")}
                          </span>
                        </span>
                      </div>

                      <div id={`${packDomId}-item-count`} className="gacha-pack-item-count w-28 shrink-0 text-sm text-muted-foreground">
                        {pack.item_pool.length} {t("items.itemsUnit")}
                      </div>

                      <div id={`${packDomId}-actions`} className="gacha-pack-actions flex items-center gap-1 shrink-0">
                        <Switch id={`${packDomId}-toggle`} className="gacha-pack-toggle" checked={pack.is_enabled} onCheckedChange={() => handleGachaToggle(pack)} disabled={togglingId === pack.id} title={pack.is_enabled ? t("items.disablePack") : t("items.enablePack")} onClick={(e) => e.stopPropagation()} />
                        <Button id={`${packDomId}-edit`} size="icon" variant="ghost" className="gacha-pack-edit h-8 w-8" onClick={(e) => { e.stopPropagation(); gachaOpenEdit(pack); }}>
                          <Pencil id={`${packDomId}-edit-icon`} className="gacha-pack-edit-icon h-3.5 w-3.5" />
                        </Button>
                        <Button id={`${packDomId}-delete`} size="icon" variant="ghost" className="gacha-pack-delete h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingPack(pack); }}>
                          <Trash2 id={`${packDomId}-delete-icon`} className="gacha-pack-delete-icon h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {isExpanded && (
                  <>
                    <Separator id={`${packDomId}-expand-separator`} className="gacha-pack-expand-separator" />
                    <CardContent id={`${packDomId}-expand-content`} className="gacha-pack-expand-content pt-4 pb-4">
                      {pack.description && (
                        <div id={`${packDomId}-description-section`} className="mb-4">
                          <p id={`${packDomId}-description-heading`} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            {t("items.gachaDescriptionLabel")}
                          </p>
                          <p id={`${packDomId}-description-text`} className="text-sm whitespace-pre-wrap break-words">
                            {pack.description}
                          </p>
                        </div>
                      )}
                      <div id={`${packDomId}-expand-grid`} className="gacha-pack-expand-grid grid grid-cols-1 gap-4 items-start lg:grid-cols-2">
                        <div id={`${packDomId}-key-requirements-section`} className="gacha-pack-key-requirements-section lg:order-2">
                          <p id={`${packDomId}-key-requirements-heading`} className="gacha-pack-key-requirements-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            {t("items.keyRequirements")}
                          </p>
                          {(pack.key_requirements ?? []).length === 0 ? (
                            <p id={`${packDomId}-key-requirements-empty`} className="gacha-pack-key-requirements-empty text-xs text-muted-foreground italic">
                              {t("items.noKeyRequired")}
                            </p>
                          ) : (
                            <div id={`${packDomId}-key-requirements-table-container`} className="gacha-pack-key-requirements-table-container rounded-md border overflow-hidden">
                              <Table id={`${packDomId}-key-requirements-table`} className="gacha-pack-key-requirements-table">
                                <TableHeader id={`${packDomId}-key-requirements-table-header`} className="gacha-pack-key-requirements-table-header">
                                  <TableRow id={`${packDomId}-key-requirements-header-row`} className="gacha-pack-key-requirements-header-row bg-muted/50">
                                    <TableHead id={`${packDomId}-key-requirements-header-link`} className="gacha-pack-key-requirements-header-link text-xs h-8 w-8" />
                                    <TableHead id={`${packDomId}-key-requirements-header-name`} className="gacha-pack-key-requirements-header-name text-xs h-8">{t("items.name")}</TableHead>
                                    <TableHead id={`${packDomId}-key-requirements-header-rarity`} className="gacha-pack-key-requirements-header-rarity text-xs h-8 w-24">{t("items.rarityHeader")}</TableHead>
                                    <TableHead id={`${packDomId}-key-requirements-header-quantity`} className="gacha-pack-key-requirements-header-quantity text-xs h-8 text-right w-12">{t("items.quantity")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody id={`${packDomId}-key-requirements-table-body`} className="gacha-pack-key-requirements-table-body">
                                  {(pack.key_requirements ?? []).map((kr, index) => {
                                    const item = gachaAllItems.find((entry) => entry.id === kr.item_definition_id);
                                    const keyRequirementDomId = `${packDomId}-key-requirement-${index}-${kr.item_definition_id}`;

                                    return (
                                      <TableRow key={index} id={`${keyRequirementDomId}-row`} className="gacha-pack-key-requirement-row">
                                        <TableCell id={`${keyRequirementDomId}-link-cell`} className="gacha-pack-key-requirement-link-cell text-xs py-2 w-8">
                                          <Link id={`${keyRequirementDomId}-link`} className="gacha-pack-key-requirement-link" href={`/games/${gameId}/items/${kr.item_definition_id}`} target="_blank" title={t("items.goToItemDef")}>
                                            <ExternalLink id={`${keyRequirementDomId}-link-icon`} className="gacha-pack-key-requirement-link-icon h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                                          </Link>
                                        </TableCell>
                                        <TableCell id={`${keyRequirementDomId}-name-cell`} className="gacha-pack-key-requirement-name-cell text-xs py-2">
                                          {item ? (
                                            <div id={`${keyRequirementDomId}-item`} className="gacha-pack-key-requirement-item flex items-center gap-1.5 flex-wrap">
                                              <span id={`${keyRequirementDomId}-item-name`} className="gacha-pack-key-requirement-item-name font-medium">
                                                {item.name}
                                              </span>
                                            </div>
                                          ) : (
                                            <code id={`${keyRequirementDomId}-fallback-id`} className="gacha-pack-key-requirement-fallback-id font-mono text-[11px] text-muted-foreground">
                                              {kr.item_definition_id.slice(0, 8)}...
                                            </code>
                                          )}
                                        </TableCell>
                                        <TableCell id={`${keyRequirementDomId}-rarity-cell`} className="gacha-pack-key-requirement-rarity-cell text-xs py-2">
                                          {item?.rarity ? <RarityBadge domId={`${keyRequirementDomId}-rarity-badge`} rarity={item.rarity} /> : <span id={`${keyRequirementDomId}-rarity-empty`} className="gacha-pack-key-requirement-rarity-empty text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell id={`${keyRequirementDomId}-quantity-cell`} className="gacha-pack-key-requirement-quantity-cell text-xs py-2 text-right font-semibold tabular-nums">
                                          {kr.quantity}x
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        <div id={`${packDomId}-primary-group`} className="lg:order-1">
                          <GachaGroupTable
                            gameId={gameId}
                            gachaAllItems={gachaAllItems}
                            entries={pack.item_pool}
                            heading={t("items.primaryGroup")}
                            sectionDomId={`${packDomId}-primary-group`}
                          />
                        </div>
                      </div>
                      {(pack.drop_groups ?? []).length > 0 && (
                        <div id={`${packDomId}-secondary-groups`} className="mt-4">
                          <div id={`${packDomId}-secondary-groups-grid`} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {(pack.drop_groups ?? []).map((group, groupIndex) => (
                              <GachaGroupTable
                                key={group.key}
                                gameId={gameId}
                                gachaAllItems={gachaAllItems}
                                entries={group.item_pool}
                                heading={group.key}
                                sectionDomId={`${packDomId}-secondary-group-${groupIndex}-${group.key}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
