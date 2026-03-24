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
import { useTranslation } from "@/lib/i18n/use-translation"

interface AddMemberDialogProps {
  teamId: string
  onMemberAdded?: () => void
  studioMembersUsage?: number
  studioMembersLimit?: number
}

export function AddMemberDialog({ teamId, onMemberAdded, studioMembersUsage, studioMembersLimit }: AddMemberDialogProps) {
  const { t } = useTranslation()
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
      const errorMessage = err instanceof Error ? err.message : t('team.loadRolesError')
      console.error("Failed to load roles:", err)

      toast({
        title: t('common.error'),
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
        title: t('team.validationError'),
        description: t('team.addMemberFillAll'),
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
        title: t('common.success'),
        description: t('team.addMemberSuccess'),
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
      const errorMessage = err instanceof Error ? err.message : t('studio.removeMemberError')
      console.error("Failed to add member:", err)

      toast({
        title: t('common.error'),
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
            <AlertDialogTitle>{t('team.confirmCoinTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('team.confirmCoinDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowCoinConfirm(false)
                await doAddMember()
              }}
            >
              {t('team.confirmCoinPay')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('team.addMember')}
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <SheetHeader>
            <SheetTitle>{t('team.addMemberTitle')}</SheetTitle>
            <SheetDescription>
              {t('team.addMemberDesc')}
            </SheetDescription>
            {studioMembersLimit != null && studioMembersUsage != null && (
              <div className="mt-2 space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {t('team.studioMemberSlots')}
                  </span>
                  <span className={`font-semibold ${
                    studioMembersUsage >= studioMembersLimit
                      ? 'text-destructive'
                      : 'text-foreground'
                  }`}>
                    {studioMembersUsage} / {studioMembersLimit}
                    {studioMembersUsage >= studioMembersLimit && (
                      <span className="ml-1 font-normal">{t('team.limitReached')}</span>
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
                  💡 {t('team.memberSlotCostHint')}
                </p>
              </div>
            )}
          </SheetHeader>
          <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="user-id">{t('team.userIdLabel')}</Label>
              <Input
                id="user-id"
                placeholder={t('team.userIdPlaceholder')}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">{t('team.roleLabel')}</Label>
              <Select value={roleId} onValueChange={setRoleId} disabled={loading || rolesLoading}>
                <SelectTrigger id="role">
                  <SelectValue placeholder={rolesLoading ? t('team.loadingRoles') : t('team.selectRolePlaceholder')} />
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
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !userId.trim() || !roleId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('team.addMember')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    </>
  )
}
