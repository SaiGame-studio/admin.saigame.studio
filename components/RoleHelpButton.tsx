"use client";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n/use-translation";
interface RoleHelpButtonProps {
    id: string;
    roleId: string;
    onOpen: (roleId: string) => void;
}
/** Small "?" trigger placed next to a role name; opens the role guide panel. */
export function RoleHelpButton({ id, roleId, onOpen }: RoleHelpButtonProps) {
    const { t } = useTranslation();
    return (<TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button id={id} type="button" onClick={() => onOpen(roleId)} aria-label={t('team.roleGuide.open')} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <CircleHelp className="h-3.5 w-3.5"/>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('team.roleGuide.open')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>);
}
