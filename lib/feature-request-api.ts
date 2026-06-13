import { api } from "./api-client";
import { FeatureRequest, FeatureRequestListResponse, Review, ReviewListResponse, FeatureRequestStatus } from "@/types/feature-request";
export async function getFeatureRequests(page = 1, size = 20, status?: string): Promise<FeatureRequestListResponse> {
    let url = `/api/v1/feature-requests?page=${page}&size=${size}`;
    if (status) {
        url += `&status=${status}`;
    }
    return await api.get(url);
}
export async function submitFeatureRequest(title: string, description: string): Promise<FeatureRequest> {
    return await api.post("/api/v1/feature-requests", { title, description });
}
export async function upvoteFeatureRequest(id: string): Promise<{
    vote_count: number;
}> {
    return await api.post(`/api/v1/feature-requests/${id}/vote`);
}
export async function submitReview(id: string, content: string): Promise<Review> {
    return await api.put(`/api/v1/feature-requests/${id}/review`, { content });
}
export async function getFeatureReviews(id: string, page = 1, size = 20): Promise<ReviewListResponse> {
    return await api.get(`/api/v1/feature-requests/${id}/reviews?page=${page}&size=${size}`);
}
export async function getMyFeatureReview(id: string): Promise<Review> {
    return await api.get(`/api/v1/feature-requests/${id}/review`);
}
export async function updateFeatureStatus(id: string, status: FeatureRequestStatus): Promise<void> {
    await api.patch(`/api/v1/admin/feature-requests/${id}/status`, { status });
}
export async function updateFeatureRequest(id: string, data: {
    title?: string;
    description?: string;
}): Promise<FeatureRequest> {
    return await api.patch(`/api/v1/feature-requests/${id}`, data);
}
