import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const activities = [
  {
    id: 1,
    user: { name: "xXGamerXx", avatar: "/placeholder.svg?height=32&width=32" },
    action: "used admin command",
    target: "/give diamond 64",
    time: "2 minutes ago",
    server: "Minecraft Survival",
  },
  {
    id: 2,
    user: { name: "SkyWarrior", avatar: "/placeholder.svg?height=32&width=32" },
    action: "attempted unauthorized access",
    target: "admin panel",
    time: "15 minutes ago",
    server: "CS:GO Competitive",
  },
  {
    id: 3,
    user: { name: "DragonSlayer", avatar: "/placeholder.svg?height=32&width=32" },
    action: "disconnected",
    target: "",
    time: "32 minutes ago",
    server: "Rust Community",
  },
  {
    id: 4,
    user: { name: "System", avatar: "/placeholder.svg?height=32&width=32" },
    action: "performed backup",
    target: "world data",
    time: "1 hour ago",
    server: "Minecraft Survival",
  },
  {
    id: 5,
    user: { name: "Admin", avatar: "/placeholder.svg?height=32&width=32" },
    action: "restarted server",
    target: "",
    time: "3 hours ago",
    server: "Terraria Adventure",
  },
]

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
            <AvatarFallback>{activity.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">
              <span className="font-semibold">{activity.user.name}</span> {activity.action}
              {activity.target && <span className="font-mono text-xs"> {activity.target}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {activity.time} on {activity.server}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
