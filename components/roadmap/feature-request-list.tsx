"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ThumbsUp, MessageSquare, Plus, Loader2, RefreshCw, User, Calendar, ShieldCheck, Pencil } from "lucide-react"
import { useFeatureRequests } from "@/hooks/use-feature-requests"
import { useAuth } from "@/contexts/auth-context"
import { FeatureRequest, FeatureRequestStatus, Review } from "@/types/feature-request"
import { getFeatureReviews, getMyFeatureReview } from "@/lib/feature-request-api"
import { useCapabilities } from "@/hooks/use-capabilities"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/useTranslation"

import { cn } from "@/lib/utils"

const getStatusConfig = (t: (key: string) => string): Record<FeatureRequestStatus, { label: string; colorClass: string; bgClass: string; dotClass: string }> => ({
  voting: { 
    label: t('roadmap.featureRequests.statusVoting'), 
    colorClass: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-900", 
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    dotClass: "bg-blue-500"
  },
  approved: { 
    label: t('roadmap.featureRequests.statusApproved'), 
    colorClass: "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900", 
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    dotClass: "bg-emerald-500"
  },
  in_progress: { 
    label: t('roadmap.featureRequests.statusInProgress'), 
    colorClass: "text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-900", 
    bgClass: "bg-indigo-50 dark:bg-indigo-950/30",
    dotClass: "bg-indigo-500"
  },
  done: { 
    label: t('roadmap.featureRequests.statusDone'), 
    colorClass: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-900 font-black", 
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    dotClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
  },
  rejected: { 
    label: t('roadmap.featureRequests.statusRejected'), 
    colorClass: "text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-900", 
    bgClass: "bg-rose-50 dark:bg-rose-950/30",
    dotClass: "bg-rose-500"
  },
})

interface FeatureRequestCardProps {
  request: FeatureRequest
  isExpanded: boolean
  isSuperAdmin: boolean
  onToggle: () => void
  onUpvote: (id: string, e: React.MouseEvent) => void
  onPostReview: (id: string, content: string) => Promise<boolean>
  onUpdateStatus: (id: string, status: FeatureRequestStatus) => Promise<boolean>
  isOwner?: boolean
  onUpdate?: (id: string, title: string, description: string) => Promise<boolean>
}

