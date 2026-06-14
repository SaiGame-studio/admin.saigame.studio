"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Settings, TicketPercent, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileContent } from "@/components/profile-content";
import { ReferralCodesContent } from "@/components/referral-codes-content";
import { SettingsContent } from "@/components/settings-content";
import { useTranslation } from "@/lib/i18n/use-translation";
const VALID_TABS = ["profile", "referral", "settings"] as const;
type TabValue = (typeof VALID_TABS)[number];
function ProfileTabs() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const rawTab = searchParams.get("tab");
    const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "profile";
    function handleTabChange(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.replace(`?${params.toString()}`, { scroll: false });
    }
    return (<div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 sm:w-fit">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 sm:gap-2">
            <User className="h-4 w-4 shrink-0"/>
            <span className="truncate">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="referral" className="flex items-center gap-1.5 sm:gap-2">
            <TicketPercent className="h-4 w-4 shrink-0"/>
            <span className="truncate">Referral Codes</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 sm:gap-2">
            <Settings className="h-4 w-4 shrink-0"/>
            <span className="truncate">{t('common.settings')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ProfileContent />
        </TabsContent>

        <TabsContent value="referral" className="mt-0">
          <ReferralCodesContent />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <SettingsContent />
        </TabsContent>
      </Tabs>
    </div>);
}
export default function ProfilePage() {
    return (<Suspense>
      <ProfileTabs />
    </Suspense>);
}
