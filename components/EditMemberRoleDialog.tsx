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
import { Label } from "@/components/ui/label"
import { fetchRoles, updateMemberRole } from "@/lib/team-api"
import type { Role } from "@/types/role"
import type { TeamMember } from "@/types/team"
import { Pencil, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EditMemberRoleDialogProps {
  teamId: string
  member: TeamMember
  onRoleUpdated?: () => void
}

export function EditMemberRoleDialog({ teamId, member, onRoleUpdated }: EditMemberRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [roleId, setRoleId] = useState(member.role_id)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadRoles()
      setRoleId(member.role_id)
    }
  }, [open, member.role_id])

  async function loadRoles() {
    try {
      setRolesLoading(true)
      const data = await fetchRoles()
      setRoles(data)
    } catch (err) {
      console.error("Failed to load roles:", err)
      toast({
        title: "Error",
        description: "Failed to load roles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRolesLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!roleId) {
      toast({
        title: "Validation Error",
        description: "Please select a role.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      await updateMemberRole(teamId, member.id, roleId)
      
      toast({
        title: "Success",
        description: "Member role updated successfully.",
      })
      
      setOpen(false)
      
      if (onRoleUpdated) {
        onRoleUpdated()
      }
    } catch (err) {
      console.error("Failed to update member role:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update role. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {member.display_name || member.username || "this member"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <Button type="submit" disabled={loading || !roleId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
