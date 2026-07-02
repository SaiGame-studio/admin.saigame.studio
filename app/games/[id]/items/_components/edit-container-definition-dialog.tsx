"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useEscapeLayer } from "@/hooks/use-escape-manager";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { updateContainerDefinition } from "@/lib/inventory-api";
import { toSafeCodeName } from "@/lib/utils";
import type { ContainerDefinition, ItemDefinition, UpdateContainerDefinitionRequest } from "@/types/inventory";
import type { ContainerDraftValues } from "../_hooks/items-page-state-types";
import { KVEditor, type KVEntry } from "./KVEditor";

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

  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${meta.className}`}>{meta.label}</span>;
}

type EditContainerDefinitionDialogProps = {
  open: boolean;
  gameId: string;
  definition: ContainerDefinition;
  initialValues?: ContainerDraftValues;
  allItems: ItemDefinition[];
  onUpdated: (updated: ContainerDefinition) => void;
  onClose: () => void;
};

export function EditContainerDefinitionDialog({
  open,
  gameId,
  definition,
  initialValues,
  allItems,
  onUpdated,
  onClose,
}: EditContainerDefinitionDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  useEscapeLayer(open, onClose);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialValues?.name ?? definition.name);
  const [codeName, setCodeName] = useState(initialValues?.code_name ?? definition.code_name ?? "");
  const [gridCols, setGridCols] = useState(String(initialValues?.grid_cols ?? definition.grid_cols));
  const [gridRows, setGridRows] = useState(String(initialValues?.grid_rows ?? definition.grid_rows));
  const [linkedItemId, setLinkedItemId] = useState(initialValues?.linked_item_definition_id ?? definition.linked_item_definition_id ?? "");
  const [linkedItemOpen, setLinkedItemOpen] = useState(false);
  const [linkedItemSearch, setLinkedItemSearch] = useState("");
  const [instancedPerItem, setInstancedPerItem] = useState(initialValues?.instanced_per_item ?? initialValues?.is_portable ?? definition.instanced_per_item ?? false);
  const [meta, setMeta] = useState<KVEntry[]>(Object.entries(initialValues?.metadata ?? definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(initialValues?.name ?? definition.name);
    setCodeName(initialValues?.code_name ?? definition.code_name ?? "");
    setGridCols(String(initialValues?.grid_cols ?? definition.grid_cols));
    setGridRows(String(initialValues?.grid_rows ?? definition.grid_rows));
    setLinkedItemId(initialValues?.linked_item_definition_id ?? definition.linked_item_definition_id ?? "");
    setLinkedItemSearch("");
    setInstancedPerItem(initialValues?.instanced_per_item ?? initialValues?.is_portable ?? definition.instanced_per_item ?? false);
    setMeta(Object.entries(initialValues?.metadata ?? definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
    setErrors({});
  }, [definition, initialValues]);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) nextErrors.name = t("items.nameMustBe2Chars");
    if (!codeName.trim()) nextErrors.codeName = t("items.codeNameRequired");
    else if (!/^[a-z][a-z0-9_]{0,63}$/.test(codeName.trim())) nextErrors.codeName = t("items.codeNameInvalid");

    const cols = Number(gridCols);
    const rows = Number(gridRows);
    if (!cols || cols < 1 || cols > 54) nextErrors.gridCols = t("items.colsMustBe");
    if (!rows || rows < 1 || rows > 54) nextErrors.gridRows = t("items.rowsMustBe");

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setLoading(true);
    try {
      const metadata: Record<string, unknown> = {};
      meta.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value;
      });

      const origLinked = definition.linked_item_definition_id ?? "";
      const body: UpdateContainerDefinitionRequest = {
        name: name.trim(),
        code_name: codeName.trim(),
        grid_cols: Number(gridCols),
        grid_rows: Number(gridRows),
        instanced_per_item: instancedPerItem,
        metadata,
      };

      if (linkedItemId !== origLinked) {
        body.linked_item_definition_id = linkedItemId;
      }

      const { container_definition: updated } = await updateContainerDefinition({ gameId }, definition.id, body);
      toast({ title: t("items.containerUpdated") });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      if (err?.status === 409) {
        toast({ variant: "destructive", title: t("items.cannotShrinkGrid"), description: t("items.itemsOutOfBounds") });
      } else {
        toast({ variant: "destructive", title: t("items.failedToUpdate"), description: err?.message ?? "Unknown error" });
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedLinkedItem = allItems.find((item) => item.id === linkedItemId);

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("items.editContainerDefinition")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <ContainerTypeBadge type={definition.container_type} />
            <span>{definition.is_portable ? t("items.portable") : t("items.fixed")}</span>
            <span className="text-xs">{t("items.immutable")}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ed-name">
              {t("items.name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ed-name"
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!codeName.trim()) setCodeName(toSafeCodeName(next));
              }}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ed-code-name">
              {t("items.codeName")} <span className="text-destructive">*</span>
            </Label>
            <Input id="ed-code-name" value={codeName} readOnly />
            <p className="text-xs text-muted-foreground">{t("items.codeNameHint")}</p>
            {errors.codeName && <p className="text-xs text-destructive">{errors.codeName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ed-cols">{t("items.gridColumns")}</Label>
              <Input id="ed-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)} />
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-rows">{t("items.gridRows")}</Label>
              <Input id="ed-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)} />
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("items.linkedItemDefinition")}</Label>
            <div className="flex items-center gap-1">
              <Popover open={linkedItemOpen} onOpenChange={setLinkedItemOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={linkedItemOpen} className="w-full justify-between font-normal">
                    {linkedItemId ? (
                      <span className="truncate">
                        {selectedLinkedItem?.name ?? `${linkedItemId.slice(0, 8)}?`}
                        {selectedLinkedItem?.item_code && <span className="ml-1 text-xs text-muted-foreground font-mono">({selectedLinkedItem.item_code})</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("items.noLinkedItem")}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder={t("items.searchByNameOrCode")} value={linkedItemSearch} onValueChange={setLinkedItemSearch} />
                    <CommandList>
                      <CommandEmpty>{t("items.noItemFound")}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setLinkedItemId("");
                            setLinkedItemOpen(false);
                            setLinkedItemSearch("");
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 shrink-0 ${!linkedItemId ? "opacity-100" : "opacity-0"}`} />
                          <span className="text-muted-foreground">{t("items.noLinkedItemOption")}</span>
                        </CommandItem>
                        {allItems
                          .filter(
                            (item) =>
                              !linkedItemSearch ||
                              item.name.toLowerCase().includes(linkedItemSearch.toLowerCase()) ||
                              (item.item_code ?? "").toLowerCase().includes(linkedItemSearch.toLowerCase()),
                          )
                          .slice(0, 50)
                          .map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => {
                                setLinkedItemId(item.id);
                                setLinkedItemOpen(false);
                                setLinkedItemSearch("");
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${linkedItemId === item.id ? "opacity-100" : "opacity-0"}`} />
                              <span className="flex-1 truncate">{item.name}</span>
                              {item.item_code && <span className="ml-2 text-xs text-muted-foreground font-mono">{item.item_code}</span>}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {linkedItemId && (
                <Link href={`/games/${gameId}/items/${linkedItemId}`} target="_blank" title={t("items.goToItemDef")}>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" type="button">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("items.containerLinkDescPre")}
              <code className="bg-muted px-1 rounded">ensure-container</code>
              {t("items.containerLinkDescPost")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ed-instanced-per-item">{t("items.instancedPerItem")}</Label>
              <p className="text-xs text-muted-foreground">{t("items.instancedPerItemDesc")}</p>
            </div>
            <Switch id="ed-instanced-per-item" checked={instancedPerItem} onCheckedChange={setInstancedPerItem} />
          </div>
          <KVEditor entries={meta} onChange={setMeta} label={t("items.metadata")} />
        </div>
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("items.saving") : t("items.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

