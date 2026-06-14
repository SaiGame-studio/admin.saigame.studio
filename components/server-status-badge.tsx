import { Badge } from "@/components/ui/badge";
interface ServerStatusBadgeProps {
    status: "online" | "offline" | "restarting" | "maintenance";
}
export function ServerStatusBadge({ status }: ServerStatusBadgeProps) {
    switch (status) {
        case "online":
            return <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>;
        case "offline":
            return <Badge variant="destructive">Offline</Badge>;
        case "restarting":
            return (<Badge variant="outline" className="border-yellow-500 text-yellow-500">
          Restarting
        </Badge>);
        case "maintenance":
            return (<Badge variant="outline" className="border-blue-500 text-blue-500">
          Maintenance
        </Badge>);
        default:
            return <Badge variant="outline">Unknown</Badge>;
    }
}
