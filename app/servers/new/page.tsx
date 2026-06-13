"use client";
import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function NewServerPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate server creation
        setTimeout(() => {
            setIsSubmitting(false);
            router.push("/servers");
        }, 1500);
    };
    return (<div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4"/>
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-xl font-semibold md:text-2xl">Add New Server</h1>
        </div>

        <Tabs defaultValue="quick-setup" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick-setup">Quick Setup</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="quick-setup">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Server Information</CardTitle>
                  <CardDescription>Enter the basic information to set up your game server.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="server-name">Server Name</Label>
                    <Input id="server-name" placeholder="My Awesome Server" required/>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="game-type">Game Type</Label>
                    <Select defaultValue="minecraft">
                      <SelectTrigger>
                        <SelectValue placeholder="Select game type"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minecraft">Minecraft</SelectItem>
                        <SelectItem value="csgo">Counter-Strike: Global Offensive</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="terraria">Terraria</SelectItem>
                        <SelectItem value="valheim">Valheim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-players">Max Players</Label>
                      <Input id="max-players" type="number" defaultValue="20" min="1" max="100" required/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-port">Server Port</Label>
                      <Input id="server-port" type="number" defaultValue="25565" min="1024" max="65535" required/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="server-location">Server Location</Label>
                    <Select defaultValue="us-east">
                      <SelectTrigger>
                        <SelectValue placeholder="Select server location"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-central">EU Central (Frankfurt)</SelectItem>
                        <SelectItem value="ap-southeast">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => router.push("/")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Server"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Advanced Configuration</CardTitle>
                  <CardDescription>Configure detailed settings for your game server.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="server-name-adv">Server Name</Label>
                    <Input id="server-name-adv" placeholder="My Awesome Server" required/>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="game-type-adv">Game Type</Label>
                      <Select defaultValue="minecraft">
                        <SelectTrigger>
                          <SelectValue placeholder="Select game type"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minecraft">Minecraft</SelectItem>
                          <SelectItem value="csgo">Counter-Strike: Global Offensive</SelectItem>
                          <SelectItem value="rust">Rust</SelectItem>
                          <SelectItem value="terraria">Terraria</SelectItem>
                          <SelectItem value="valheim">Valheim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="game-version">Game Version</Label>
                      <Input id="game-version" placeholder="1.19.2" required/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-players-adv">Max Players</Label>
                      <Input id="max-players-adv" type="number" defaultValue="20" min="1" max="100" required/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-port-adv">Server Port</Label>
                      <Input id="server-port-adv" type="number" defaultValue="25565" min="1024" max="65535" required/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="server-memory">Server Memory (GB)</Label>
                      <Input id="server-memory" type="number" defaultValue="4" min="1" max="32" required/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpu-cores">CPU Cores</Label>
                      <Input id="cpu-cores" type="number" defaultValue="2" min="1" max="16" required/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="server-location-adv">Server Location</Label>
                    <Select defaultValue="us-east">
                      <SelectTrigger>
                        <SelectValue placeholder="Select server location"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-central">EU Central (Frankfurt)</SelectItem>
                        <SelectItem value="ap-southeast">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startup-command">Startup Command</Label>
                    <Input id="startup-command" placeholder="java -Xmx4G -Xms1G -jar server.jar nogui"/>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => router.push("/")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Server"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>);
}
