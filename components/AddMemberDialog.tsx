"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchRoles, addMemberToTeam } from "@/lib/team-api"
import type { Role } from "@/types/role"
import { Plus, Loader2, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddMemberDialogProps {
  teamId: string
  onMemberAdded?: () => void
  studioMembersUsage?: number
  studioMembersLimit?: number
}

export function AddMemberDialog({ teamId, onMemberAdded, studioMembersUsage, studioMembersLimit }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [roleId, setRoleId] = useState("")
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadRoles()
    }
  }, [open])

  async function loadRoles() {
    try {
      setRolesLoading(true)
      const data = await fetchRoles()
      setRoles(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load roles. Please try again."
      console.error("Failed to load roles:", err)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setRolesLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!userId.trim() || !roleId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await addMemberToTeam(teamId, userId.trim(), roleId)
      
      toast({
        title: "Success",
        description: "Member added successfully.",
      })
      
      setOpen(false)
      setUserId("")
      setRoleId("")
      
      if (onMemberAdded) {
        onMemberAdded()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add member. Please try again."
      console.error("Failed to add member:", err)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Member to Team</DialogTitle>
            <DialogDescription>
              Enter the user ID and select a role to add a new member to this team.
            </DialogDescription>
            {studioMembersLimit != null && studioMembersUsage != null && (
              <div className={`flex items-center gap-1.5 text-xs rounded-md px-3 py-2 mt-1 border ${
                studioMembersUsage >= studioMembersLimit
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                  : "text-muted-foreground bg-muted/40 border-border"
              }`}>
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Studio member slots: <span className="font-semibold">{studioMembersUsage} / {studioMembersLimit}</span>
                  {studioMembersUsage >= studioMembersLimit && (
                    <span className="ml-1 font-medium">&mdash; limit reached</span>
                  )}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">studio level</span>
              </div>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user-id">User ID</Label>
              <Input
                id="user-id"
                placeholder="Enter user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={roleId} onValueChange={setRoleId} disabled={loading || rolesLoading}>
                <SelectTrigger id="role">
                  <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name}
                      {role.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {role.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !userId.trim() || !roleId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
