import { useState, useEffect, useCallback } from "react"
import { FeatureRequest, FeatureRequestListResponse, Review, FeatureRequestStatus } from "@/types/feature-request"
import { getFeatureRequests, upvoteFeatureRequest, submitFeatureRequest, submitReview, updateFeatureStatus, updateFeatureRequest } from "@/lib/feature-request-api"
import { toast } from "@/hooks/use-toast"

export function useFeatureRequests(initialSize = 100) {
  const [data, setData] = useState<FeatureRequestListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRequests = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const response = await getFeatureRequests(page, initialSize)
      setData(response)
    } catch (error) {
      console.error("Failed to fetch feature requests:", error)
    } finally {
      setIsLoading(false)
    }
  }, [initialSize])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const upvote = async (id: string) => {
    try {
      const response = await upvoteFeatureRequest(id)
      
      // Refresh coin balance display (triggers float animation)
      window.dispatchEvent(new Event("wallet:refresh"))
      
      // Optimistic update
      if (data) {
        setData({
          ...data,
          items: data.items.map(item => 
            item.id === id ? { ...item, vote_count: response.vote_count } : item
          )
        })
      }
      
      toast({
        title: "Success",
        description: "Your vote has been counted!",
      })
    } catch (error) {
      console.error("Failed to upvote:", error)
    }
  }

  const submit = async (title: string, description: string) => {
    setIsSubmitting(true)
    try {
      const newRequest = await submitFeatureRequest(title, description)
      
      // Refresh coin balance display (triggers float animation)
      window.dispatchEvent(new Event("wallet:refresh"))
      
      // Add to list and refetch to be sure
      if (data) {
        setData({
          ...data,
          items: [newRequest, ...data.items],
          total: data.total + 1
        })
      }
      
      toast({
        title: "Request Submitted",
        description: "Thank you for your feedback!",
      })
      return true
    } catch (error) {
      console.error("Failed to submit request:", error)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const postReview = async (id: string, content: string): Promise<Review | null> => {
    try {
      const review = await submitReview(id, content)
      toast({
        title: "Review Posted",
        description: "Your review has been successfully submitted.",
      })
      return review
    } catch (error) {
      console.error("Failed to post review:", error)
      return null
    }
  }

  const updateStatus = async (id: string, status: FeatureRequestStatus) => {
    try {
      await updateFeatureStatus(id, status)
      
      // Update locally without full object
      if (data) {
        setData({
          ...data,
          items: data.items.map(item => 
            item.id === id ? { ...item, status } : item
          )
        })
      }
      
      toast({
        title: "Status Updated",
        description: `Feature status changed to ${status}.`,
      })
      return true
    } catch (error) {
      console.error("Failed to update status:", error)
      toast({
        title: "Update Failed",
        description: "Could not update feature status. Make sure you have admin permissions.",
        variant: "destructive",
      })
      return false
    }
  }

  const update = async (id: string, title?: string, description?: string) => {
    try {
      const updated = await updateFeatureRequest(id, { title, description })
      
      // Update locally
      if (data) {
        setData({
          ...data,
          items: data.items.map(item => 
            item.id === id ? { ...item, ...updated } : item
          )
        })
      }
      
      toast({
        title: "Success",
        description: "Feature request updated successfully.",
      })
      return true
    } catch (error) {
      console.error("Failed to update feature request:", error)
      toast({
        title: "Update Failed",
        description: "Could not update feature request. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  return {
    featureRequests: data?.items || [],
    total: data?.total || 0,
    isLoading,
    isSubmitting,
    upvote,
    submit,
    postReview,
    updateStatus,
    update,
    refresh: fetchRequests
  }

}
