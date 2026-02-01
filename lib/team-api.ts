import type { Team } from "@/types/team"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Fetches details of a specific team
 */
export async function fetchTeamDetails(teamId: string): Promise<Team> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch team details: ${response.status}`)
    }

    const data = await response.json()
    return data
}
