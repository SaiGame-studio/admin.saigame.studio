export type FeatureRequestStatus = "voting" | "approved" | "in_progress" | "done" | "rejected"

export interface FeatureRequest {
  id: string
  title: string
  description: string
  status: FeatureRequestStatus
  vote_count: number
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  feature_request_id: string
  reviewer_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface ReviewListResponse {
  items: Review[]
  page: number
  size: number
  total: number
}

export interface FeatureRequestListResponse {
  items: FeatureRequest[]
  page: number
  size: number
  total: number
}
