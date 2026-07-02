"use client";

import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";

import { deleteContainerDefinition, fetchContainerTypes, getContainerDefinition, listContainerDefinitions, listItemDefinitions, updateContainerDefinition } from "@/lib/inventory-api";
import { createConversation, linkConversationContent } from "@/lib/llm-conversation-api";
import { safeSetItem } from "@/lib/storage-utils";
import type { ContainerDefinition, ItemDefinition, UpdateContainerDefinitionRequest } from "@/types/inventory";

type ToastFn = (options: { title?: string; description?: string; variant?: "default" | "destructive" }) => void;

type MetadataRow = { k: string; v: string };
type EditingField = { id: string; field: string } | null;

type UseContainerPageParams = {
  gameId: string;
  activeTab: string;
  containerLimit: number;
  containerOffset: number;
  containerTotal: number;
  containerDefs: ContainerDefinition[];
  containerSearchDebounced: string;
  containerAllItems: ItemDefinition[];
  items: ItemDefinition[];
  expandedContainerId: string | null;
  containerDetailCache: Record<string, ContainerDefinition>;
  deletingContainer: ContainerDefinition | null;
  editingField: EditingField;
  editValue: string;
  editValue2: string;
  metadataRows: MetadataRow[];
  convActiveId: string | null;
  t: (key: string) => string;
  toast: ToastFn;
  loadGameInfo: () => Promise<void>;
  setContainerLoading: (value: boolean) => void;
  setContainerError: (value: string | null) => void;
  setContainerDefs: Dispatch<SetStateAction<ContainerDefinition[]>>;
  setContainerTotal: (value: number) => void;
  setContainerAllItems: (value: ItemDefinition[]) => void;
  setContainerTypeOptions: (value: any[]) => void;
  setDeleteContainerLoading: (value: boolean) => void;
  setDeletingContainer: (value: ContainerDefinition | null) => void;
  setExpandedContainerId: (value: string | null) => void;
  setEditingField: (value: EditingField) => void;
  setMetadataRows: (value: MetadataRow[]) => void;
  setContainerDetailLoading: (value: string | null) => void;
  setContainerDetailCache: Dispatch<SetStateAction<Record<string, ContainerDefinition>>>;
  setUpdatingContainerId: (value: string | null) => void;
  setConvActiveId: (value: string | null) => void;
  setLinkingContainerId: (value: string | null) => void;
};

