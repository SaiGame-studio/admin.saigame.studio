"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Progress } from "@/components/ui/progress"
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
  const [showCoinConfirm, setShowCoinConfirm] = useState(false)
  const { toast } = useToast()
  const isAtLimit = studioMembersLimit != null && studioMembersUsage != null && studioMembersUsage >= studioMembersLimit

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

    // If at limit, show coin cost confirmation first
    if (isAtLimit) {
      setShowCoinConfirm(true)
      return
    }

    await doAddMember()
  }

  async function doAddMember() {
    try {
      setLoading(true)
      await addMemberToTeam(teamId, userId.trim(), roleId)
      
      toast({
        title: "Success",
        description: "Member added successfully.",
      })
      
      // Refresh coin balance display (triggers float animation)
      window.dispatchEvent(new Event("wallet:refresh"))

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
    <>
      <AlertDialog open={showCoinConfirm} onOpenChange={setShowCoinConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm coin charge</AlertDialogTitle>
            <AlertDialogDescription>
              Your studio has reached its member limit. Adding this member will cost{" "}
              <span className="font-semibold text-foreground">50 🪙 coins</span>. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowCoinConfirm(false)
                await doAddMember()
              }}
            >
              Confirm & Pay 50 coins
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Member
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <SheetHeader>
            <SheetTitle>Add Member to Team</SheetTitle>
            <SheetDescription>
              Enter the user ID and select a role to add a new member to this team.
            </SheetDescription>
            {studioMembersLimit != null && studioMembersUsage != null && (
              <div className="mt-2 space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    Studio member slots
                  </span>
                  <span className={`font-semibold ${
                    studioMembersUsage >= studioMembersLimit
                      ? 'text-destructive'
                      : 'text-foreground'
                  }`}>
                    {studioMembersUsage} / {studioMembersLimit}
                    {studioMembersUsage >= studioMembersLimit && (
                      <span className="ml-1 font-normal">(limit reached)</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={Math.min((studioMembersUsage / studioMembersLimit) * 100, 100)}
                  className={`h-1.5 ${
                    studioMembersUsage >= studioMembersLimit
                      ? '[&>div]:bg-destructive'
                      : ''
                  }`}
                />
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  💡 Adding a member beyond the limit costs <span className="font-semibold text-foreground">50 coins</span> per slot.
                </p>
              </div>
            )}
          </SheetHeader>
          <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto">
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
          <SheetFooter className="pt-4">
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
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    </>
  )
}
