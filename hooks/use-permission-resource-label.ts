"use client";
import { useCallback } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";
/** Returns a translated label for a permission resource, falling back to the raw resource key. */
export function usePermissionResourceLabel() {
    const { t } = useTranslation();
    return useCallback((resource: string) => {
        const key = `team.permissionResource.${resource}`;
        const label = t(key);
        return label === key ? resource : label;
    }, [t]);
}
