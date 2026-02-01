import type { Team, TeamMember } from "@/types/team"
import type { Role } from "@/types/role"

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

/**
 * Fetches all members of a specific team
 */
export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch team members: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
}

/**
 * Fetches all available roles
 */
export async function fetchRoles(): Promise<Role[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/roles`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch roles: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
}

/**
 * Adds a member to a team
 */
export async function addMemberToTeam(
    teamId: string, 
    userId: string, 
    roleId: string
): Promise<TeamMember> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            user_id: userId,
            role_id: roleId,
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to add member: ${response.status}`)
    }

    const data = await response.json()
    return data
}

/**
 * Updates a member's role in a team
 */
export async function updateMemberRole(
    teamId: string,
    memberId: string,
    roleId: string
): Promise<TeamMember> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members/${memberId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            role_id: roleId,
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to update member role: ${response.status}`)
    }

    const data = await response.json()
    return data
}
