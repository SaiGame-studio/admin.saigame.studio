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
        router.replace(value === "profile" ? "/profile" : `/profile?tab=${encodeURIComponent(value)}`, { scroll: false });
    }
    return (<div id="profile-page" className="profile-page container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <Tabs id="profile-tabs" value={activeTab} onValueChange={handleTabChange} className="profile-tabs w-full">
        <TabsList id="profile-tabs-list" className="profile-tabs-list grid w-full grid-cols-3 mb-4 sm:w-fit">
          <TabsTrigger id="profile-tab-trigger" value="profile" className="profile-tab-trigger flex items-center gap-1.5 sm:gap-2">
            <User className="h-4 w-4 shrink-0"/>
            <span className="truncate">Profile</span>
          </TabsTrigger>
          <TabsTrigger id="profile-referral-tab-trigger" value="referral" className="profile-referral-tab-trigger flex items-center gap-1.5 sm:gap-2">
            <TicketPercent className="h-4 w-4 shrink-0"/>
            <span className="truncate">Referral Codes</span>
          </TabsTrigger>
          <TabsTrigger id="profile-settings-tab-trigger" value="settings" className="profile-settings-tab-trigger flex items-center gap-1.5 sm:gap-2">
            <Settings className="h-4 w-4 shrink-0"/>
            <span className="truncate">{t('common.settings')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent id="profile-tab-content" value="profile" className="profile-tab-content mt-0">
          <ProfileContent />
        </TabsContent>

        <TabsContent id="profile-referral-tab-content" value="referral" className="profile-referral-tab-content mt-0">
          <ReferralCodesContent />
        </TabsContent>

        <TabsContent id="profile-settings-tab-content" value="settings" className="profile-settings-tab-content mt-0">
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
