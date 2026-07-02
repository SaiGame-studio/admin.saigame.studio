"use client";

import { useState } from "react";
import type { ContainerTypeOption } from "@/lib/inventory-api";
import type { ContainerDefinition, ItemDefinition } from "@/types/inventory";
import type { ContainerDraftValues } from "./items-page-state-types";

type ContainerConversationContext = {
    turnId: string;
    responseIdx: number;
    containerIdx: number;
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

type EditingFieldState = {
    id: string;
    field: string;
} | null;

type MetadataRow = {
    k: string;
    v: string;
};

export function useContainerPageState() {
    const [containerDefs, setContainerDefs] = useState<ContainerDefinition[]>([]);
    const [containerTotal, setContainerTotal] = useState(0);
    const [containerLoading, setContainerLoading] = useState(false);
    const [containerError, setContainerError] = useState<string | null>(null);
    const [containerOffset, setContainerOffset] = useState(0);
    const [showCreateContainer, setShowCreateContainer] = useState(false);
    const [createContainerInitialValues, setCreateContainerInitialValues] = useState<CreateContainerInitialValues | undefined>(undefined);
    const [createContainerConvContext, setCreateContainerConvContext] = useState<ContainerConversationContext | undefined>(undefined);
    const [editingContainer, setEditingContainer] = useState<ContainerDefinition | null>(null);
    const [editingContainerDraft, setEditingContainerDraft] = useState<ContainerDraftValues | undefined>(undefined);
    const [editingContainerConvContext, setEditingContainerConvContext] = useState<ContainerConversationContext | undefined>(undefined);
    const [deletingContainer, setDeletingContainer] = useState<ContainerDefinition | null>(null);
    const [deleteContainerLoading, setDeleteContainerLoading] = useState(false);
    const [containerSearch, setContainerSearch] = useState("");
    const [containerSearchDebounced, setContainerSearchDebounced] = useState("");
    const [containerAllItems, setContainerAllItems] = useState<ItemDefinition[]>([]);
    const [containerTypeOptions, setContainerTypeOptions] = useState<ContainerTypeOption[]>([]);
    const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
    const [containerDetailCache, setContainerDetailCache] = useState<Record<string, ContainerDefinition>>({});
    const [containerDetailLoading, setContainerDetailLoading] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<EditingFieldState>(null);
    const [editValue, setEditValue] = useState("");
    const [editValue2, setEditValue2] = useState("");
    const [containerItemsOnly, setContainerItemsOnly] = useState(false);
    const [metadataRows, setMetadataRows] = useState<MetadataRow[]>([]);
    const [containerSubTab, setContainerSubTab] = useState<"definitions" | "slot-guide">("definitions");
    const [updatingContainerId, setUpdatingContainerId] = useState<string | null>(null);

    return {
        containerDefs,
        setContainerDefs,
        containerTotal,
        setContainerTotal,
        containerLoading,
        setContainerLoading,
        containerError,
        setContainerError,
        containerOffset,
        setContainerOffset,
        showCreateContainer,
        setShowCreateContainer,
        createContainerInitialValues,
        setCreateContainerInitialValues,
        createContainerConvContext,
        setCreateContainerConvContext,
        editingContainer,
        setEditingContainer,
        editingContainerDraft,
        setEditingContainerDraft,
        editingContainerConvContext,
        setEditingContainerConvContext,
        deletingContainer,
        setDeletingContainer,
        deleteContainerLoading,
        setDeleteContainerLoading,
        containerSearch,
        setContainerSearch,
        containerSearchDebounced,
        setContainerSearchDebounced,
        containerAllItems,
        setContainerAllItems,
        containerTypeOptions,
        setContainerTypeOptions,
        expandedContainerId,
        setExpandedContainerId,
        containerDetailCache,
        setContainerDetailCache,
        containerDetailLoading,
        setContainerDetailLoading,
        editingField,
        setEditingField,
        editValue,
        setEditValue,
        editValue2,
        setEditValue2,
        containerItemsOnly,
        setContainerItemsOnly,
        metadataRows,
        setMetadataRows,
        containerSubTab,
        setContainerSubTab,
        updatingContainerId,
        setUpdatingContainerId,
    };
}

