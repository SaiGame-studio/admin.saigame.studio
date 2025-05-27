import { ApiResponse } from "@/types/game";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Lấy danh sách user profiles của 1 game
export async function getGameUserProfiles(gameId: string, page = 1, perPage = 10) {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Authentication required");
  }
  try {
    const response = await fetch(`${API_URL}/api/games/${gameId}/users/profiles?page=${page}&per_page=${perPage}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Error fetching user profiles: ${response.status}`);
    }
    const data: ApiResponse<any> = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch user profiles:", error);
    throw error;
  }
} 