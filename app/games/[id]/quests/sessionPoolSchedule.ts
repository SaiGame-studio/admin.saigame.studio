import { fromUserDatetime, getUserTimezone } from "@/lib/utils/date-utils";

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

export function createDefaultSessionPoolSchedule() {
    const window = getNextMonthWindow();
    return {
        repeatable: false,
        session_start_at: window.session_start_at,
        session_end_at: window.session_end_at,
    };
}
