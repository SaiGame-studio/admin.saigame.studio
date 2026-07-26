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

export function QuestStatusIcon({ status, id, className = "h-3.5 w-3.5" }: QuestStatusIconProps) {
    const Icon = QUEST_STATUS_ICONS[status] ?? CircleHelp;
    return <Icon id={id} className={className} aria-hidden="true"/>;
}
