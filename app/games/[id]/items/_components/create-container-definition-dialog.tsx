"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useEscapeLayer } from "@/hooks/use-escape-manager";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { createContainerDefinition, type ContainerTypeOption } from "@/lib/inventory-api";
import { toSafeCodeName } from "@/lib/utils";
import type { ContainerType, CreateContainerDefinitionRequest, ItemDefinition } from "@/types/inventory";
import { KVEditor, type KVEntry } from "./KVEditor";

const CONTAINER_TYPE_META: Record<string, { label: string; className: string }> = {
  inventory: { label: "Inventory", className: "bg-gray-500/15 text-gray-400 border-gray-400/40" },
  chest: { label: "Chest", className: "bg-amber-500/15 text-amber-500 border-amber-500/40" },
  bag: { label: "Bag", className: "bg-green-500/15 text-green-500 border-green-500/40" },
  vault: { label: "Vault", className: "bg-purple-500/15 text-purple-500 border-purple-500/40" },
  shulker_box: { label: "Shulker Box", className: "bg-pink-500/15 text-pink-500 border-pink-500/40" },
  equipment: { label: "Equipment", className: "bg-blue-500/15 text-blue-400 border-blue-400/40" },
};

type CreateContainerInitialValues = {
  name?: string;
  code_name?: string;
  container_type?: string;
  grid_cols?: number;
  grid_rows?: number;
  is_portable?: boolean;
  linked_item_definition_id?: string;
  linked_item_definition_name?: string;
  linked_item_definition_code?: string;
  metadata?: Record<string, unknown>;
};

type CreateContainerDefinitionDialogProps = {
  open: boolean;
  gameId: string;
  allItems: ItemDefinition[];
  containerTypeOptions: ContainerTypeOption[];
  initialValues?: CreateContainerInitialValues;
  onCreated: (id: string) => void;
  onClose: () => void;
};

export function CreateContainerDefinitionDialog({
  open,
  gameId,
  allItems,
  containerTypeOptions,
  initialValues,
  onCreated,
  onClose,
}: CreateContainerDefinitionDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  useEscapeLayer(open, onClose);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [codeName, setCodeName] = useState("");
  const [containerType, setContainerType] = useState<ContainerType>("chest");
  const [gridCols, setGridCols] = useState("9");
  const [gridRows, setGridRows] = useState("3");
  const [isPortable, setIsPortable] = useState(false);
  const [linkedItemId, setLinkedItemId] = useState("");
  const [linkedItemNameFallback, setLinkedItemNameFallback] = useState("");
  const [linkedItemCodeFallback, setLinkedItemCodeFallback] = useState("");
  const [linkedItemOpen, setLinkedItemOpen] = useState(false);
  const [linkedItemSearch, setLinkedItemSearch] = useState("");
  const [meta, setMeta] = useState<KVEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && initialValues) {
      setLinkedItemNameFallback("");
      setLinkedItemCodeFallback("");
      if (initialValues.name) setName(initialValues.name);
      if (initialValues.code_name) setCodeName(initialValues.code_name);
      else if (initialValues.name) setCodeName(toSafeCodeName(initialValues.name));
      if (initialValues.container_type) setContainerType(initialValues.container_type as ContainerType);
      if (initialValues.grid_cols) setGridCols(String(initialValues.grid_cols));
      if (initialValues.grid_rows) setGridRows(String(initialValues.grid_rows));
      if (initialValues.is_portable !== undefined) setIsPortable(initialValues.is_portable);
      if (initialValues.linked_item_definition_id) {
        const raw = initialValues.linked_item_definition_id;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
        if (isUuid) {
          setLinkedItemId(raw);
        } else {
          const match = allItems.find((item) => item.item_code.toLowerCase() === raw.toLowerCase());
          if (match) setLinkedItemId(match.id);
        }
      }
      if (initialValues.linked_item_definition_name) setLinkedItemNameFallback(initialValues.linked_item_definition_name);
      if (initialValues.linked_item_definition_code) setLinkedItemCodeFallback(initialValues.linked_item_definition_code);
      setMeta(Object.entries(initialValues.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
    }
  }, [open, initialValues, allItems]);

  function resetForm() {
    setName("");
    setCodeName("");
    setContainerType("chest");
    setGridCols("9");
    setGridRows("3");
    setIsPortable(false);
    setLinkedItemId("");
    setLinkedItemNameFallback("");
    setLinkedItemCodeFallback("");
    setMeta([]);
    setErrors({});
  }

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

  const selectedLinkedItem = allItems.find((item) => item.id === linkedItemId);
  const linkedItemDisplayName = selectedLinkedItem?.name ?? linkedItemNameFallback;
  const linkedItemDisplayCode = selectedLinkedItem?.item_code ?? linkedItemCodeFallback;

  async function handleSubmit() {
    if (!validate()) return;

    setLoading(true);
    try {
      const metadata: Record<string, unknown> = {};
      meta.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value;
      });

      const body: CreateContainerDefinitionRequest = {
        name: name.trim(),
        code_name: codeName.trim(),
        container_type: containerType,
        grid_cols: Number(gridCols),
        grid_rows: Number(gridRows),
        is_portable: isPortable,
        ...(linkedItemId ? { linked_item_definition_id: linkedItemId } : {}),
        metadata,
      };

      const res = await createContainerDefinition({ gameId }, body);
      toast({ title: t("items.containerCreated"), description: `"${name.trim()}" added.` });
      resetForm();
      onCreated(res.container_definition.id);
      onClose();
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t("items.permissionDenied"), description: t("items.noPermissionCreateContainer") });
      } else {
        toast({ variant: "destructive", title: t("items.failedToCreate"), description: err?.message ?? "Unknown error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          resetForm();
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col" onInteractOutside={(e) => e.preventDefault()} onFocusOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t("items.newContainerDefinition")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="cd-name">
              {t("items.name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cd-name"
              placeholder="e.g. Standard Chest"
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
            <Label htmlFor="cd-code-name">
              {t("items.codeName")} <span className="text-destructive">*</span>
            </Label>
            <Input id="cd-code-name" placeholder={t("items.codeNamePlaceholder")} value={codeName} onChange={(e) => setCodeName(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("items.codeNameHint")}</p>
            {errors.codeName && <p className="text-xs text-destructive">{errors.codeName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                {t("items.containerType")} <span className="text-destructive">*</span>
              </Label>
              <Select value={containerType} onValueChange={(value) => setContainerType(value as ContainerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {containerTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {CONTAINER_TYPE_META[opt.value]?.label ?? opt.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="cd-portable" checked={isPortable} onCheckedChange={setIsPortable} />
              <Label htmlFor="cd-portable">{t("items.portable")}</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cd-cols">
                {t("items.gridColumns")} <span className="text-destructive">*</span>
              </Label>
              <Input id="cd-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)} />
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cd-rows">
                {t("items.gridRows")} <span className="text-destructive">*</span>
              </Label>
              <Input id="cd-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)} />
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
                        {linkedItemDisplayName ?? `${linkedItemId.slice(0, 8)}?`}
                        {linkedItemDisplayCode && <span className="ml-1 text-xs text-muted-foreground font-mono">({linkedItemDisplayCode})</span>}
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
          <KVEditor entries={meta} onChange={setMeta} label={t("items.metadataWithExample")} />
        </div>
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={() => { resetForm(); onClose(); }}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("items.creating") : t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

