'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage-utils';
import { PANEL_MIN_WIDTH, PANEL_MAX_WIDTH, PANEL_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH, SPLIT_MIN, SPLIT_DEFAULT, LS_PANEL_WIDTH, LS_SIDEBAR_WIDTH, LS_SIDEBAR_SPLIT, } from '@/components/llm-conversations/conversation-panel-utils';
export function useConvPanelResize() {
    // ---------------------------------------------------------------------------
    // Panel width (horizontal resize — left edge)
    // ---------------------------------------------------------------------------
    const [panelWidth, setPanelWidth] = useState<number>(() => {
        const saved = safeGetItem(LS_PANEL_WIDTH);
        const parsed = saved ? parseInt(saved, 10) : NaN;
        return isNaN(parsed) ? PANEL_DEFAULT_WIDTH : Math.min(Math.max(parsed, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH);
    });
    const isResizingRef = useRef(false);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(0);
    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
        resizeStartXRef.current = e.clientX;
        resizeStartWidthRef.current = panelWidth;
        const onMouseMove = (ev: MouseEvent) => {
            if (!isResizingRef.current)
                return;
            const delta = resizeStartXRef.current - ev.clientX;
            const newWidth = Math.min(Math.max(resizeStartWidthRef.current + delta, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH);
            setPanelWidth(newWidth);
        };
        const onMouseUp = () => {
            isResizingRef.current = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [panelWidth]);
    useEffect(() => { safeSetItem(LS_PANEL_WIDTH, String(panelWidth)); }, [panelWidth]);
    // ---------------------------------------------------------------------------
    // Sidebar width (horizontal resize — right edge of sidebar)
    // ---------------------------------------------------------------------------
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const saved = safeGetItem(LS_SIDEBAR_WIDTH);
        const parsed = saved ? parseInt(saved, 10) : NaN;
        return isNaN(parsed) ? SIDEBAR_DEFAULT_WIDTH : Math.min(Math.max(parsed, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
    });
    const isSidebarResizingRef = useRef(false);
    const sidebarResizeStartXRef = useRef(0);
    const sidebarResizeStartWidthRef = useRef(0);
    const handleSidebarResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isSidebarResizingRef.current = true;
        sidebarResizeStartXRef.current = e.clientX;
        sidebarResizeStartWidthRef.current = sidebarWidth;
        const onMouseMove = (ev: MouseEvent) => {
            if (!isSidebarResizingRef.current)
                return;
            const delta = ev.clientX - sidebarResizeStartXRef.current;
            const newWidth = Math.min(Math.max(sidebarResizeStartWidthRef.current + delta, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
            setSidebarWidth(newWidth);
        };
        const onMouseUp = () => {
            isSidebarResizingRef.current = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [sidebarWidth]);
    useEffect(() => { safeSetItem(LS_SIDEBAR_WIDTH, String(sidebarWidth)); }, [sidebarWidth]);
    // ---------------------------------------------------------------------------
    // Sidebar vertical split (active section height)
    // ---------------------------------------------------------------------------
    const [activeSectionHeight, setActiveSectionHeight] = useState<number>(() => {
        const saved = safeGetItem(LS_SIDEBAR_SPLIT);
        const parsed = saved ? parseInt(saved, 10) : NaN;
        return isNaN(parsed) ? SPLIT_DEFAULT : Math.max(parsed, SPLIT_MIN);
    });
    const isSplitResizingRef = useRef(false);
    const splitResizeStartYRef = useRef(0);
    const splitResizeStartHeightRef = useRef(0);
    const sidebarBodyRef = useRef<HTMLDivElement>(null);
    const handleSplitResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isSplitResizingRef.current = true;
        splitResizeStartYRef.current = e.clientY;
        splitResizeStartHeightRef.current = activeSectionHeight;
        const onMouseMove = (ev: MouseEvent) => {
            if (!isSplitResizingRef.current)
                return;
            const delta = ev.clientY - splitResizeStartYRef.current;
            const containerHeight = sidebarBodyRef.current?.clientHeight ?? 0;
            const maxHeight = containerHeight > 0 ? containerHeight - SPLIT_MIN - 4 : 9999;
            const newHeight = Math.min(Math.max(splitResizeStartHeightRef.current + delta, SPLIT_MIN), maxHeight);
            setActiveSectionHeight(newHeight);
        };
        const onMouseUp = () => {
            isSplitResizingRef.current = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [activeSectionHeight]);
    useEffect(() => { safeSetItem(LS_SIDEBAR_SPLIT, String(activeSectionHeight)); }, [activeSectionHeight]);
    return {
        panelWidth,
        handleResizeMouseDown,
        sidebarWidth,
        handleSidebarResizeMouseDown,
        activeSectionHeight,
        handleSplitResizeMouseDown,
        sidebarBodyRef,
    };
}
