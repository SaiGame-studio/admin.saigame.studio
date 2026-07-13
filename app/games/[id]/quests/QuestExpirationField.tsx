"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestExpirationHelpSheet } from "./QuestExpirationHelpSheet";

type ExpirationUnit = "minute" | "hour" | "day" | "week" | "month";

const EXPIRATION_UNITS: Array<{
    value: ExpirationUnit;
    minutes: number;
    labelKey: string;
}> = [
    { value: "minute", minutes: 1, labelKey: "quest.expirationUnitMinute" },
    { value: "hour", minutes: 60, labelKey: "quest.expirationUnitHour" },
    { value: "day", minutes: 60 * 24, labelKey: "quest.expirationUnitDay" },
    { value: "week", minutes: 60 * 24 * 7, labelKey: "quest.expirationUnitWeek" },
    { value: "month", minutes: 60 * 24 * 30, labelKey: "quest.expirationUnitMonth" },
];

function getDisplayUnit(minutes: number): ExpirationUnit {
    for (const unit of [...EXPIRATION_UNITS].reverse()) {
        if (minutes >= unit.minutes && minutes % unit.minutes === 0) {
            return unit.value;
        }
    }
    return "minute";
}

interface QuestExpirationFieldProps {
    idScope: "create" | "edit";
    value?: number | null;
    onChange: (minutes?: number) => void;
    t: (key: string) => string;
}

export function QuestExpirationField({ idScope, value, onChange, t }: QuestExpirationFieldProps) {
    const expirationMinutes = value ?? 7200;
    const hasExpiration = typeof value === "number";
    const [selectedUnit, setSelectedUnit] = useState<ExpirationUnit>(() => getDisplayUnit(expirationMinutes));
    const selectedUnitConfig = EXPIRATION_UNITS.find((unit) => unit.value === selectedUnit) ?? EXPIRATION_UNITS[0];
    const amount = expirationMinutes / selectedUnitConfig.minutes;
    const fieldId = `quest-expiration-${idScope}`;

    const handleUnitChange = (nextUnit: ExpirationUnit) => {
        const nextUnitConfig = EXPIRATION_UNITS.find((unit) => unit.value === nextUnit) ?? EXPIRATION_UNITS[0];
        setSelectedUnit(nextUnit);
        onChange(Math.max(1, Math.round(amount * nextUnitConfig.minutes)));
    };

    const handleEnabledChange = (checked: boolean) => {
        if (checked) {
            setSelectedUnit(getDisplayUnit(7200));
            onChange(7200);
            return;
        }
        onChange(undefined);
    };

    return (
        <div id={`${fieldId}-field`} className="space-y-3">
            <div id={`${fieldId}-enabled-field`} className="flex items-center gap-2">
                <Checkbox
                    id={`${fieldId}-enabled`}
                    checked={hasExpiration}
                    onCheckedChange={(checked) => handleEnabledChange(checked === true)}
                />
                <Label id={`${fieldId}-enabled-label`} htmlFor={`${fieldId}-enabled`}>{t("quest.hasExpiration")}</Label>
                <QuestExpirationHelpSheet idScope={idScope} t={t} />
            </div>
            {hasExpiration && (
                <div id={`${fieldId}-settings`} className="space-y-1">
                    <Label id={`${fieldId}-label`} htmlFor={`${fieldId}-amount`}>{t("quest.expireAfter")}</Label>
                    <div id={`${fieldId}-controls`} className="grid grid-cols-[minmax(0,1fr)_minmax(140px,0.75fr)] gap-2">
                        <Input
                            id={`${fieldId}-amount`}
                            type="number"
                            min={1}
                            step={1}
                            value={amount}
                            onChange={(event) => {
                                const nextAmount = event.target.valueAsNumber;
                                if (Number.isFinite(nextAmount) && nextAmount >= 1) {
                                    onChange(Math.round(nextAmount * selectedUnitConfig.minutes));
                                }
                            }}
                        />
                        <Select value={selectedUnit} onValueChange={(unit) => handleUnitChange(unit as ExpirationUnit)}>
                            <SelectTrigger id={`${fieldId}-unit-trigger`} aria-label={t("quest.expirationUnit")}>
                                <SelectValue id={`${fieldId}-unit-value`} />
                            </SelectTrigger>
                            <SelectContent id={`${fieldId}-unit-content`}>
                                {EXPIRATION_UNITS.map((unit) => (
                                    <SelectItem id={`${fieldId}-unit-${unit.value}`} key={unit.value} value={unit.value}>
                                        {t(unit.labelKey)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">{t("quest.expireAfterHint")}</p>
                </div>
            )}
        </div>
    );
}