function FeatureRequestCard({ 
  request, 
  isExpanded, 
  isSuperAdmin,
  onToggle, 
  onUpvote, 
  onPostReview,
  onUpdateStatus,
  isOwner,
  onUpdate
}: FeatureRequestCardProps) {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [reviewContent, setReviewContent] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [hasExistingReview, setHasExistingReview] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  
  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(request.title)
  const [editDescription, setEditDescription] = useState(request.description)
  const [isUpdating, setIsUpdating] = useState(false)

  const statusConfig = getStatusConfig(t)

  const fetchReviewsAndMyReview = async () => {
    setIsLoadingReviews(true)
    try {
      const [listRes, myReviewRes] = await Promise.allSettled([
        getFeatureReviews(request.id),
        getMyFeatureReview(request.id)
      ])

      if (listRes.status === "fulfilled") {
        setReviews(listRes.value.items)
      }

      if (myReviewRes.status === "fulfilled" && myReviewRes.value) {
        setReviewContent(myReviewRes.value.content)
        setHasExistingReview(true)
      } else {
        setReviewContent("") // Clear if no review found
        setHasExistingReview(false)
      }
    } catch (error) {
      console.error("Failed to fetch reviews data:", error)
    } finally {
      setIsLoadingReviews(false)
    }
  }

  useEffect(() => {
    if (isExpanded) {
      fetchReviewsAndMyReview()
    }
  }, [isExpanded])

  const handlePostReview = async () => {
    if (!reviewContent.trim()) return
    setIsSubmittingReview(true)
    const success = await onPostReview(request.id, reviewContent)
    if (success) {
      fetchReviewsAndMyReview() // Refresh the list
    }
    setIsSubmittingReview(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    await onUpdateStatus(request.id, newStatus as FeatureRequestStatus)
    setIsUpdatingStatus(false)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onUpdate || !editTitle.trim() || !editDescription.trim()) return
    
    setIsUpdating(true)
    const success = await onUpdate(request.id, editTitle, editDescription)
    if (success) {
      setIsEditDialogOpen(false)
    }
    setIsUpdating(false)
  }

  const currentStatus = statusConfig[request.status]

  return (
    <Card 
      className={`overflow-hidden border-primary/10 hover:border-primary/30 transition-all cursor-pointer ${isExpanded ? 'ring-1 ring-primary/20 bg-muted/5' : ''}`}
      onClick={onToggle}
    >
      <div className="flex p-3 gap-3 sm:p-4 sm:gap-4">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-11 flex-col gap-0.5 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all sm:h-12 sm:w-12"
            onClick={(e) => onUpvote(request.id, e)}
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="text-xs font-bold">{request.vote_count}</span>
          </Button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="font-bold text-base leading-tight truncate">{request.title}</h3>
              {isOwner && (
                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] uppercase font-bold bg-primary/10 text-primary border-primary/20 shrink-0">
                  {t('roadmap.featureRequests.myRequestBadge')}
                </Badge>
              )}
              {(isSuperAdmin || (isOwner && request.status === 'voting')) && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditTitle(request.title)
                        setEditDescription(request.description)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={handleEditSubmit}>
                      <DialogHeader>
                        <DialogTitle>{t('roadmap.featureRequests.editTitle')}</DialogTitle>
                        <DialogDescription>
                          {isSuperAdmin && !isOwner 
                            ? t('roadmap.featureRequests.editDescAdmin')
                            : t('roadmap.featureRequests.editDescUser')
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="edit-title" className="text-sm font-medium">{t('roadmap.featureRequests.formTitle')}</label>
                          <Input 
                            id="edit-title" 
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="edit-description" className="text-sm font-medium">{t('roadmap.featureRequests.formDesc')}</label>
                            <span className={cn(
                              "text-[10px] font-mono",
                              editDescription.length >= 700 ? "text-destructive font-bold" : "text-muted-foreground"
                            )}>
                              {editDescription.length} / 700
                            </span>
                          </div>
                          <Textarea 
                            id="edit-description" 
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value.slice(0, 700))}
                            required
                            rows={4}
                            placeholder={t('roadmap.featureRequests.formDescPlaceholder')}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('roadmap.featureRequests.btnCancel')}</Button>
                        <Button type="submit" disabled={isUpdating}>
                          {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          {t('roadmap.featureRequests.btnSaveChanges')}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {isSuperAdmin ? (
                <Select
                  value={request.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className={cn(
                    "h-7 min-w-[120px] text-[10px] uppercase font-bold px-2 py-0 border transition-colors",
                    currentStatus.colorClass,
                    currentStatus.bgClass
                  )}>
                    {isUpdatingStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                    <SelectValue placeholder={t('roadmap.featureRequests.statusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([val, { label, colorClass, dotClass }]) => (
                      <SelectItem key={val} value={val} className="text-[10px] uppercase font-bold">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
                          <span className={colorClass}>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge 
                  variant="outline" 
                  className={cn("capitalize font-bold border", currentStatus.colorClass, currentStatus.bgClass)}
                >
                  {currentStatus.label}
                </Badge>
              )}
            </div>
          </div>

          <p className={`text-sm text-muted-foreground mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {request.description}
          </p>
          
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-6">
                {/* Review Form */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {hasExistingReview ? t('roadmap.featureRequests.reviewSectionTitleUpdate') : t('roadmap.featureRequests.reviewSectionTitleNew')}
                  </label>
                  <Textarea 
                    placeholder={t('roadmap.featureRequests.reviewPlaceholder')}
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="min-h-[80px] resize-none text-sm bg-muted/30"
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      disabled={!reviewContent.trim() || isSubmittingReview}
                      onClick={handlePostReview}
                      className="gap-2"
                    >
                      {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      {hasExistingReview ? t('roadmap.featureRequests.btnUpdateReview') : t('roadmap.featureRequests.btnPostReview')}
                    </Button>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {t('roadmap.featureRequests.reviewsCount')} ({reviews.length})
                    {isLoadingReviews && <Loader2 className="h-3 w-3 animate-spin" />}
                  </h4>
                  
                  {reviews.length === 0 && !isLoadingReviews ? (
                    <p className="text-xs text-muted-foreground italic py-2">{t('roadmap.featureRequests.noReviewsMsg')}</p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-muted/30 rounded-lg p-3 border border-border/20">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold text-foreground/80 truncate max-w-[100px]">
                              {t('roadmap.featureRequests.userSuffix')} {review.reviewer_id.slice(0, 6)}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {review.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-1">
            <span>{t('roadmap.featureRequests.requestedOn')} {new Date(request.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1 hover:text-primary transition-colors">
              {isExpanded ? t('roadmap.featureRequests.viewDetailsActive') : t('roadmap.featureRequests.viewDetailsInactive')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function FeatureRequestList() {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  const { featureRequests, isLoading, upvote, submit, postReview, updateStatus, update, refresh } = useFeatureRequests()
  const { is_super_admin } = useCapabilities()
  const { user } = useAuth()
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingUpvoteId, setPendingUpvoteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newDescription) return
    
    const success = await submit(newTitle, newDescription)
    if (success) {
      setNewTitle("")
      setNewDescription("")
      setIsDialogOpen(false)
    }
  }

  const handleUpvoteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPendingUpvoteId(id)
    setIsConfirmOpen(true)
  }

  const confirmUpvote = async () => {
    if (pendingUpvoteId) {
      await upvote(pendingUpvoteId)
      setPendingUpvoteId(null)
      setIsConfirmOpen(false)
    }
  }

  const handleCardPostReview = async (id: string, content: string) => {
    const review = await postReview(id, content)
    return !!review
  }

  const handleToggleExpand = (id: string) => {
    setExpandedId(prevId => prevId === id ? null : id)
  }

  const handleUpdateStatus = async (id: string, status: FeatureRequestStatus) => {
    return await updateStatus(id, status)
  }

  const handleUpdate = async (id: string, title: string, description: string) => {
    return await update(id, title, description)
  }

  // Filter requests for each tab
  const votingRequests = featureRequests.filter(req => 
    req.status === 'voting' || req.status === 'approved'
  )
  const pastRequests = featureRequests.filter(req => 
    req.status === 'in_progress' || req.status === 'done' || req.status === 'rejected'
  )

  const renderList = (requests: FeatureRequest[], emptyMsg: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      )
    }

    if (requests.length === 0) {
      return (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-10" />
            <p className="text-sm font-medium">{emptyMsg}</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4">
        {requests.map((request) => (
          <FeatureRequestCard 
            key={request.id} 
            request={request} 
            isExpanded={expandedId === request.id}
            isSuperAdmin={is_super_admin}
            onToggle={() => handleToggleExpand(request.id)}
            onUpvote={handleUpvoteClick}
            onPostReview={handleCardPostReview}
            onUpdateStatus={handleUpdateStatus}
            isOwner={user?.id === request.submitted_by}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('roadmap.featureRequests.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('roadmap.featureRequests.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9" 
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 h-9">
                <Plus className="h-4 w-4" />
                {t('roadmap.featureRequests.requestFeature')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{t('roadmap.featureRequests.submitTitle')}</DialogTitle>
                <DialogDescription>
                  {t('roadmap.featureRequests.submitDescPart1')}
                  <span className="font-bold text-foreground mx-1 text-yellow-500 underline decoration-yellow-500/30 underline-offset-4">🪙 {t('roadmap.featureRequests.submitDescPart2')}</span>
                  {t('roadmap.featureRequests.submitDescPart3')}
                </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">{t('roadmap.featureRequests.formTitle')}</label>
                    <Input 
                      id="title" 
                      placeholder={t('roadmap.featureRequests.formTitlePlaceholder')}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="description" className="text-sm font-medium">{t('roadmap.featureRequests.formDesc')}</label>
                      <span className={cn(
                        "text-[10px] font-mono",
                        newDescription.length >= 700 ? "text-destructive font-bold" : "text-muted-foreground"
                      )}>
                        {newDescription.length} / 700
                      </span>
                    </div>
                    <Textarea 
                      id="description" 
                      placeholder={t('roadmap.featureRequests.formDescPlaceholder')}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value.slice(0, 700))}
                      required
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('roadmap.featureRequests.btnCancel')}</Button>
                  <Button type="submit">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t('roadmap.featureRequests.btnSubmit')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roadmap.featureRequests.confirmUpvoteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('roadmap.featureRequests.confirmUpvoteDescPart1')}
              <span className="font-bold text-foreground mx-1 text-yellow-500">🪙 {t('roadmap.featureRequests.confirmUpvoteDescPart2')}</span>
              {t('roadmap.featureRequests.confirmUpvoteDescPart3')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUpvoteId(null)}>{t('roadmap.featureRequests.btnCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpvote}>
              {t('roadmap.featureRequests.btnConfirmPay')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="voting" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
          <TabsTrigger value="voting" className="relative">
            {t('roadmap.featureRequests.tabVoting')}
            {!isLoading && votingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1 py-0 min-w-[1.2rem] h-4 flex items-center justify-center text-[10px] bg-primary/10 text-primary border-none">
                {votingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="voted">
            {t('roadmap.featureRequests.tabVoted')}
            {!isLoading && pastRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1 py-0 min-w-[1.2rem] h-4 flex items-center justify-center text-[10px]">
                {pastRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="voting" className="m-0 focus-visible:ring-0">
          {renderList(votingRequests, t('roadmap.featureRequests.noActiveFeatures'))}
        </TabsContent>
        <TabsContent value="voted" className="m-0 focus-visible:ring-0">
          {renderList(pastRequests, t('roadmap.featureRequests.noHistoricalFeatures'))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
