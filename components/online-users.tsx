"use client";
import { useState } from "react";
import { Ban, Crown, MoreHorizontal, Shield, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const users = [
    {
        id: 1,
        name: "xXGamerXx",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        server: "Minecraft Survival",
        status: "online",
        lastActive: "Now",
    },
    {
        id: 2,
        name: "SkyWarrior",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "moderator",
        server: "CS:GO Competitive",
        status: "online",
        lastActive: "Now",
    },
    {
        id: 3,
        name: "DragonSlayer",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "user",
        server: "Rust Community",
        status: "offline",
        lastActive: "32 minutes ago",
    },
    {
        id: 4,
        name: "NightWolf",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "user",
        server: "Minecraft Survival",
        status: "online",
        lastActive: "Now",
    },
    {
        id: 5,
        name: "PixelPirate",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "moderator",
        server: "Terraria Adventure",
        status: "offline",
        lastActive: "2 hours ago",
    },
];
export function OnlineUsers() {
    const [searchQuery, setSearchQuery] = useState("");
    const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.server.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase()));
    return (<div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-sm"/>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (<TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name}/>
                      <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.role === "admin" && <Crown className="h-4 w-4 text-yellow-500"/>}
                    {user.role === "moderator" && <Shield className="h-4 w-4 text-blue-500"/>}
                    {user.role === "user" && <User className="h-4 w-4 text-gray-500"/>}
                    <span className="capitalize">{user.role}</span>
                  </div>
                </TableCell>
                <TableCell>{user.server}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${user.status === "online" ? "bg-green-500" : "bg-gray-300"}`}/>
                    <span className="capitalize">{user.status}</span>
                  </div>
                </TableCell>
                <TableCell>{user.lastActive}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4"/>
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View profile</DropdownMenuItem>
                      <DropdownMenuItem>Send message</DropdownMenuItem>
                      <DropdownMenuItem>Change role</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Ban className="mr-2 h-4 w-4"/>
                        Ban user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>))}
          </TableBody>
        </Table>
      </div>
    </div>);
}
