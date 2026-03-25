"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export default function ServerConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)

    // Simulate saving configuration
    setTimeout(() => {
      setIsSaving(false)
    }, 1000)
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-xl font-semibold md:text-2xl">Server Configuration</h1>
          <Button className="ml-auto" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="gameplay">Gameplay</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure basic server settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-name">Server Name</Label>
                  <Input id="server-name" defaultValue="Minecraft Survival" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server-description">Server Description</Label>
                  <Textarea
                    id="server-description"
                    defaultValue="A survival Minecraft server with a friendly community."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-players">Max Players</Label>
                    <Input id="max-players" type="number" defaultValue="50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server-port">Server Port</Label>
                    <Input id="server-port" type="number" defaultValue="25565" />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="public-listing" defaultChecked />
                  <Label htmlFor="public-listing">List server publicly</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Settings</CardTitle>
                <CardDescription>Configure server performance and resource allocation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memory-allocation">Memory Allocation (GB)</Label>
                    <Input id="memory-allocation" type="number" defaultValue="4" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpu-cores">CPU Cores</Label>
                    <Input id="cpu-cores" type="number" defaultValue="2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="view-distance">View Distance</Label>
                  <Input id="view-distance" type="number" defaultValue="10" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="simulation-distance">Simulation Distance</Label>
                  <Input id="simulation-distance" type="number" defaultValue="8" />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="optimize-chunks" defaultChecked />
                  <Label htmlFor="optimize-chunks">Optimize chunk loading</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gameplay">
            <Card>
              <CardHeader>
                <CardTitle>Gameplay Settings</CardTitle>
                <CardDescription>Configure gameplay rules and mechanics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue="normal"
                  >
                    <option value="peaceful">Peaceful</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gamemode">Default Gamemode</Label>
                  <select
                    id="gamemode"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue="survival"
                  >
                    <option value="survival">Survival</option>
                    <option value="creative">Creative</option>
                    <option value="adventure">Adventure</option>
                    <option value="spectator">Spectator</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="pvp" defaultChecked />
                  <Label htmlFor="pvp">Enable PvP</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="spawn-monsters" defaultChecked />
                  <Label htmlFor="spawn-monsters">Spawn monsters</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="spawn-animals" defaultChecked />
                  <Label htmlFor="spawn-animals">Spawn animals</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Configure advanced server properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-properties">Server Properties</Label>
                  <Textarea
                    id="server-properties"
                    className="font-mono text-xs"
                    rows={15}
                    defaultValue={`# Minecraft server properties
spawn-protection=16
max-tick-time=60000
query.port=25565
generator-settings=
force-gamemode=false
allow-nether=true
enforce-whitelist=false
gamemode=survival
broadcast-console-to-ops=true
enable-query=false
player-idle-timeout=0
difficulty=normal
spawn-monsters=true
broadcast-rcon-to-ops=true
op-permission-level=4
pvp=true
entity-broadcast-range-percentage=100
snooper-enabled=true
level-type=default
hardcore=false
enable-command-block=false
max-players=50
network-compression-threshold=256
resource-pack-sha1=
max-world-size=29999984
function-permission-level=2
rcon.port=25575
server-port=25565
debug=false
server-ip=
spawn-npcs=true
allow-flight=false
level-name=world
view-distance=10
resource-pack=
spawn-animals=true
white-list=false
rcon.password=
generate-structures=true
max-build-height=256
online-mode=true
level-seed=
use-native-transport=true
prevent-proxy-connections=false
enable-rcon=false
motd=A Minecraft Server`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="java-args">Java Arguments</Label>
                  <Input
                    id="java-args"
                    defaultValue="-Xmx4G -Xms1G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
