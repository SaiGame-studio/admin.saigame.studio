"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { createGachaPack, deleteGachaPack, listGachaPacks, listItemDefinitions, setGachaPackEnabled, updateGachaPack } from "@/lib/inventory-api";
import type { GachaDropGroup, GachaPack, GachaPoolEntry, ItemDefinition, KeyRequirement } from "@/types/inventory";
import type { DropGroupFormRow, KeyReqRow, PoolRow } from "./items-page-state-types";

type ToastFn = (options: { title?: string; description?: string; variant?: "default" | "destructive" }) => void;

type GachaForm = {
  name: string;
  description: string;
  code_name: string;
  collect_destination: "mailbox" | "inventory";
  is_enabled: boolean;
  mailbox_title: string;
  mailbox_body: string;
  pool: PoolRow[];
  dropGroups?: DropGroupFormRow[];
  keyReqs: KeyReqRow[];
};

type ConversationContext = {
  turnId: string;
  responseIdx: number;
  gachaPackIdx: number;
} | undefined;

type UseGachaPageParams = {
  gameId: string;
  activeTab: string;
  searchParams: URLSearchParams;
  router: { replace: (href: string) => void };
  gachaLoading: boolean;
  gachaPacks: GachaPack[];
  gachaAllItems: ItemDefinition[];
  gachaSheetOpen: boolean;
  gachaForm: GachaForm;
  editingPack: GachaPack | null;
  deletingPack: GachaPack | null;
  gachaSearchDebounced: string;
  createGachaConvContext: ConversationContext;
  suppressGachaAutoOpenRef: MutableRefObject<boolean>;
  t: (key: string) => string;
  toast: ToastFn;
  loadGameInfo: () => Promise<void>;
  emptyGachaForm: () => GachaForm;
  resolveGachaRef: (rawId: string, items: ItemDefinition[]) => string;
  emptyRow: () => PoolRow;
  emptyKeyRow: () => KeyReqRow;
  setGachaLoading: (value: boolean) => void;
  setGachaError: (value: string | null) => void;
  setGachaPacks: Dispatch<SetStateAction<GachaPack[]>>;
  setGachaAllItems: (value: ItemDefinition[]) => void;
  setGachaSheetOpen: (value: boolean) => void;
  setEditingPack: (value: GachaPack | null) => void;
  setGachaForm: Dispatch<SetStateAction<GachaForm>>;
  setFormSaving: (value: boolean) => void;
  setDeletePackLoading: (value: boolean) => void;
  setDeletingPack: (value: GachaPack | null) => void;
  setTogglingId: (value: string | null) => void;
  setCreateGachaConvContext: (value: ConversationContext) => void;
};

