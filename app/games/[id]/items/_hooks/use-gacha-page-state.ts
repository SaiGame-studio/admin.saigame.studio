"use client";

import { useRef, useState } from "react";
import type { ItemDefinition, GachaPack } from "@/types/inventory";
import type { GameLimits } from "@/types/game";
import { emptyGachaForm, type GachaFormValues } from "./items-page-state-types";

type GachaConversationContext = {
    turnId: string;
    responseIdx: number;
    gachaPackIdx: number;
};

export function useGachaPageState() {
    const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([]);
    const [gachaAllItems, setGachaAllItems] = useState<ItemDefinition[]>([]);
    const [gachaLoading, setGachaLoading] = useState(false);
    const [gachaError, setGachaError] = useState<string | null>(null);
    const [gameLimits, setGameLimits] = useState<GameLimits | null>(null);
    const [expandedPack, setExpandedPack] = useState<string | null>(null);
    const [gachaSheetOpen, setGachaSheetOpen] = useState(false);
    const [editingPack, setEditingPack] = useState<GachaPack | null>(null);
    const [formSaving, setFormSaving] = useState(false);
    const [gachaForm, setGachaForm] = useState<GachaFormValues>(emptyGachaForm());
    const [createGachaConvContext, setCreateGachaConvContext] = useState<GachaConversationContext | undefined>(undefined);
    const [deletingPack, setDeletingPack] = useState<GachaPack | null>(null);
    const [deletePackLoading, setDeletePackLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [gachaSearch, setGachaSearch] = useState("");
    const [gachaSearchDebounced, setGachaSearchDebounced] = useState("");
    const suppressGachaAutoOpenRef = useRef(false);

    return {
        gachaPacks,
        setGachaPacks,
        gachaAllItems,
        setGachaAllItems,
        gachaLoading,
        setGachaLoading,
        gachaError,
        setGachaError,
        gameLimits,
        setGameLimits,
        expandedPack,
        setExpandedPack,
        gachaSheetOpen,
        setGachaSheetOpen,
        editingPack,
        setEditingPack,
        formSaving,
        setFormSaving,
        gachaForm,
        setGachaForm,
        createGachaConvContext,
        setCreateGachaConvContext,
        deletingPack,
        setDeletingPack,
        deletePackLoading,
        setDeletePackLoading,
        togglingId,
        setTogglingId,
        gachaSearch,
        setGachaSearch,
        gachaSearchDebounced,
        setGachaSearchDebounced,
        suppressGachaAutoOpenRef,
    };
}
