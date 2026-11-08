"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { ShopDetailOverview } from "./_components/ShopDetailOverview";
import { ShopDetailTabs } from "./_components/ShopDetailTabs";
import { ShopItemDialogs } from "./_components/ShopItemDialogs";
import { useShopDetail } from "./_components/use-shop-detail";
export default function ShopDetailPage() {
    const state = useShopDetail();
    const { loading, error, shop } = state;
    if (loading) {
        return (<div className="container mx-auto py-12 px-4 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading shop…
        </div>);
    }
    if (error || !shop) {
        return (<div className="container mx-auto py-6 px-4">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error ?? "Shop not found."}</AlertDescription>
            </Alert>
        </div>);
    }

    const viewState = { ...state, shop };
    return <div id="shop-detail-page" className="container mx-auto py-6 px-4 space-y-6">
        <ShopDetailOverview {...viewState} />
        <ShopDetailTabs {...viewState} />
        <ShopItemDialogs {...viewState} />
    </div>;
}
