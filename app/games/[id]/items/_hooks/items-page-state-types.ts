"use client";

export interface PoolRow {
    item_definition_id: string;
    weight: string;
    quantity_min: string;
    quantity_max: string;
}

export interface KeyReqRow {
    item_definition_id: string;
    quantity: string;
}
export interface DropGroupFormRow {
    key: string;
    pool: PoolRow[];
}

export type GachaLLMRow = {
    item_definition_id?: unknown;
    weight?: unknown;
    quantity_min?: unknown;
    quantity_max?: unknown;
    quantity?: unknown;
};

export const EMPTY_ROW = (): PoolRow => ({
    item_definition_id: "",
    weight: "700000",
    quantity_min: "1",
    quantity_max: "1",
});

export const EMPTY_KEY_ROW = (): KeyReqRow => ({
    item_definition_id: "",
    quantity: "1",
});

export function emptyGachaForm() {
    return {
        name: "",
        description: "",
        code_name: "",
        collect_destination: "mailbox" as "mailbox" | "inventory",
        is_enabled: true,
        mailbox_title: "",
        mailbox_body: "",
        pool: [EMPTY_ROW()],
        dropGroups: [],
        keyReqs: [EMPTY_KEY_ROW()],
    };
}

export type GachaFormValues = ReturnType<typeof emptyGachaForm>;

export type ContainerDraftValues = {
    name?: string;
    code_name?: string;
    container_type?: string;
    grid_cols?: number;
    grid_rows?: number;
    is_portable?: boolean;
    instanced_per_item?: boolean;
    linked_item_definition_id?: string;
    linked_item_definition_name?: string;
    linked_item_definition_code?: string;
    metadata?: Record<string, unknown>;
};

export function normalizeContainerDraftValues(draft: Record<string, unknown> | null | undefined): ContainerDraftValues | undefined {
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
        return undefined;
    }

    const record = draft as Record<string, unknown>;
    const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : undefined;

    return {
        name: typeof record.name === "string" ? record.name : undefined,
        code_name: typeof record.code_name === "string" ? record.code_name : undefined,
        container_type: typeof record.container_type === "string" ? record.container_type : undefined,
        grid_cols: typeof record.grid_cols === "number" ? record.grid_cols : undefined,
        grid_rows: typeof record.grid_rows === "number" ? record.grid_rows : undefined,
        is_portable: typeof record.is_portable === "boolean" ? record.is_portable : undefined,
        instanced_per_item: typeof record.instanced_per_item === "boolean" ? record.instanced_per_item : undefined,
        linked_item_definition_id: typeof record.linked_item_definition_id === "string" ? record.linked_item_definition_id : undefined,
        linked_item_definition_name: typeof record.linked_item_definition_name === "string" ? record.linked_item_definition_name : undefined,
        linked_item_definition_code: typeof record.linked_item_definition_code === "string" ? record.linked_item_definition_code : undefined,
        metadata,
    };
}
