"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Loader2, History, CheckCircle2, XCircle, PackageCheck, ChevronRight, ChevronDown, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getGame } from "@/lib/game-api";
import { getCraftingRecipe, listCraftingRecipeHistory } from "@/lib/crafting-api";
import { GameNavButtons } from "@/components/GameNavButtons";
import type { Game } from "@/types/game";
import type { CraftingRecipe, CraftingHistoryTransaction } from "@/types/crafting";
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
}
function StatusBadge({ success }: {
    success: boolean;
}) {
    if (success) {
        return (<Badge className="text-xs gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="h-3 w-3"/>
        Success
      </Badge>);
    }
    return (<Badge variant="destructive" className="text-xs gap-1">
      <XCircle className="h-3 w-3"/>
      Failed
    </Badge>);
}
function TransactionRow({ tx, gameId }: {
    tx: CraftingHistoryTransaction;
    gameId: string;
}) {
    const [expanded, setExpanded] = useState(false);
    return (<>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(v => !v)}>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>}
            <span className="font-mono text-xs text-muted-foreground">{tx.id.slice(0, 8)}…</span>
            <CopyButton text={tx.id} size="h-3 w-3"/>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Link href={`/games/${gameId}/players/${tx.user_id}`} className="font-mono text-xs hover:underline text-primary" onClick={e => e.stopPropagation()}>
              {tx.user_id.slice(0, 8)}…
            </Link>
            <CopyButton text={tx.user_id} size="h-3 w-3"/>
          </div>
        </TableCell>
        <TableCell><StatusBadge success={tx.success}/></TableCell>
        <TableCell>
          {tx.bonus_triggered ? (<Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
              Bonus
            </Badge>) : (<span className="text-xs text-muted-foreground">—</span>)}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{tx.craft_count_at_time}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
      </TableRow>

      {expanded && (<TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="py-3 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Materials */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Materials
                </p>
                <div className="space-y-1">
                  {tx.materials_snapshot.length === 0 ? (<p className="text-xs text-muted-foreground">No materials</p>) : tx.materials_snapshot.map((m, i) => (<div key={i} className="flex items-center justify-between text-xs bg-background border rounded px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/games/${gameId}/items/${m.item_definition_id}`} className="hover:underline text-primary" onClick={e => e.stopPropagation()}>
                          {m.item_definition_name}
                        </Link>
                        {m.was_consumed && (<Badge variant="secondary" className="text-[10px] px-1 py-0">consumed</Badge>)}
                      </div>
                      <span className="font-medium">×{m.quantity}</span>
                    </div>))}
                </div>
              </div>

              {/* Outputs */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Outputs
                </p>
                <div className="space-y-1">
                  {tx.outputs_snapshot.length === 0 ? (<p className="text-xs text-muted-foreground">No outputs</p>) : tx.outputs_snapshot.map((o, i) => (<div key={i} className="flex items-center justify-between text-xs bg-background border rounded px-2 py-1">
                      <Link href={`/games/${gameId}/items/${o.item_definition_id}`} className="hover:underline text-primary" onClick={e => e.stopPropagation()}>
                        {o.item_definition_name}
                      </Link>
                      <span className="font-medium">×{o.quantity}</span>
                    </div>))}
                </div>
              </div>
            </div>

            {/* Idempotency key */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">Idempotency key:</span>
              <span className="font-mono">{tx.idempotency_key}</span>
              <CopyButton text={tx.idempotency_key} size="h-3 w-3"/>
            </div>
          </TableCell>
        </TableRow>)}
    </>);
}
export default function RecipeHistoryPage() {
    const params = useParams() as {
        id: string;
        recipeId: string;
    };
    const router = useRouter();
    const { toast } = useToast();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const gameId = params.id;
    const recipeId = params.recipeId;
    const [game, setGame] = useState<Game | null>(null);
    const [recipe, setRecipe] = useState<CraftingRecipe | null>(null);
    const [transactions, setTransactions] = useState<CraftingHistoryTransaction[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const fetchHistory = useCallback(async (p: number, status: typeof statusFilter) => {
        setLoading(true);
        setError(null);
        try {
            const data = await listCraftingRecipeHistory({ gameId }, recipeId, {
                page: p,
                page_size: pageSize,
                ...(status !== "all" ? { status } : {}),
            });
            setTransactions(data.transactions ?? []);
            setTotal(data.total ?? 0);
        }
        catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load history";
            setError(msg);
        }
        finally {
            setLoading(false);
        }
    }, [gameId, recipeId, pageSize]);
    // Load game + recipe info once
    useEffect(() => {
        Promise.all([
            getGame(gameId).catch(() => null),
            getCraftingRecipe({ gameId }, recipeId).catch(() => null),
        ]).then(([g, r]) => {
            if (g)
                setGame(g);
            if (r)
                setRecipe(r);
        });
    }, [gameId, recipeId]);
    // Load history on page/filter change
    useEffect(() => {
        fetchHistory(page, statusFilter);
    }, [fetchHistory, page, statusFilter]);
    function handleStatusChange(value: string) {
        setStatusFilter(value as typeof statusFilter);
        setPage(1);
    }
    return (<div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}/items?tab=crafting`}>Crafting</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{recipe?.name ?? recipeId}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>History</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-muted-foreground"/>
              Craft History
            </h1>
            {recipe && (<p className="text-muted-foreground text-sm mt-0.5">
                {recipe.name}
                <span className="ml-2 font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded border">
                  {recipe.recipe_key}
                </span>
              </p>)}
          </div>
        </div>
        <div className="mt-4 md:mt-0">
          <GameNavButtons gameId={gameId} active="items"/>
        </div>
      </div>

      {/* Filter + refresh toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">
          {total} transaction{total !== 1 ? "s" : ""}
        </span>

        <div className="flex items-center gap-3 ml-auto">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="All statuses"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchHistory(page, statusFilter)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin"/>
              <span className="text-sm">Loading history…</span>
            </div>) : error ? (<div className="py-16 text-center">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchHistory(page, statusFilter)}>
                Retry
              </Button>
            </div>) : transactions.length === 0 ? (<div className="py-16 text-center">
              <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40"/>
              <p className="text-sm text-muted-foreground">No craft history found.</p>
            </div>) : (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Transaction ID</TableHead>
                  <TableHead className="w-[140px]">Player</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[80px]">Bonus</TableHead>
                  <TableHead className="w-[80px]">Craft #</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (<TransactionRow key={tx.id} tx={tx} gameId={gameId}/>))}
              </TableBody>
            </Table>)}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (<div className="flex items-center justify-between mt-4 text-sm text-muted-foreground px-1">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>)}
    </div>);
}
