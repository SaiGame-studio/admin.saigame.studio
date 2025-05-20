import { Suspense } from "react"
import Link from "next/link"
import { Activity, Clock, Server, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServerStatusBadge } from "@/components/server-status-badge"
import { ServerStats } from "@/components/server-stats"
import { RecentActivity } from "@/components/recent-activity"
import { OnlineUsers } from "@/components/online-users"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { ThemeTest } from "@/components/theme-test"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/servers/new">Add Server</Link>
            </Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="servers">Servers</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4</div>
                  <p className="text-xs text-muted-foreground">3 online, 1 offline</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">127</div>
                  <p className="text-xs text-muted-foreground">+5% from last hour</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">99.9%</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Server Activity</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+573</div>
                  <p className="text-xs text-muted-foreground">Actions today</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Server Performance</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ServerStats />
                  </Suspense>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest actions across all servers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <RecentActivity />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="servers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Server Management</CardTitle>
                <CardDescription>Manage your game servers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { id: 1, name: "Minecraft Survival", status: "online", players: 32, maxPlayers: 50 },
                      { id: 2, name: "CS:GO Competitive", status: "online", players: 18, maxPlayers: 20 },
                      { id: 3, name: "Rust Community", status: "online", players: 77, maxPlayers: 100 },
                      { id: 4, name: "Terraria Adventure", status: "offline", players: 0, maxPlayers: 16 },
                    ].map((server) => (
                      <Card key={server.id} className="overflow-hidden">
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{server.name}</CardTitle>
                            <ServerStatusBadge status={server.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-sm text-muted-foreground">
                            Players: {server.players}/{server.maxPlayers}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button size="sm" variant={server.status === "online" ? "destructive" : "default"}>
                              {server.status === "online" ? "Stop" : "Start"}
                            </Button>
                            <Button size="sm" variant="outline">
                              Restart
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/servers/${server.id}/config`}>Configure</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage users across all servers</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<DashboardSkeleton />}>
                  <OnlineUsers />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Server Logs</CardTitle>
                <CardDescription>View and search server logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-black p-4">
                  <pre className="text-xs text-green-400">
                    <code>
                      {`[2024-05-20 21:32:15] [INFO] Server started on port 25565
[2024-05-20 21:32:18] [INFO] Player xXGamerXx connected from 192.168.1.45
[2024-05-20 21:33:22] [INFO] Player SkyWarrior connected from 192.168.1.102
[2024-05-20 21:34:15] [WARNING] High memory usage detected: 85%
[2024-05-20 21:35:01] [INFO] Player DragonSlayer connected from 192.168.1.78
[2024-05-20 21:36:45] [INFO] Player xXGamerXx used command: /give diamond 64
[2024-05-20 21:37:12] [WARNING] Player SkyWarrior attempted to use admin command without permission
[2024-05-20 21:38:30] [INFO] Player DragonSlayer disconnected: client closed connection
[2024-05-20 21:39:15] [INFO] Automatic world backup started
[2024-05-20 21:40:22] [INFO] Backup completed successfully`}
                    </code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <ThemeTest />
        </div>
      </main>
    </div>
  )
}
