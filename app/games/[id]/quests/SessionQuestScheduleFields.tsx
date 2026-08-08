"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fromUserDatetime, getUserTimezone, toUserDatetime } from "@/lib/utils/date-utils";

interface SessionQuestScheduleFieldsProps {
    idScope: "create" | "edit";
    session: Record<string, unknown>;
    onChange: (session: Record<string, unknown>) => void;
    t: (key: string) => string;
}

function getNextMonthWindow(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getUserTimezone(),
        year: "numeric",
        month: "2-digit",
    }).formatToParts(now);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));
    const toLocalMidnight = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01T00:00`;
    return {
        session_start_at: fromUserDatetime(toLocalMidnight(start)),
        session_end_at: fromUserDatetime(toLocalMidnight(end)),
    };
}

export function createDefaultSessionSchedule() {
    const window = getNextMonthWindow();
    return {
        repeatable: false,
        session_start_at: window.session_start_at,
        session_end_at: window.session_end_at,
    };
}

export function SessionQuestScheduleFields({ idScope, session, onChange, t }: SessionQuestScheduleFieldsProps) {
    const repeatable = session.repeatable === true;
    const timeZone = getUserTimezone();
    const setRepeatable = (checked: boolean) => {
        if (checked) {
            onChange({ repeatable: true, cycle_start_at: getNextMonthWindow().session_start_at, repeat_every_months: 1 });
            return;
        }
        onChange(createDefaultSessionSchedule());
    };

    return (
        <div id={`quest-session-config-${idScope}`} className="quest-session-config grid gap-3 rounded-md border p-3 md:grid-cols-2">
            <div id={`quest-session-repeatable-field-${idScope}`} className="col-span-full flex items-center justify-between gap-3">
                <Label id={`quest-session-repeatable-label-${idScope}`} htmlFor={`quest-session-repeatable-input-${idScope}`}>
                    {t("quest.sessionRepeatable")}
                </Label>
                <Switch
                    id={`quest-session-repeatable-input-${idScope}`}
                    checked={repeatable}
                    onCheckedChange={setRepeatable}
                />
            </div>

            {repeatable ? (
                <>
                    <div id={`quest-session-cycle-start-field-${idScope}`} className="space-y-1">
                        <Label id={`quest-session-cycle-start-label-${idScope}`} htmlFor={`quest-session-cycle-start-input-${idScope}`}>
                            {t("quest.sessionCycleStartAt")} ({timeZone})
                        </Label>
                        <Input
                            id={`quest-session-cycle-start-input-${idScope}`}
                            type="datetime-local"
                            value={typeof session.cycle_start_at === "string" ? toUserDatetime(session.cycle_start_at) : ""}
                            onChange={(event) => onChange({ ...session, cycle_start_at: fromUserDatetime(event.target.value) })}
                        />
                    </div>
                    <div id={`quest-session-repeat-months-field-${idScope}`} className="space-y-1">
                        <Label id={`quest-session-repeat-months-label-${idScope}`} htmlFor={`quest-session-repeat-months-input-${idScope}`}>
                            {t("quest.sessionRepeatEveryMonths")}
                        </Label>
                        <Input
                            id={`quest-session-repeat-months-input-${idScope}`}
                            type="number"
                            min={1}
                            step={1}
                            value={typeof session.repeat_every_months === "number" ? session.repeat_every_months : 1}
                            onChange={(event) => {
                                const months = event.target.valueAsNumber;
                                if (Number.isInteger(months) && months >= 1) onChange({ ...session, repeat_every_months: months });
                            }}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div id={`quest-session-start-field-${idScope}`} className="space-y-1">
                        <Label id={`quest-session-start-label-${idScope}`} htmlFor={`quest-session-start-input-${idScope}`}>
                            {t("quest.sessionStartAt")} ({timeZone})
                        </Label>
                        <Input
                            id={`quest-session-start-input-${idScope}`}
                            type="datetime-local"
                            value={typeof session.session_start_at === "string" ? toUserDatetime(session.session_start_at) : ""}
                            onChange={(event) => onChange({ ...session, session_start_at: fromUserDatetime(event.target.value) })}
                        />
                    </div>
                    <div id={`quest-session-end-field-${idScope}`} className="space-y-1">
                        <Label id={`quest-session-end-label-${idScope}`} htmlFor={`quest-session-end-input-${idScope}`}>
                            {t("quest.sessionEndAt")} ({timeZone})
                        </Label>
                        <Input
                            id={`quest-session-end-input-${idScope}`}
                            type="datetime-local"
                            value={typeof session.session_end_at === "string" ? toUserDatetime(session.session_end_at) : ""}
                            onChange={(event) => onChange({ ...session, session_end_at: fromUserDatetime(event.target.value) })}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
