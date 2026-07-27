import {
    Ban,
    CheckCircle2,
    CircleDashed,
    CircleHelp,
    Gift,
    ListFilter,
    Loader2,
    Lock,
    TimerOff,
    TriangleAlert,
    type LucideIcon,
} from "lucide-react";

const QUEST_STATUS_ICONS: Record<string, LucideIcon> = {
    all: ListFilter,
    in_progress: Loader2,
    completed: CheckCircle2,
    claimed: Gift,
    cancelled: Ban,
    locked: Lock,
    expired: TimerOff,
    not_started: CircleDashed,
    failed: TriangleAlert,
};

interface QuestStatusIconProps {
    status: string;
    id: string;
    className?: string;
}

export function getQuestStatusTextClass(status: string) {
    if (status === "claimed") return "text-green-500";
    if (status === "completed") return "text-blue-400";
    if (status === "not_started") return "text-amber-500";
    if (status === "cancelled" || status === "expired" || status === "failed") return "text-red-400";
    return "text-muted-foreground";
}

export function QuestStatusIcon({ status, id, className = "h-3.5 w-3.5" }: QuestStatusIconProps) {
    const Icon = QUEST_STATUS_ICONS[status] ?? CircleHelp;
    return <Icon id={id} className={className} aria-hidden="true"/>;
}
