"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { getInventoryTabUrl, isInventoryType } from "@/lib/utils/item-profile-utils";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
interface InventoryLinkProps {
    gameId: string;
    itemProfile: {
        id: string;
        type: string;
        name?: string;
    };
    variant?: "button" | "badge" | "link";
    size?: "sm" | "default" | "lg";
    className?: string;
}
export function InventoryLink({ gameId, itemProfile, variant = "button", size = "sm", className = "" }: InventoryLinkProps) {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    if (!isInventoryType(itemProfile)) {
        return null;
    }
    const url = getInventoryTabUrl(gameId, itemProfile.id);
    const text = t('inventory.title');
    switch (variant) {
        case "badge":
            return (<Link href={url} className={`inline-flex items-center gap-1 ${className}`}>
          <Badge variant="secondary" className="inline-flex items-center gap-1">
            <Package className="w-3 h-3"/>
            {text}
          </Badge>
        </Link>);
        case "link":
            return (<Link href={url} className={`inline-flex items-center gap-1 text-primary hover:underline ${className}`}>
          <Package className="w-4 h-4"/>
          {text}
        </Link>);
        case "button":
        default:
            return (<Button asChild variant="secondary" size={size} className={className}>
          <Link href={url} className="inline-flex items-center gap-1">
            <Package className="w-4 h-4"/>
            {text}
          </Link>
        </Button>);
    }
}
