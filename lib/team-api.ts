import type { Team, TeamMember } from "@/types/team"
import type { Role } from "@/types/role"
import type { Game } from "@/types/game"
import { api } from "@/lib/api-client"

/**
 * Creates a new team in a studio
 */
export async function createTeam(
    studioId: string,
    teamData: { name: string; description?: string }
): Promise<Team> {
    return await api.post(`/api/v1/studios/${studioId}/teams`, teamData)
}

/**
 * Fetches details of a specific team
 */
export async function fetchTeamDetails(teamId: string): Promise<Team> {
    return await api.get(`/api/v1/teams/${teamId}`)
}

/**
 * Updates a team
 */
export async function updateTeam(
    teamId: string,
    teamData: { name?: string; description?: string }
): Promise<Team> {
    return await api.put(`/api/v1/teams/${teamId}`, teamData)
}

/**
 * Fetches all members of a specific team
 */
export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
    const data = await api.get(`/api/v1/teams/${teamId}/members`)
    return Array.isArray(data) ? data : []
}

/**
 * Fetches all available roles
 */
export async function fetchRoles(): Promise<Role[]> {
    const data = await api.get("/api/v1/roles")
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
    return await api.post(`/api/v1/teams/${teamId}/members`, {
        user_id: userId,
        role_id: roleId,
    })
}

/**
 * Updates a member's role in a team
 */
export async function updateMemberRole(
    teamId: string,
    memberId: string,
    roleId: string
): Promise<TeamMember> {
    return await api.put(`/api/v1/teams/${teamId}/members/${memberId}`, {
        role_id: roleId,
    })
}

/**
 * Removes a member from a team
 */
export async function removeMemberFromTeam(
    teamId: string,
    memberId: string
): Promise<void> {
    await api.delete(`/api/v1/teams/${teamId}/members/${memberId}`)
}

/**
 * Fetches all games assigned to a specific team
 */
export async function fetchTeamGames(teamId: string): Promise<Game[]> {
    const data = await api.get(`/api/v1/teams/${teamId}/games`)
    return Array.isArray(data) ? data : []
}

/**
 * Assigns multiple games to a team
 */
export async function assignGamesToTeam(
    teamId: string,
    gameIds: string[]
): Promise<void> {
    await api.post(`/api/v1/teams/${teamId}/games/batch`, {
        game_ids: gameIds,
    })
}

/**
 * Unassigns a game from a team
 */
export async function unassignGameFromTeam(
    teamId: string,
    gameId: string
): Promise<void> {
    await api.delete(`/api/v1/teams/${teamId}/games/${gameId}`)
}

/**
 * Deletes a team permanently
 */
export async function deleteTeam(teamId: string): Promise<void> {
    await api.delete(`/api/v1/teams/${teamId}`)
}