export function useGachaPage({
  gameId,
  activeTab,
  searchParams,
  router,
  gachaLoading,
  gachaPacks,
  gachaAllItems,
  gachaSheetOpen,
  gachaForm,
  editingPack,
  deletingPack,
  gachaSearchDebounced,
  createGachaConvContext,
  suppressGachaAutoOpenRef,
  t,
  toast,
  loadGameInfo,
  emptyGachaForm,
  resolveGachaRef,
  emptyRow,
  emptyKeyRow,
  setGachaLoading,
  setGachaError,
  setGachaPacks,
  setGachaAllItems,
  setGachaSheetOpen,
  setEditingPack,
  setGachaForm,
  setFormSaving,
  setDeletePackLoading,
  setDeletingPack,
  setTogglingId,
  setCreateGachaConvContext,
}: UseGachaPageParams) {
  const fetchGachaData = useCallback(async () => {
    setGachaLoading(true);
    setGachaError(null);
    try {
      const ctx = { gameId };
      const [packsRes, itemsRes] = await Promise.all([listGachaPacks(ctx), listItemDefinitions(ctx, { limit: 200 })]);
      setGachaPacks(packsRes.packs ?? []);
      setGachaAllItems(itemsRes.items ?? []);
    } catch (err: any) {
      setGachaError(err?.message ?? "Failed to load gacha data");
    } finally {
      setGachaLoading(false);
    }
  }, [gameId, setGachaAllItems, setGachaError, setGachaLoading, setGachaPacks]);

  useEffect(() => {
    if (activeTab === "gacha") {
      fetchGachaData();
    }
  }, [activeTab, fetchGachaData]);

  useEffect(() => {
    if (!gachaSheetOpen || gachaAllItems.length === 0) return;
    setGachaForm((prev) => {
      const hasRefs = prev.pool.some((row) => row.item_definition_id.startsWith("__REF:"))
        || prev.keyReqs.some((row) => row.item_definition_id.startsWith("__REF:"))
        || (prev.dropGroups ?? []).some((group) => group.pool.some((row) => row.item_definition_id.startsWith("__REF:")));
      if (!hasRefs) return prev;
      return {
        ...prev,
        pool: prev.pool.map((row) => ({ ...row, item_definition_id: resolveGachaRef(row.item_definition_id, gachaAllItems) })),
        keyReqs: prev.keyReqs.map((row) => ({ ...row, item_definition_id: resolveGachaRef(row.item_definition_id, gachaAllItems) })),
        dropGroups: (prev.dropGroups ?? []).map((group) => ({
          ...group,
          pool: group.pool.map((row) => ({ ...row, item_definition_id: resolveGachaRef(row.item_definition_id, gachaAllItems) })),
        })),
      };
    });
  }, [gachaAllItems, gachaSheetOpen, resolveGachaRef, setGachaForm]);

  const gachaOpenEdit = useCallback((pack: GachaPack) => {
    setEditingPack(pack);
    const meta = (pack.metadata ?? {}) as Record<string, unknown>;
    setGachaForm({
      name: pack.name,
      description: pack.description ?? "",
      code_name: pack.code_name ?? "",
      collect_destination: pack.collect_destination ?? "mailbox",
      is_enabled: pack.is_enabled,
      mailbox_title: typeof meta.mailbox_title === "string" ? meta.mailbox_title : "",
      mailbox_body: typeof meta.mailbox_body === "string" ? meta.mailbox_body : "",
      pool: pack.item_pool.length > 0
        ? pack.item_pool.map((entry) => ({
            item_definition_id: entry.item_definition_id,
            weight: String(entry.weight),
            quantity_min: String(entry.quantity_min),
            quantity_max: String(entry.quantity_max),
          }))
        : [emptyRow()],
      dropGroups: (pack.drop_groups ?? []).map((group) => ({ key: group.key, pool: group.item_pool.map((entry) => ({ item_definition_id: entry.item_definition_id, weight: String(entry.weight), quantity_min: String(entry.quantity_min), quantity_max: String(entry.quantity_max) })) })),
      keyReqs: (pack.key_requirements ?? []).length > 0
        ? pack.key_requirements.map((row) => ({
            item_definition_id: row.item_definition_id,
            quantity: String(row.quantity),
          }))
        : [emptyKeyRow()],
    });
    setGachaSheetOpen(true);
    if (searchParams.get("editPack") !== pack.id) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("editPack", pack.id);
      router.replace(`${window.location.pathname}?${newParams.toString()}`);
    }
  }, [emptyKeyRow, emptyRow, router, searchParams, setEditingPack, setGachaForm, setGachaSheetOpen]);

  useEffect(() => {
    if (suppressGachaAutoOpenRef.current) {
      suppressGachaAutoOpenRef.current = false;
      return;
    }
    const packId = searchParams.get("editPack");
    if (!packId || gachaLoading || gachaPacks.length === 0) return;
    const pack = gachaPacks.find((entry) => entry.id === packId);
    if (pack) gachaOpenEdit(pack);
  }, [gachaLoading, gachaOpenEdit, gachaPacks, searchParams, suppressGachaAutoOpenRef]);

  const gachaCloseSheet = useCallback(() => {
    suppressGachaAutoOpenRef.current = true;
    setGachaSheetOpen(false);
    setCreateGachaConvContext(undefined);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("editPack");
    router.replace(`${window.location.pathname}?${newParams.toString()}`);
  }, [router, searchParams, setCreateGachaConvContext, setGachaSheetOpen, suppressGachaAutoOpenRef]);

  const gachaOpenCreate = useCallback(() => {
    setEditingPack(null);
    setGachaForm(emptyGachaForm());
    setGachaSheetOpen(true);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("editPack");
    router.replace(`${window.location.pathname}?${newParams.toString()}`);
  }, [emptyGachaForm, router, searchParams, setEditingPack, setGachaForm, setGachaSheetOpen]);

  const handleGachaSave = useCallback(async (closeAfterSave = true) => {
    const name = gachaForm.name.trim();
    const codeName = gachaForm.code_name.trim();
    if (!name) {
      toast({ variant: "destructive", title: t("items.nameRequired") });
      return;
    }
    if (codeName && !/^[a-z][a-z0-9_]{0,63}$/.test(codeName)) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: "Code name must match ^[a-z][a-z0-9_]{0,63}$" });
      return;
    }

    const poolSource = gachaForm.pool.filter((row) => row.item_definition_id.trim()).map((row) => ({
      ...row,
      item_definition_id: resolveGachaRef(row.item_definition_id.trim(), gachaAllItems),
    }));
    const keyReqSource = gachaForm.keyReqs.filter((row) => row.item_definition_id.trim()).map((row) => ({
      ...row,
      item_definition_id: resolveGachaRef(row.item_definition_id.trim(), gachaAllItems),
    }));

    if (poolSource.length < 1) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: "Gacha pack must have at least one reward item." });
      return;
    }

    const unresolvedRefs = [
      ...poolSource,
      ...keyReqSource,
      ...(gachaForm.dropGroups ?? []).flatMap((group) => group.pool.map((row) => ({
        ...row,
        item_definition_id: resolveGachaRef(row.item_definition_id.trim(), gachaAllItems),
      }))),
    ].filter((row) => row.item_definition_id.startsWith("__REF:"));
    if (unresolvedRefs.length > 0) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: "Some referenced item definitions are still unresolved. Please select them manually before saving." });
      return;
    }

    const item_pool: GachaPoolEntry[] = poolSource.map((row) => ({
      item_definition_id: row.item_definition_id,
      weight: Math.max(1, Number(row.weight) || 1),
      quantity_min: Math.max(1, Number(row.quantity_min) || 1),
      quantity_max: Math.max(Number(row.quantity_min) || 1, Number(row.quantity_max) || 1),
    }));
    const drop_groups: GachaDropGroup[] = (gachaForm.dropGroups ?? []).map((group) => ({ key: group.key.trim(), item_pool: group.pool.filter((row) => row.item_definition_id.trim()).map((row) => ({ item_definition_id: resolveGachaRef(row.item_definition_id.trim(), gachaAllItems), weight: Math.max(1, Number(row.weight) || 1), quantity_min: Math.max(1, Number(row.quantity_min) || 1), quantity_max: Math.max(Number(row.quantity_min) || 1, Number(row.quantity_max) || 1) })) }));
    if (drop_groups.length > 6 || drop_groups.some((group) => !group.key || group.item_pool.length === 0)) { toast({ variant: "destructive", title: t("items.saveFailed"), description: t("items.dropGroupsInvalid") }); return; }

    const key_requirements: KeyRequirement[] = keyReqSource.map((row) => ({
      item_definition_id: row.item_definition_id,
      quantity: Math.max(1, Number(row.quantity) || 1),
    }));

    if (item_pool.some((entry) => entry.weight < 1 || entry.quantity_min < 1 || entry.quantity_max < entry.quantity_min)) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: "Reward entries must have valid weight and quantity ranges." });
      return;
    }
    if (key_requirements.some((entry) => entry.quantity < 1)) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: "Key requirement quantities must be at least 1." });
      return;
    }

    const existingMeta = (editingPack?.metadata ?? {}) as Record<string, unknown>;
    const { mailbox_title: _omitTitle, mailbox_body: _omitBody, ...restMeta } = existingMeta;
    const metadata: Record<string, unknown> = { ...restMeta };
    if (gachaForm.collect_destination === "mailbox") {
      if (gachaForm.mailbox_title.trim()) metadata.mailbox_title = gachaForm.mailbox_title.trim();
      if (gachaForm.mailbox_body.trim()) metadata.mailbox_body = gachaForm.mailbox_body.trim();
    }

    const countMetadataKeys = (value: unknown): number => {
      if (!value || typeof value !== "object") return 0;
      if (Array.isArray(value)) return value.reduce((sum, entry) => sum + countMetadataKeys(entry), 0);
      return Object.entries(value as Record<string, unknown>).reduce((sum, [, entry]) => sum + 1 + countMetadataKeys(entry), 0);
    };
    if (countMetadataKeys(metadata) > 50) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: "Metadata cannot exceed 50 keys in total." });
      return;
    }

    setFormSaving(true);
    try {
      const ctx = { gameId };
      if (editingPack) {
        const res = await updateGachaPack(ctx, editingPack.id, {
          name,
          description: gachaForm.description.trim(),
          ...(codeName && { code_name: codeName }),
          collect_destination: gachaForm.collect_destination,
          is_enabled: gachaForm.is_enabled,
          item_pool,
          drop_groups,
          key_requirements,
          metadata,
        });
        setGachaPacks((prev) => prev.map((pack) => (pack.id === editingPack.id ? res.pack : pack)));
        setEditingPack(res.pack);
        toast({ title: t("items.packUpdated") });
        if (createGachaConvContext) {
          const { turnId, responseIdx, gachaPackIdx } = createGachaConvContext;
          window.dispatchEvent(new CustomEvent("ss:gacha-pack-created", { detail: { gachaPackId: res.pack.id, gachaPackName: res.pack.name, turnId, responseIdx, gachaPackIdx } }));
          setCreateGachaConvContext(undefined);
        }
      } else {
        const res = await createGachaPack(ctx, {
          name,
          description: gachaForm.description.trim(),
          ...(codeName && { code_name: codeName }),
          collect_destination: gachaForm.collect_destination,
          is_enabled: gachaForm.is_enabled,
          item_pool,
          drop_groups,
          key_requirements,
          metadata,
        });
        setGachaPacks((prev) => [res.pack, ...prev]);
        toast({ title: t("items.packCreated") });
        await loadGameInfo();
        if (createGachaConvContext) {
          const { turnId, responseIdx, gachaPackIdx } = createGachaConvContext;
          window.dispatchEvent(new CustomEvent("ss:gacha-pack-created", { detail: { gachaPackId: res.pack.id, gachaPackName: res.pack.name, turnId, responseIdx, gachaPackIdx } }));
          setCreateGachaConvContext(undefined);
        }
      }
      if (closeAfterSave) gachaCloseSheet();
    } catch (err: any) {
      toast({ variant: "destructive", title: t("items.saveFailed"), description: err?.message ?? "Unknown error" });
    } finally {
      setFormSaving(false);
    }
  }, [createGachaConvContext, editingPack, gameId, gachaAllItems, gachaCloseSheet, gachaForm, loadGameInfo, resolveGachaRef, setCreateGachaConvContext, setEditingPack, setFormSaving, setGachaPacks, t, toast]);

  const handleGachaToggle = useCallback(async (pack: GachaPack) => {
    setTogglingId(pack.id);
    try {
      const res = await setGachaPackEnabled({ gameId }, pack.id, !pack.is_enabled);
      setGachaPacks((prev) => prev.map((entry) => (entry.id === pack.id ? { ...entry, is_enabled: res.is_enabled } : entry)));
    } catch (err: any) {
      toast({ variant: "destructive", title: t("items.failedToTogglePack"), description: err?.message });
    } finally {
      setTogglingId(null);
    }
  }, [gameId, setGachaPacks, setTogglingId, t, toast]);

  const handleGachaDelete = useCallback(async () => {
    if (!deletingPack) return;
    setDeletePackLoading(true);
    try {
      await deleteGachaPack({ gameId }, deletingPack.id);
      setGachaPacks((prev) => prev.filter((pack) => pack.id !== deletingPack.id));
      toast({ title: t("items.packDeleted") });
      setDeletingPack(null);
      await loadGameInfo();
    } catch (err: any) {
      toast({ variant: "destructive", title: t("items.failedToDelete"), description: err?.message });
    } finally {
      setDeletePackLoading(false);
    }
  }, [deletingPack, gameId, loadGameInfo, setDeletePackLoading, setDeletingPack, setGachaPacks, t, toast]);

  const filteredGachaPacks = useMemo(
    () =>
      gachaSearchDebounced
        ? gachaPacks.filter((pack) => {
            const query = gachaSearchDebounced.toLowerCase();
            return pack.name.toLowerCase().includes(query) || pack.id.toLowerCase().includes(query) || (pack.code_name ?? "").toLowerCase().includes(query);
          })
        : gachaPacks,
    [gachaPacks, gachaSearchDebounced],
  );

  return {
    fetchGachaData,
    filteredGachaPacks,
    gachaCloseSheet,
    gachaOpenCreate,
    gachaOpenEdit,
    handleGachaSave,
    handleGachaToggle,
    handleGachaDelete,
  };
}
