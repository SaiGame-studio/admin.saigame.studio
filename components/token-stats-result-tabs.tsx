"use client";
import { useEffect, useMemo, useState } from "react";
import type { LLMTokenStatsResult } from "@/lib/admin-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig, } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const tokenStatsChartConfig: ChartConfig = {
    input: { label: "Input", color: "hsl(var(--chart-1))" },
    output: { label: "Output", color: "hsl(var(--chart-2))" },
};
function formatBucketLabel(isoDate: string, period: "hourly" | "daily" | "weekly" | "monthly"): string {
    const d = new Date(isoDate);
    if (isNaN(d.getTime()))
        return isoDate;
    if (period === "hourly") {
        return d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    if (period === "daily")
        return d.toLocaleDateString("en-GB");
    if (period === "weekly") {
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
        return `W${week} ${d.getFullYear()}`;
    }
    if (period === "monthly") {
        return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    }
    return isoDate;
}
const TOKEN_STATS_BASE_RESULT_KEYS = new Set([
    "period",
    "buckets",
    "total_input_tokens",
    "total_output_tokens",
    "total_tokens",
]);

function coerceNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function pickLabelValue(entry: Record<string, unknown>, fallbackIndex: number): string {
    const labelKeys = ["label", "name", "title", "bucket", "period", "date", "time", "created_at", "timestamp", "id"];
    for (const key of labelKeys) {
        const value = entry[key];
        if (typeof value === "string" && value.trim())
            return value;
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    const firstTextEntry = Object.entries(entry).find(([, value]) => typeof value === "string" || typeof value === "number");
    if (firstTextEntry) {
        const [, value] = firstTextEntry;
        return String(value);
    }
    return String(fallbackIndex + 1);
}
function buildFieldChartSeries(value: unknown): { data: Array<Record<string, unknown>>; keys: string[] } | null {
    if (Array.isArray(value)) {
        if (value.length === 0)
            return null;
        if (value.every((item) => typeof item === "number" || typeof item === "string")) {
            const data = value
                .map((item, index) => ({ label: String(index + 1), value: coerceNumber(item) }))
                .filter((item) => item.value !== null) as Array<Record<string, unknown>>;
            return data.length > 0 ? { data, keys: ["value"] } : null;
        }
        if (value.every(isPlainObject)) {
            const objects = value as Record<string, unknown>[];
            const numericKeys = Array.from(new Set(objects.flatMap((item) => Object.entries(item)
                .filter(([, fieldValue]) => coerceNumber(fieldValue) !== null)
                .map(([fieldName]) => fieldName)))).filter(Boolean);
            if (numericKeys.length === 0)
                return null;
            const data = objects.map((item, index) => {
                const row: Record<string, unknown> = {
                    label: pickLabelValue(item, index),
                };
                for (const key of numericKeys) {
                    const numericValue = coerceNumber(item[key]);
                    if (numericValue !== null)
                        row[key] = numericValue;
                }
                return row;
            });
            return { data, keys: numericKeys };
        }
        return null;
    }
    if (isPlainObject(value)) {
        const numericEntries = Object.entries(value).filter(([, fieldValue]) => coerceNumber(fieldValue) !== null);
        if (numericEntries.length === 0)
            return null;
        const data = numericEntries.map(([label, fieldValue]) => ({
            label,
            value: coerceNumber(fieldValue) ?? 0,
        }));
        return { data, keys: ["value"] };
    }
    return null;
}
function fieldChartColor(index: number): string {
    const colors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
    ];
    return colors[index % colors.length] ?? colors[0];
}
function fieldValueToText(value: unknown): string {
    if (value === null)
        return "null";
    if (value === undefined)
        return "—";
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
        return String(value);
    return formatUnknownValue(value);
}
function formatTableCellValue(value: unknown): string {
    if (typeof value === "number" && Number.isFinite(value))
        return value.toLocaleString();
    return fieldValueToText(value);
}
function getRowName(row: Record<string, unknown>, fallbackIndex: number): string {
    const nameKeys = ["name", "label", "title", "display_name", "displayName", "key"];
    for (const key of nameKeys) {
        const value = row[key];
        if (typeof value === "string" && value.trim())
            return value;
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    return `Item ${fallbackIndex + 1}`;
}
function getRowId(row: Record<string, unknown>, fallbackIndex: number): string {
    const idKeys = ["id", "uuid", "key", "slug", "code", "name"];
    for (const key of idKeys) {
        const value = row[key];
        if (typeof value === "string" && value.trim())
            return value;
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    return String(fallbackIndex + 1);
}
function buildFieldTableRows(value: unknown): { rows: Array<Record<string, unknown>>; columns: string[] } | null {
    if (Array.isArray(value)) {
        if (value.length === 0)
            return null;
        if (value.every(isPlainObject)) {
            const objects = value as Record<string, unknown>[];
            const columns = Array.from(new Set(objects.flatMap((item) => Object.keys(item)))).filter((key) => !["name", "label", "title", "display_name", "displayName", "id", "uuid", "key", "slug", "code"].includes(key));
            const rows = objects.map((item, index) => ({
                _row_name: getRowName(item, index),
                _row_id: getRowId(item, index),
                ...item,
            }));
            return { rows, columns };
        }
        const rows = value.map((item, index) => ({
            _row_name: `Item ${index + 1}`,
            _row_id: String(index + 1),
            value: item,
        }));
        return { rows, columns: ["value"] };
    }
    if (isPlainObject(value)) {
        const entries = Object.entries(value);
        if (entries.length === 0)
            return null;
        const rows = entries.map(([key, entryValue], index) => ({
            _row_name: humanizeFieldName(key),
            _row_id: key,
            value: entryValue,
        }));
        return { rows, columns: ["value"] };
    }
    return null;
}

function slugifyIdPart(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "field";
}
function humanizeFieldName(fieldName: string): string {
    const spaced = fieldName.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function formatUnknownValue(value: unknown): string {
    if (value === null)
        return "null";
    if (value === undefined)
        return "undefined";
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
        return String(value);
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
function renderValuePreview(value: unknown): string {
    if (Array.isArray(value))
        return value.length === 0 ? "[]" : formatUnknownValue(value);
    if (isPlainObject(value))
        return Object.keys(value).length === 0 ? "{}" : formatUnknownValue(value);
    return formatUnknownValue(value);
}
function SummaryCards({ result, t, }: {
    result: LLMTokenStatsResult;
    t: ReturnType<typeof useTranslation>["t"];
}) {
    return (<div id="token-stats-summary-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card id="token-stats-summary-input">
        <CardContent className="pt-4">
          <p id="token-stats-summary-input-label" className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("tokenStats.inputTokens")}
          </p>
          <p id="token-stats-summary-input-value" className="text-2xl font-bold">
            {result.total_input_tokens.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card id="token-stats-summary-output">
        <CardContent className="pt-4">
          <p id="token-stats-summary-output-label" className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("tokenStats.outputTokens")}
          </p>
          <p id="token-stats-summary-output-value" className="text-2xl font-bold">
            {result.total_output_tokens.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card id="token-stats-summary-total">
        <CardContent className="pt-4">
          <p id="token-stats-summary-total-label" className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("tokenStats.totalTokens")}
          </p>
          <p id="token-stats-summary-total-value" className="text-2xl font-bold">
            {result.total_tokens.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>);
}
function TokenStatsChart({ buckets, period, t, }: {
    buckets: { label: string; input_tokens: number; output_tokens: number; total_tokens: number; }[];
    period: "hourly" | "daily" | "weekly" | "monthly";
    t: ReturnType<typeof useTranslation>["t"];
}) {
    const chartData = [...buckets].reverse().map((b) => ({
        label: formatBucketLabel(b.label, period),
        input: b.input_tokens,
        output: b.output_tokens,
    }));
    return (<Card id="token-stats-chart-card">
      <CardHeader id="token-stats-chart-header">
        <CardTitle id="token-stats-chart-title" className="text-base">
          {t("tokenStats.chartTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id="token-stats-chart-content">
        <ChartContainer id="token-stats-chart-container" config={tokenStatsChartConfig} className="h-[320px] w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid vertical={false}/>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }}/>
            <YAxis tickLine={false} axisLine={false} tickMargin={8}/>
            <ChartTooltip content={<ChartTooltipContent />}/>
            <ChartLegend content={<ChartLegendContent />}/>
            <Bar dataKey="input" fill="var(--color-input)" radius={[4, 4, 0, 0]}/>
            <Bar dataKey="output" fill="var(--color-output)" radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>);
}
function TokenStatsTable({ buckets, period, t, }: {
    buckets: { label: string; input_tokens: number; output_tokens: number; total_tokens: number; }[];
    period: "hourly" | "daily" | "weekly" | "monthly";
    t: ReturnType<typeof useTranslation>["t"];
}) {
    return (<Card id="token-stats-table-card">
      <CardHeader id="token-stats-table-header">
        <CardTitle id="token-stats-table-title" className="text-base">
          {t("tokenStats.tableTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id="token-stats-table-content">
        <Table id="token-stats-table">
          <TableHeader id="token-stats-table-head">
            <TableRow id="token-stats-table-head-row">
              <TableHead id="token-stats-col-bucket">{t("tokenStats.colBucket")}</TableHead>
              <TableHead id="token-stats-col-input" className="text-right">{t("tokenStats.colInput")}</TableHead>
              <TableHead id="token-stats-col-output" className="text-right">{t("tokenStats.colOutput")}</TableHead>
              <TableHead id="token-stats-col-total" className="text-right">{t("tokenStats.colTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody id="token-stats-table-body">
            {buckets.map((b, idx) => (<TableRow id={`token-stats-row-${idx}`} key={b.label}>
                <TableCell id={`token-stats-row-${idx}-bucket`} className="font-mono text-xs">
                  {formatBucketLabel(b.label, period)}
                </TableCell>
                <TableCell id={`token-stats-row-${idx}-input`} className="text-right">
                  {b.input_tokens.toLocaleString()}
                </TableCell>
                <TableCell id={`token-stats-row-${idx}-output`} className="text-right">
                  {b.output_tokens.toLocaleString()}
                </TableCell>
                <TableCell id={`token-stats-row-${idx}-total`} className="text-right font-medium">
                  {b.total_tokens.toLocaleString()}
                </TableCell>
              </TableRow>))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>);
}
function TokenStatsFieldChart({ fieldName, value, t, }: {
    fieldName: string;
    value: unknown;
    t: ReturnType<typeof useTranslation>["t"];
}) {
    const series = useMemo(() => buildFieldChartSeries(value), [value]);
    const chartConfig = useMemo(() => {
        if (!series)
            return null;
        if (series.keys.length === 1) {
            return {
                value: { label: humanizeFieldName(fieldName), color: fieldChartColor(0) },
            } satisfies ChartConfig;
        }
        return Object.fromEntries(series.keys.map((key, index) => [key, { label: humanizeFieldName(key), color: fieldChartColor(index) }])) as ChartConfig;
    }, [fieldName, series]);
    if (!series || !chartConfig)
        return null;
    return (<Card id={`token-stats-field-chart-card-${slugifyIdPart(fieldName)}`}>
      <CardHeader id={`token-stats-field-chart-header-${slugifyIdPart(fieldName)}`}>
        <CardTitle id={`token-stats-field-chart-title-${slugifyIdPart(fieldName)}`} className="text-base">
          {t("tokenStats.fieldChartTitle")} {humanizeFieldName(fieldName)}
        </CardTitle>
      </CardHeader>
      <CardContent id={`token-stats-field-chart-content-${slugifyIdPart(fieldName)}`}>
        <ChartContainer id={`token-stats-field-chart-container-${slugifyIdPart(fieldName)}`} config={chartConfig} className="h-[320px] w-full">
          <BarChart data={series.data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid vertical={false}/>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }}/>
            <YAxis tickLine={false} axisLine={false} tickMargin={8}/>
            <ChartTooltip content={<ChartTooltipContent />}/>
            <ChartLegend content={<ChartLegendContent />}/>
            {series.keys.length === 1 ? (<Bar dataKey="value" fill={`var(--color-value)`} radius={[4, 4, 0, 0]}/>) : (series.keys.map((key) => (<Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[4, 4, 0, 0]}/>)))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>);
}
function TokenStatsFieldTable({ fieldName, value, t, }: {
    fieldName: string;
    value: unknown;
    t: ReturnType<typeof useTranslation>["t"];
}) {
    const tableData = useMemo(() => buildFieldTableRows(value), [value]);
    if (!tableData)
        return null;
    const fieldId = slugifyIdPart(fieldName);
    const columns = tableData.columns;
    return (<Card id={`token-stats-field-table-card-${fieldId}`}>
      <CardHeader id={`token-stats-field-table-header-${fieldId}`}>
        <CardTitle id={`token-stats-field-table-title-${fieldId}`} className="text-base">
          {t("tokenStats.tableTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id={`token-stats-field-table-content-${fieldId}`}>
        <Table id={`token-stats-field-table-${fieldId}`}>
          <TableHeader id={`token-stats-field-table-head-${fieldId}`}>
            <TableRow id={`token-stats-field-table-head-row-${fieldId}`}>
              <TableHead id={`token-stats-field-col-name-${fieldId}`}>{t("tokenStats.colName")}</TableHead>
              <TableHead id={`token-stats-field-col-id-${fieldId}`}>{t("tokenStats.colId")}</TableHead>
              {columns.map((column) => (<TableHead key={column} id={`token-stats-field-col-${slugifyIdPart(column)}-${fieldId}`} className="text-right">
                  {humanizeFieldName(column)}
                </TableHead>))}
            </TableRow>
          </TableHeader>
          <TableBody id={`token-stats-field-table-body-${fieldId}`}>
            {tableData.rows.map((row, index) => {
                const rowId = `${fieldId}-${index}`;
                return (<TableRow id={`token-stats-field-row-${rowId}`} key={rowId}>
                    <TableCell id={`token-stats-field-row-${rowId}-name`} className="font-medium">
                      {fieldValueToText(row._row_name)}
                    </TableCell>
                    <TableCell id={`token-stats-field-row-${rowId}-id`} className="font-mono text-xs">
                      {fieldValueToText(row._row_id)}
                    </TableCell>
                    {columns.map((column) => (<TableCell key={column} id={`token-stats-field-row-${rowId}-${slugifyIdPart(column)}`} className="text-right">
                        {formatTableCellValue(row[column])}
                      </TableCell>))}
                  </TableRow>);
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>);
}
function TokenStatsFieldCard({ fieldName, value, t, }: {
    fieldName: string;
    value: unknown;
    t: ReturnType<typeof useTranslation>["t"];
}) {
    const fieldId = slugifyIdPart(fieldName);
    const displayName = humanizeFieldName(fieldName);
    return (<Card id={`token-stats-field-card-${fieldId}`}>
      <CardHeader id={`token-stats-field-header-${fieldId}`} className="pb-3">
        <div id={`token-stats-field-header-row-${fieldId}`} className="flex items-center justify-between gap-3">
          <CardTitle id={`token-stats-field-title-${fieldId}`} className="text-base">
            {displayName}
          </CardTitle>
          {isPlainObject(value) || Array.isArray(value) ? (<span id={`token-stats-field-count-pill-${fieldId}`} className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {Array.isArray(value)
            ? (value.length === 0 ? t("tokenStats.noData") : `${value.length} item${value.length === 1 ? "" : "s"}`)
            : (Object.keys(value).length === 0 ? t("tokenStats.noData") : `${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"}`)}
            </span>) : null}
        </div>
      </CardHeader>
      <CardContent id={`token-stats-field-content-${fieldId}`}>
        {isPlainObject(value) || Array.isArray(value) ? (<div id={`token-stats-field-table-wrap-${fieldId}`} className="space-y-4">
            {Array.isArray(value) || isPlainObject(value) ? (<TokenStatsFieldTable fieldName={fieldName} value={value} t={t}/>) : null}
          </div>) : (<div id={`token-stats-field-primitive-${fieldId}`} className="rounded-md border bg-muted/30 px-4 py-3 text-sm font-mono break-words">
            {renderValuePreview(value)}
          </div>)}
      </CardContent>
    </Card>);
}
export function TokenStatsResultTabs({ result, t, }: {
    result: LLMTokenStatsResult;
    t: ReturnType<typeof useTranslation>["t"];
}) {
    const [activeTab, setActiveTab] = useState("buckets");
    const extraFields = useMemo(() => Object.entries(result).filter(([key, value]) => !TOKEN_STATS_BASE_RESULT_KEYS.has(key) && value !== undefined), [result]);
    const fieldTabs = useMemo(() => extraFields.map(([fieldName, value], index) => {
        const fieldId = `${slugifyIdPart(fieldName)}-${index}`;
        return {
            value: `field-${fieldId}`,
            label: humanizeFieldName(fieldName),
            fieldName,
            fieldValue: value,
        };
    }), [extraFields]);
    const tabItems = useMemo(() => [
        {
            value: "buckets",
            label: t("tokenStats.tabBuckets"),
        },
        ...fieldTabs,
    ], [fieldTabs, t]);
    useEffect(() => {
        setActiveTab("buckets");
    }, [result]);
    return (<Tabs id="token-stats-result-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div id="token-stats-result-tabs-scroll" className="overflow-x-auto">
        <TabsList id="token-stats-result-tabs-list" className="mb-4 inline-flex min-w-max">
          {tabItems.map((tab) => (<TabsTrigger key={tab.value} id={`token-stats-result-tab-trigger-${tab.value}`} value={tab.value} className="flex items-center gap-2">
              {tab.label}
            </TabsTrigger>))}
        </TabsList>
      </div>
      <TabsContent id="token-stats-result-tab-buckets-content" value="buckets" className="mt-0 space-y-6">
        <SummaryCards result={result} t={t}/>
        {result.buckets.length === 0 ? (<Card id="token-stats-no-data-card">
            <CardContent id="token-stats-no-data-content" className="pt-4 text-muted-foreground text-sm">
              {t("tokenStats.noData")}
            </CardContent>
          </Card>) : (<>
            <TokenStatsChart buckets={result.buckets} period={result.period} t={t}/>
            <TokenStatsTable buckets={result.buckets} period={result.period} t={t}/>
          </>)}
      </TabsContent>
      {fieldTabs.map((tab) => (<TabsContent key={tab.value} id={`token-stats-result-tab-content-${tab.value}`} value={tab.value} className="mt-0 space-y-6">
          <TokenStatsFieldChart fieldName={tab.fieldName} value={tab.fieldValue} t={t}/>
          <TokenStatsFieldCard fieldName={tab.fieldName} value={tab.fieldValue} t={t}/>
        </TabsContent>))}
    </Tabs>);
}
