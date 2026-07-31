"use client";

import { type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  Pencil,
  X,
  Loader2,
  Tag,
  Bot,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "@/components/CopyButton";
import { RARITY_COLORS } from "@/types/inventory";
import type { ItemDefinition, ItemCategory, ItemRarity } from "@/types/inventory";
import type { ItemTag } from "@/lib/inventory-api";

// ---------------------------------------------------------------------------
// Helpers (local copies so the section is self-contained)
// ---------------------------------------------------------------------------
function RarityBadge({ rarity }: { rarity: ItemRarity }) {
  const c = RARITY_COLORS[rarity];
  if (!c) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-gray-400 border-gray-400 bg-gray-400/10 capitalize w-fit">
        {rarity}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${c.text} ${c.border} ${c.bg} capitalize w-fit`}
    >
      {rarity}
    </span>
  );
}

function prettyCategory(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type ItemsCatalogueSectionProps = {
  gameId: string;
  items: ItemDefinition[];
  total: number;
  loading: boolean;
  error: string | null;
  offset: number;
  limit: number;
  totalPages: number;
  currentPage: number;
  categories: ItemCategory[];
  rarities: ItemRarity[];
  itemTags: ItemTag[];
  searchName: string;
  filterCategory: string;
  filterRarity: string;
  filterAllowClientUpdateQty: string;
  selectedTagKeys: string[];
  tagFilterOpen: boolean;
  debouncedName: string;
  convPanelOpen: boolean;
  linkingItemId: string | null;
  updatingItemId: string | null;
  fetchItems: () => void;
  handleUpdateItemField: (itemId: string, patch: Partial<ItemDefinition>) => void;
  handleLinkItemToConversation: (item: ItemDefinition) => void;
  setSearchName: Dispatch<SetStateAction<string>>;
  setFilterCategory: Dispatch<SetStateAction<string>>;
  setFilterRarity: Dispatch<SetStateAction<string>>;
  setFilterAllowClientUpdateQty: Dispatch<SetStateAction<string>>;
  setSelectedTagKeys: Dispatch<SetStateAction<string[]>>;
  setTagFilterOpen: Dispatch<SetStateAction<boolean>>;
  setOffset: Dispatch<SetStateAction<number>>;
  setShowCreate: Dispatch<SetStateAction<boolean>>;
  setExplanationTopic: Dispatch<SetStateAction<"write_props" | "update_qty" | null>>;
  setShowExplanationPanel: Dispatch<SetStateAction<boolean>>;
  t: (key: string) => string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ItemsPageCatalogueSection({
  gameId,
  items,
  total,
  loading,
  error,
  offset,
  limit,
  totalPages,
  currentPage,
  categories,
  rarities,
  itemTags,
  searchName,
  filterCategory,
  filterRarity,
  filterAllowClientUpdateQty,
  selectedTagKeys,
  tagFilterOpen,
  debouncedName,
  convPanelOpen,
  linkingItemId,
  updatingItemId,
  fetchItems,
  handleUpdateItemField,
  handleLinkItemToConversation,
  setSearchName,
  setFilterCategory,
  setFilterRarity,
  setFilterAllowClientUpdateQty,
  setSelectedTagKeys,
  setTagFilterOpen,
  setOffset,
  setShowCreate,
  setExplanationTopic,
  setShowExplanationPanel,
  t,
}: ItemsCatalogueSectionProps) {
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t("items.itemDefinitions")}</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} ${t("items.itemsDefined")}` : t("items.noItemsYet")}
          </p>
        </div>
        <div id="items-catalogue-toolbar-controls" className="flex flex-col items-end gap-2">
          <div id="items-catalogue-toolbar-primary-row" className="flex items-center gap-2 flex-wrap justify-end">
            {/* Clear all */}
            {(searchName || filterCategory !== "all" || filterRarity !== "all" || filterAllowClientUpdateQty !== "all" || selectedTagKeys.length > 0) && (
              <button
                id="items-catalogue-clear-filters-btn"
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  setSearchName("");
                  setFilterCategory("all");
                  setFilterRarity("all");
                  setFilterAllowClientUpdateQty("all");
                  setSelectedTagKeys([]);
                }}
              >
                Clear
              </button>
            )}
            {/* Catalogue search */}
            <div id="items-catalogue-search-controls" className="relative">
              <div id="items-catalogue-search-input-wrap" className="relative">
                <Search
                  id="items-catalogue-search-input-icon"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                />
                <input
                  id="items-catalogue-search-input"
                  type="text"
                  placeholder={t("items.searchByNameIdOrCode")}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="h-8 w-[400px] rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                {searchName && (
                  <button
                    id="items-catalogue-search-clear-btn"
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchName("")}
                  >
                    <X id="items-catalogue-search-clear-icon" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <Button
              id="items-catalogue-refresh-btn"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchItems}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw id="items-catalogue-refresh-icon" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              id="items-catalogue-new-item-btn"
              size="sm"
              className="h-8"
              onClick={() => setShowCreate(true)}
            >
              <Plus id="items-catalogue-new-item-icon" className="h-4 w-4 mr-1" />
              {t("items.newItem")}
            </Button>
          </div>

          <div id="items-catalogue-toolbar-filter-row" className="flex items-center gap-2 flex-wrap justify-end">
            {/* Category */}
            <select
              id="items-catalogue-category-filter"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">{t("items.allCategories")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {prettyCategory(c)}
                </option>
              ))}
            </select>

            {/* Rarity */}
            <select
              id="items-catalogue-rarity-filter"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
            >
              <option value="all">{t("items.allRarities")}</option>
              {rarities.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r}
                </option>
              ))}
            </select>

            {/* Allow Client Update Qty */}
            <select
              id="items-catalogue-qty-filter"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={filterAllowClientUpdateQty}
              onChange={(e) => setFilterAllowClientUpdateQty(e.target.value)}
            >
              <option value="all">{t("items.allQtyPermissions")}</option>
              <option value="true">{t("items.canUpdateQty")}</option>
              <option value="false">{t("items.cannotUpdateQty")}</option>
            </select>

            {/* Tags filter */}
            {itemTags.length > 0 && (
              <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {t("items.tabTags")}
                    {selectedTagKeys.length > 0 && (
                      <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold">
                        {selectedTagKeys.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("items.searchTagsIn")} />
                    <CommandList>
                      <CommandEmpty>{t("items.noTagsFound")}</CommandEmpty>
                      <CommandGroup>
                        {itemTags.map((tag) => {
                          const active = selectedTagKeys.includes(tag.tag_key);
                          return (
                            <CommandItem
                              key={tag.tag_key}
                              value={tag.label || tag.tag_key}
                              onSelect={() => {
                                setSelectedTagKeys((prev) =>
                                  active ? prev.filter((k) => k !== tag.tag_key) : [...prev, tag.tag_key],
                                );
                              }}
                            >
                              <span
                                className="mr-2 h-3 w-3 shrink-0 rounded-full border"
                                style={{ background: tag.color ?? "#A855F7", borderColor: tag.color ?? "#A855F7" }}
                              />
                              <span className="flex-1 truncate">{tag.label || tag.tag_key}</span>
                              {active && <Check className="h-3.5 w-3.5 ml-1 shrink-0" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{t("items.noItemsFound")}</p>
              <p className="text-sm mt-1">
                {filterCategory !== "all" || filterRarity !== "all" || debouncedName || selectedTagKeys.length > 0
                  ? t("items.noItemsDesc")
                  : t("items.noItemsNewDesc")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {convPanelOpen && <TableHead id="items-table-header-link-conv" className="text-center w-10" />}
                  <TableHead>{t("items.name")}</TableHead>
                  <TableHead>{t("items.itemCode")}</TableHead>
                  <TableHead className="text-center">{t("items.category")}</TableHead>
                  <TableHead className="text-center">{t("items.rarity")}</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t("items.writePropsHeader")}</span>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExplanationTopic("write_props");
                          setShowExplanationPanel(true);
                        }}
                        title="Learn more about Write Props"
                      >
                        <span className="text-[10px] font-bold">?</span>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t("items.updateQtyHeader")}</span>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExplanationTopic("update_qty");
                          setShowExplanationPanel(true);
                        }}
                        title="Learn more about Update Qty"
                      >
                        <span className="text-[10px] font-bold">?</span>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{t("items.stackable")}</TableHead>
                  {!convPanelOpen && <TableHead className="text-center">{t("items.actionsHeader")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/40">
                    {convPanelOpen && (
                      <TableCell id={`items-row-${item.id}-link-conv-cell`} className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                id={`items-row-${item.id}-link-conv-btn`}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                                disabled={linkingItemId === item.id}
                                onClick={() => handleLinkItemToConversation(item)}
                              >
                                {linkingItemId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <span
                                    id={`items-row-${item.id}-link-conv-icon`}
                                    className="inline-flex items-center gap-[1px]"
                                  >
                                    <Bot className="h-3.5 w-3.5" />
                                    <Plus className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent id={`items-row-${item.id}-link-conv-tooltip`} side="top">
                              {t("items.linkToConv")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/games/${gameId}/items/${item.id}`}
                          className="hover:text-primary hover:underline font-medium"
                        >
                          {item.name}
                        </Link>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono text-muted-foreground">{item.id}</span>
                          <CopyButton text={item.id} size="h-3 w-3" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.item_code ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
                          <CopyButton text={item.item_code} size="h-3 w-3" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs w-fit mx-auto">
                        {prettyCategory(item.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <RarityBadge rarity={item.rarity} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="flex items-center justify-center cursor-pointer hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateItemField(item.id, { client_writable: !item.client_writable });
                        }}
                      >
                        <span
                          className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${updatingItemId === item.id ? "opacity-50" : ""} ${item.client_writable ? "bg-green-100 border-green-300" : "bg-muted border-muted-foreground"}`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full transition-all ${item.client_writable ? "ml-auto bg-green-500" : "bg-muted-foreground"}`}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="flex items-center justify-center cursor-pointer hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateItemField(item.id, { allow_client_update_qty: !item.allow_client_update_qty });
                        }}
                      >
                        <span
                          className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${updatingItemId === item.id ? "opacity-50" : ""} ${item.allow_client_update_qty ? "bg-blue-100 border-blue-300" : "bg-muted border-muted-foreground"}`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full transition-all ${item.allow_client_update_qty ? "ml-auto bg-blue-500" : "bg-muted-foreground"}`}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.is_stackable ? (
                        <span className="text-green-500 text-sm font-medium">
                          {t("common.yes")} {item.max_stack_size != null ? item.max_stack_size.toLocaleString() : "∞"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("common.no")}</span>
                      )}
                    </TableCell>
                    {!convPanelOpen && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/games/${gameId}/items/${item.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-4 text-sm text-muted-foreground flex-wrap">
          <span>
            Page {currentPage} of {totalPages} - {total} items
          </span>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
