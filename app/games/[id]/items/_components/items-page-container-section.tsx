"use client";

import type { Dispatch, SetStateAction } from "react";
import { Fragment } from "react";
import Link from "next/link";
import { Bot, Check, ChevronDown, ChevronRight, ExternalLink, Loader2, Package, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ContainerDefinition, ItemDefinition } from "@/types/inventory";

const CONTAINER_TYPE_META: Record<string, { label: string; className: string }> = {
  inventory: { label: "Inventory", className: "bg-gray-500/15 text-gray-400 border-gray-400/40" },
  chest: { label: "Chest", className: "bg-amber-500/15 text-amber-500 border-amber-500/40" },
  bag: { label: "Bag", className: "bg-green-500/15 text-green-500 border-green-500/40" },
  vault: { label: "Vault", className: "bg-purple-500/15 text-purple-500 border-purple-500/40" },
  shulker_box: { label: "Shulker Box", className: "bg-pink-500/15 text-pink-500 border-pink-500/40" },
  equipment: { label: "Equipment", className: "bg-blue-500/15 text-blue-400 border-blue-400/40" },
};

function ContainerTypeBadge({ type }: { type: string }) {
  const meta = CONTAINER_TYPE_META[type] ?? {
    label: type,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${meta.className}`}>
      {meta.label}
    </span>
  );
}

type EditingField = {
  id: string;
  field: string;
} | null;

type MetadataRow = {
  k: string;
  v: string;
};

type ItemsPageContainerSectionProps = {
  t: (key: string) => string;
  gameId: string;
  convPanelOpen: boolean;
  containerTotal: number;
  containerSearch: string;
  containerSearchDebounced: string;
  filteredContainerDefs: ContainerDefinition[];
  containerLoading: boolean;
  containerError: string | null;
  linkingContainerId: string | null;
  expandedContainerId: string | null;
  containerDetailCache: Record<string, ContainerDefinition>;
  containerDetailLoading: string | null;
  editingField: EditingField;
  editValue: string;
  editValue2: string;
  containerItemsOnly: boolean;
  containerAllItems: ItemDefinition[];
  metadataRows: MetadataRow[];
  containerTotalPages: number;
  containerCurrentPage: number;
  containerOffset: number;
  containerLimit: number;
  setContainerSearch: Dispatch<SetStateAction<string>>;
  setShowCreateContainer: Dispatch<SetStateAction<boolean>>;
  setDeletingContainer: Dispatch<SetStateAction<ContainerDefinition | null>>;
  setEditingField: Dispatch<SetStateAction<EditingField>>;
  setEditValue: Dispatch<SetStateAction<string>>;
  setEditValue2: Dispatch<SetStateAction<string>>;
  setContainerItemsOnly: Dispatch<SetStateAction<boolean>>;
  setMetadataRows: Dispatch<SetStateAction<MetadataRow[]>>;
  setContainerOffset: Dispatch<SetStateAction<number>>;
  fetchContainerDefs: () => void | Promise<void>;
  handleLinkContainerToConversation: (def: ContainerDefinition) => void | Promise<void>;
  handleContainerRowClick: (def: ContainerDefinition) => void;
  getItemName: (id: string | null | undefined) => string;
  handleSaveInlineEdit: () => void | Promise<void>;
  handleUpdateContainerField: (definitionId: string, patch: { instanced_per_item?: boolean }) => void | Promise<void>;
};

export function ItemsPageContainerSection({
  t,
  gameId,
  convPanelOpen,
  containerTotal,
  containerSearch,
  containerSearchDebounced,
  filteredContainerDefs,
  containerLoading,
  containerError,
  linkingContainerId,
  expandedContainerId,
  containerDetailCache,
  containerDetailLoading,
  editingField,
  editValue,
  editValue2,
  containerItemsOnly,
  containerAllItems,
  metadataRows,
  containerTotalPages,
  containerCurrentPage,
  containerOffset,
  containerLimit,
  setContainerSearch,
  setShowCreateContainer,
  setDeletingContainer,
  setEditingField,
  setEditValue,
  setEditValue2,
  setContainerItemsOnly,
  setMetadataRows,
  setContainerOffset,
  fetchContainerDefs,
  handleLinkContainerToConversation,
  handleContainerRowClick,
  getItemName,
  handleSaveInlineEdit,
  handleUpdateContainerField,
}: ItemsPageContainerSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t("items.containerDefinitions")}</h2>
          <p className="text-sm text-muted-foreground">
            {containerTotal > 0
              ? `${containerSearchDebounced ? `${filteredContainerDefs.length} ${t("items.of")} ` : ""}${containerTotal} ${containerTotal !== 1 ? t("items.definitions") : t("items.definition")}`
              : t("items.noContainerDefs")}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("items.searchByNameIdOrCodeName")}
              value={containerSearch}
              onChange={(e) => setContainerSearch(e.target.value)}
              className="pl-8 h-8 w-[400px] text-sm"
            />
            {containerSearch && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setContainerSearch("")}
                title={t("items.clearSearch")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={fetchContainerDefs} title={t("common.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateContainer(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("items.newContainer")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {containerLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : containerError ? (
            <div className="p-6 text-center text-destructive">{containerError}</div>
          ) : filteredContainerDefs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {containerSearchDebounced ? t("items.noMatchingContainers") : t("items.noContainerDefs")}
              </p>
              <p className="text-sm mt-1">
                {containerSearchDebounced
                  ? t("items.noContainersMatchSearch").replace("{query}", containerSearchDebounced)
                  : t("items.clickNewContainerToCreate")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {convPanelOpen && <TableHead id="containers-table-header-link-conv" className="text-center w-10" />}
                  <TableHead>{t("items.name")}</TableHead>
                  <TableHead>{t("items.codeName")}</TableHead>
                  <TableHead>{t("items.type")}</TableHead>
                  <TableHead>{t("items.grid")}</TableHead>
                  <TableHead>{t("items.portable")}</TableHead>
                  <TableHead>{t("items.linkedItemDefinition")}</TableHead>
                  <TableHead className="text-right">{t("items.actionsHeader")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContainerDefs.map((def) => {
                  const isExpanded = expandedContainerId === def.id;
                  const detail = containerDetailCache[def.id];
                  const isLoadingDetail = containerDetailLoading === def.id;
                  const containerItemsOnlyId = `container-items-only-${def.id}`;

                  return (
                    <Fragment key={def.id}>
                      <TableRow
                        className={`hover:bg-muted/40 cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`}
                        onClick={() => handleContainerRowClick(def)}
                      >
                        {convPanelOpen && (
                          <TableCell id={`containers-row-${def.id}-link-conv-cell`} className="text-center" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    id={`containers-row-${def.id}-link-conv-btn`}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-emerald-500"
                                    disabled={linkingContainerId === def.id}
                                    onClick={() => handleLinkContainerToConversation(def)}
                                  >
                                    {linkingContainerId === def.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <span id={`containers-row-${def.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                        <Bot className="h-3.5 w-3.5" />
                                        <Plus className="h-2.5 w-2.5 stroke-[3]" />
                                      </span>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent id={`containers-row-${def.id}-link-conv-tooltip`} side="top">
                                  {t("items.linkToConv")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span>{def.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {def.code_name ? (
                            <div className="text-xs font-mono text-muted-foreground flex items-center gap-0.5" title={def.code_name}>
                              <span className="truncate max-w-[180px]">{def.code_name}</span>
                              <CopyButton text={def.code_name} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">?</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ContainerTypeBadge type={def.container_type} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {def.grid_cols} x {def.grid_rows}
                          <span className="text-xs ml-1">
                            ({def.grid_cols * def.grid_rows} {t("items.slots")})
                          </span>
                        </TableCell>
                        <TableCell>
                          {def.is_portable ? (
                            <span className="text-green-500 text-sm font-medium">{t("common.yes")}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">{t("common.no")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          {def.linked_item_definition_id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-primary font-medium truncate" title={def.linked_item_definition_id}>
                                {getItemName(def.linked_item_definition_id)}
                              </span>
                              <Link href={`/games/${gameId}/items/${def.linked_item_definition_id}`} title={t("items.goToItemDef")}>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary shrink-0 transition-colors" />
                              </Link>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">?</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {def.container_type !== "inventory" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t("common.delete")}
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingContainer(def);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={convPanelOpen ? 8 : 7} className="p-0">
                            <div className="px-10 py-4 space-y-4 border-l-2 border-primary/20 bg-primary/5 group/expand">
                              {isLoadingDetail ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t("items.loadingDetailDots")}
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.containerIdLabel")}</p>
                                      <div className="flex items-center gap-2 group/id">
                                        <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono break-all">{def.id}</code>
                                        <CopyButton text={def.id} />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.name")}</p>
                                      <div className="flex items-center gap-1.5">
                                        {editingField?.id === def.id && editingField.field === "name" ? (
                                          <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs flex-1" autoFocus />
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 group/edit">
                                            <span className="text-sm font-medium">{def.name}</span>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                                              onClick={() => {
                                                setEditingField({ id: def.id, field: "name" });
                                                setEditValue(def.name);
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.codeName")}</p>
                                      <div className="flex items-center gap-1.5">
                                        {editingField?.id === def.id && editingField.field === "code_name" ? (
                                          <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs flex-1 font-mono" autoFocus />
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 group/edit min-w-0">
                                            <span className={`text-sm font-mono truncate ${def.code_name ? "text-foreground" : "text-muted-foreground italic"}`}>
                                              {def.code_name ?? "?"}
                                            </span>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                              onClick={() => {
                                                setEditingField({ id: def.id, field: "code_name" });
                                                setEditValue(def.code_name ?? "");
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <Separator />

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.containerType")}</p>
                                      <p className="text-sm font-medium capitalize">{def.container_type}</p>
                                    </div>

                                    <div className="space-y-0.5">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.dimensionsHeader")}</p>
                                      <div className="flex items-center gap-1.5 min-h-[20px]">
                                        {editingField?.id === def.id && editingField.field === "grid" ? (
                                          <div className="flex items-center gap-1">
                                            <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 w-12 text-xs text-center px-1" />
                                            <span className="text-xs text-muted-foreground">-</span>
                                            <Input type="number" value={editValue2} onChange={(e) => setEditValue2(e.target.value)} className="h-7 w-12 text-xs text-center px-1" />
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 group/edit">
                                            <p className="text-sm font-medium">
                                              {def.grid_cols} x {def.grid_rows} ({def.grid_cols * def.grid_rows} {t("items.totalSlots")})
                                            </p>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                                              onClick={() => {
                                                setEditingField({ id: def.id, field: "grid" });
                                                setEditValue(String(def.grid_cols));
                                                setEditValue2(String(def.grid_rows));
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-0.5">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.portable")}</p>
                                      <p className="text-sm font-medium">{def.is_portable ? t("common.yes") : t("common.no")}</p>
                                    </div>

                                    {detail && (
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.updatedAtLabel")}</p>
                                        <p className="text-[11px] text-muted-foreground">{new Date(detail.updated_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>

                                  <Separator />

                                  <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.linkedItemDefinition")}</p>
                                      <div className="flex items-center gap-1.5">
                                        {editingField?.id === def.id && editingField.field === "linked_item_id" ? (
                                          <div className="flex flex-col gap-1.5 flex-1">
                                            <div className="flex items-center gap-1.5">
                                              <input
                                                type="checkbox"
                                                id={containerItemsOnlyId}
                                                checked={containerItemsOnly}
                                                onChange={(e) => setContainerItemsOnly(e.target.checked)}
                                                className="h-3.5 w-3.5 cursor-pointer"
                                              />
                                              <label htmlFor={containerItemsOnlyId} className="text-[10px] text-muted-foreground cursor-pointer select-none">
                                                {t("items.showContainerItemsOnly") ?? "Show container items only"}
                                              </label>
                                            </div>
                                            <div className="flex items-center gap-1 flex-1">
                                              <div className="relative flex-1">
                                                <Select value={editValue || "none"} onValueChange={(v) => setEditValue(v === "none" ? "" : v)}>
                                                  <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={t("items.selectItem")} />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="none">{t("items.noLinkedItemOption")}</SelectItem>
                                                    {(containerItemsOnly
                                                      ? containerAllItems.filter((i) => i.category === "container" || i.category === "character" || i.category === "other")
                                                      : containerAllItems).map((item) => (
                                                      <SelectItem key={item.id} value={item.id}>
                                                        {item.name} {item.item_code ? `(${item.item_code})` : ""}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSaveInlineEdit}>
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 group/edit">
                                            {def.linked_item_definition_id ? (
                                              <div className="flex items-center gap-2">
                                                <Link
                                                  href={`/games/${gameId}/items/${def.linked_item_definition_id}`}
                                                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                                                  title={t("items.goToItemDef")}
                                                >
                                                  {getItemName(def.linked_item_definition_id)}
                                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                                </Link>
                                              </div>
                                            ) : (
                                              <span className="text-sm text-muted-foreground italic">{t("items.noLinkedItem")}</span>
                                            )}
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                                              onClick={() => {
                                                setEditingField({ id: def.id, field: "linked_item_id" });
                                                setEditValue(def.linked_item_definition_id || "");
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {def.linked_item_definition_id ? (
                                      <div className="flex items-center gap-3">
                                        <Switch checked={def.instanced_per_item ?? false} onCheckedChange={(checked) => handleUpdateContainerField(def.id, { instanced_per_item: checked })} />
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.instancedPerItem")}</p>
                                          <p className="text-xs text-muted-foreground">{t("items.instancedPerItemDesc")}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div />
                                    )}
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between group/meta-header">
                                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("items.fullMetadata")}</p>
                                      {editingField?.id === def.id && editingField.field === "metadata" && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px]"
                                            onClick={() => {
                                              setEditingField(null);
                                              const current = containerDetailCache[def.id] || def;
                                              const rows = Object.entries(current.metadata || {}).map(([k, v]) => ({
                                                k,
                                                v: typeof v === "object" ? JSON.stringify(v) : String(v),
                                              }));
                                              setMetadataRows(rows.length > 0 ? rows : [{ k: "", v: "" }]);
                                            }}
                                          >
                                            {t("common.cancel")}
                                          </Button>
                                          <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveInlineEdit}>
                                            {t("common.save")}
                                          </Button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-1.5 py-1">
                                      {metadataRows.map((row, i) => (
                                        <div key={i} className="flex gap-1.5 items-center group/meta-row">
                                          <Input
                                            placeholder="Key"
                                            value={row.k}
                                            onChange={(e) => {
                                              const next = [...metadataRows];
                                              next[i] = { ...next[i], k: e.target.value };
                                              setMetadataRows(next);
                                              setEditingField({ id: def.id, field: "metadata" });
                                            }}
                                            className="w-[140px] h-7 text-[11px] font-mono bg-background/30"
                                          />
                                          <span className="text-muted-foreground text-[10px]">:</span>
                                          <Input
                                            placeholder="Value"
                                            value={row.v}
                                            onChange={(e) => {
                                              const next = [...metadataRows];
                                              next[i] = { ...next[i], v: e.target.value };
                                              setMetadataRows(next);
                                              setEditingField({ id: def.id, field: "metadata" });
                                            }}
                                            className="flex-1 h-7 text-[11px] font-mono bg-background/30"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 text-destructive opacity-0 group-hover/meta-row:opacity-100 transition-opacity"
                                            onClick={() => {
                                              setMetadataRows(metadataRows.filter((_, idx) => idx !== i));
                                              setEditingField({ id: def.id, field: "metadata" });
                                            }}
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => {
                                          setMetadataRows([...metadataRows, { k: "", v: "" }]);
                                          setEditingField({ id: def.id, field: "metadata" });
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {t("common.add")}
                                      </Button>
                                    </div>
                                  </div>

                                  {detail && (
                                    <div className="text-[11px] text-muted-foreground pt-1">
                                      <span>
                                        {t("items.createdAtLabel")}: {new Date(detail.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {containerTotalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            {t("crafting.pageLabel")} {containerCurrentPage} {t("crafting.pageOf")} {containerTotalPages} - {containerTotal} {t("items.definitions")}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={containerOffset === 0} onClick={() => setContainerOffset(Math.max(0, containerOffset - containerLimit))}>
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={containerOffset + containerLimit >= containerTotal}
              onClick={() => setContainerOffset(containerOffset + containerLimit)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