export function useContainerPage({
  gameId,
  activeTab,
  containerLimit,
  containerOffset,
  containerTotal,
  containerDefs,
  containerSearchDebounced,
  containerAllItems,
  items,
  expandedContainerId,
  containerDetailCache,
  deletingContainer,
  editingField,
  editValue,
  editValue2,
  metadataRows,
  convActiveId,
  t,
  toast,
  loadGameInfo,
  setContainerLoading,
  setContainerError,
  setContainerDefs,
  setContainerTotal,
  setContainerAllItems,
  setContainerTypeOptions,
  setDeleteContainerLoading,
  setDeletingContainer,
  setExpandedContainerId,
  setEditingField,
  setMetadataRows,
  setContainerDetailLoading,
  setContainerDetailCache,
  setUpdatingContainerId,
  setConvActiveId,
  setLinkingContainerId,
}: UseContainerPageParams) {
  const fetchContainerDefs = useCallback(async () => {
    setContainerLoading(true);
    setContainerError(null);
    try {
      const ctx = { gameId };
      const [result, itemsRes] = await Promise.all([
        listContainerDefinitions(ctx, { limit: containerLimit, offset: containerOffset }),
        listItemDefinitions(ctx, { limit: 200 }),
      ]);
      setContainerDefs(result.container_definitions ?? []);
      setContainerTotal(result.total);
      setContainerAllItems(itemsRes.items ?? []);
    } catch (err: any) {
      setContainerError(err?.message ?? "Failed to load container definitions");
    } finally {
      setContainerLoading(false);
    }
  }, [containerLimit, containerOffset, gameId, setContainerAllItems, setContainerDefs, setContainerError, setContainerLoading, setContainerTotal]);

  useEffect(() => {
    if (activeTab === "containers") {
      fetchContainerDefs();
    }
  }, [activeTab, fetchContainerDefs]);

  useEffect(() => {
    fetchContainerTypes().then(setContainerTypeOptions).catch(() => {});
  }, [setContainerTypeOptions]);

  const handleLinkContainerToConversation = useCallback(async (def: ContainerDefinition) => {
    setLinkingContainerId(def.id);
    try {
      let convId: string | null = convActiveId;
      const containerLabel = def.code_name ? `${def.name} (${def.code_name})` : def.name;
      if (!convId) {
        const newConv = await createConversation(gameId, {
          title: `Container: ${containerLabel}`,
          goal: t("items.linkToConvGoal").replace("{name}", containerLabel),
        });
        convId = newConv.ID;
      }
      safeSetItem(`ss_conv_active_${gameId}`, convId);
      setConvActiveId(convId);
      await linkConversationContent(gameId, convId, "container_definition", def.id);
      window.dispatchEvent(new CustomEvent("ss:conv-external-created", { detail: { convId, gameId } }));
      window.dispatchEvent(new CustomEvent("ss:conv-content-linked", { detail: { convId, gameId, contentType: "container_definition", contentId: def.id, contentName: containerLabel } }));
      toast({ title: t("items.linkToConvSuccess"), description: containerLabel });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("items.linkToConvFailed"),
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLinkingContainerId(null);
    }
  }, [convActiveId, gameId, setConvActiveId, setLinkingContainerId, t, toast]);

  const handleDeleteContainer = useCallback(async () => {
    if (!deletingContainer) return;
    setDeleteContainerLoading(true);
    try {
      await deleteContainerDefinition({ gameId }, deletingContainer.id);
      toast({ title: t("items.containerDeleted") });
      setDeletingContainer(null);
      await fetchContainerDefs();
      await loadGameInfo();
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t("items.cannotDelete"), description: t("items.systemContainerCannotDelete") });
      } else if (err?.status === 409) {
        toast({ variant: "destructive", title: t("items.cannotDelete"), description: t("items.containerHasActiveRefs") });
      } else {
        toast({ variant: "destructive", title: t("items.failedToDelete"), description: err?.message ?? "Unknown error" });
      }
    } finally {
      setDeleteContainerLoading(false);
    }
  }, [deletingContainer, fetchContainerDefs, gameId, loadGameInfo, setDeleteContainerLoading, setDeletingContainer, t, toast]);

  const filteredContainerDefs = useMemo(
    () =>
      containerSearchDebounced
        ? containerDefs.filter(
            (def) =>
              def.name.toLowerCase().includes(containerSearchDebounced.toLowerCase()) ||
              (def.code_name ?? "").toLowerCase().includes(containerSearchDebounced.toLowerCase()) ||
              def.id.toLowerCase().includes(containerSearchDebounced.toLowerCase()),
          )
        : containerDefs,
    [containerDefs, containerSearchDebounced],
  );

  const containerTotalPages = Math.ceil(containerTotal / containerLimit);
  const containerCurrentPage = Math.floor(containerOffset / containerLimit) + 1;

  const getItemName = useCallback(
    (id: string | null | undefined) => {
      if (!id) return t("items.noLinkedItem");
      const item = containerAllItems.find((entry) => entry.id === id) || items.find((entry) => entry.id === id);
      return item ? `${item.name}${item.item_code ? ` (${item.item_code})` : ""}` : `${id.slice(0, 8)}...`;
    },
    [containerAllItems, items, t],
  );

  const handleContainerRowClick = useCallback((def: ContainerDefinition) => {
    if (expandedContainerId === def.id) {
      setExpandedContainerId(null);
      return;
    }
    setExpandedContainerId(def.id);
    setEditingField(null);

    const base = containerDetailCache[def.id] || def;
    const rows = Object.entries(base.metadata || {}).map(([key, value]) => ({
      k: key,
      v: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
    setMetadataRows(rows.length > 0 ? rows : [{ k: "", v: "" }]);

    if (containerDetailCache[def.id]) return;

    setContainerDetailLoading(def.id);
    getContainerDefinition({ gameId }, def.id)
      .then((res: { container_definition: ContainerDefinition }) => {
        setContainerDetailCache((prev) => ({ ...prev, [def.id]: res.container_definition }));
        if (!editingField || editingField.id !== def.id) {
          const fetchedRows = Object.entries(res.container_definition.metadata || {}).map(([key, value]) => ({
            k: key,
            v: typeof value === "object" ? JSON.stringify(value) : String(value),
          }));
          setMetadataRows(fetchedRows.length > 0 ? fetchedRows : [{ k: "", v: "" }]);
        }
      })
      .catch(() => {
        setContainerDetailCache((prev) => ({ ...prev, [def.id]: def }));
      })
      .finally(() => setContainerDetailLoading(null));
  }, [containerDetailCache, editingField, expandedContainerId, gameId, setContainerDetailCache, setContainerDetailLoading, setEditingField, setExpandedContainerId, setMetadataRows]);

  const handleUpdateContainerField = useCallback(async (definitionId: string, patch: UpdateContainerDefinitionRequest) => {
    setUpdatingContainerId(definitionId);
    try {
      const { container_definition: updated } = await updateContainerDefinition({ gameId }, definitionId, patch);
      setContainerDefs((prev) => prev.map((def) => (def.id === definitionId ? updated : def)));
      setContainerDetailCache((prev) => ({ ...prev, [definitionId]: updated }));
      toast({ title: t("items.containerUpdated") });
    } catch (err: any) {
      toast({ variant: "destructive", title: t("items.failedToUpdate"), description: err?.message ?? "Unknown error" });
    } finally {
      setUpdatingContainerId(null);
    }
  }, [gameId, setContainerDefs, setContainerDetailCache, setUpdatingContainerId, t, toast]);

  const handleSaveInlineEdit = useCallback(async () => {
    if (!editingField) return;

    const { id, field } = editingField;
    const patch: UpdateContainerDefinitionRequest = {};

    if (field === "name") {
      if (!editValue.trim()) {
        toast({ variant: "destructive", title: t("items.nameRequired") });
        return;
      }
      patch.name = editValue.trim();
    }

    if (field === "code_name") {
      if (!editValue.trim()) {
        toast({ variant: "destructive", title: t("items.codeNameRequired") });
        return;
      }
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(editValue.trim())) {
        toast({ variant: "destructive", title: t("items.saveFailed"), description: t("items.codeNameInvalid") });
        return;
      }
      patch.code_name = editValue.trim();
    }

    if (field === "linked_item_id") {
      patch.linked_item_definition_id = editValue;
    }

    if (field === "grid") {
      const cols = parseInt(editValue, 10);
      const rows = parseInt(editValue2, 10);
      if (isNaN(cols) || cols < 1 || cols > 54) {
        toast({ variant: "destructive", title: t("items.colsMustBe") });
        return;
      }
      if (isNaN(rows) || rows < 1 || rows > 54) {
        toast({ variant: "destructive", title: t("items.rowsMustBe") });
        return;
      }
      patch.grid_cols = cols;
      patch.grid_rows = rows;
    }

    if (field === "metadata") {
      const metadata: Record<string, any> = {};
      metadataRows.forEach((row) => {
        const key = row.k.trim();
        if (!key) return;

        let value: any = row.v.trim();
        if (value.toLowerCase() === "true") value = true;
        else if (value.toLowerCase() === "false") value = false;
        else if (!isNaN(Number(value)) && value !== "") value = Number(value);

        metadata[key] = value;
      });
      patch.metadata = metadata;
    }

    await handleUpdateContainerField(id, patch);
    setEditingField(null);
  }, [editValue, editValue2, editingField, handleUpdateContainerField, metadataRows, setEditingField, t, toast]);

  return {
    fetchContainerDefs,
    handleLinkContainerToConversation,
    handleDeleteContainer,
    filteredContainerDefs,
    containerTotalPages,
    containerCurrentPage,
    getItemName,
    handleContainerRowClick,
    handleUpdateContainerField,
    handleSaveInlineEdit,
  };
}

