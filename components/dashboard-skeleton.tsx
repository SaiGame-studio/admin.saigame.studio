import { Skeleton } from "@/components/ui/skeleton";
export function DashboardSkeleton() {
    return (<div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]"/>
        <Skeleton className="h-4 w-[200px]"/>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]"/>
        <Skeleton className="h-4 w-[200px]"/>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]"/>
        <Skeleton className="h-4 w-[200px]"/>
      </div>
    </div>);
}
