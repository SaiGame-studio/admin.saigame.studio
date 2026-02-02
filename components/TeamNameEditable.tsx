import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Pencil, Save, X } from "lucide-react"
import { updateTeam } from "@/lib/team-api"

interface TeamNameEditableProps {
  team: { id: string; name: string }
  teamId: string
  onNameUpdate: (newName: string) => void
}

export default function TeamNameEditable({ team, teamId, onNameUpdate }: TeamNameEditableProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(team.name)
  }, [team.name])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateTeam(teamId, { name })
      onNameUpdate(name)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || "Failed to update team name")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-64 h-9 px-2 text-3xl font-bold"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setEditing(false)
              setName(team.name)
            }}
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-3xl font-bold">{team.name}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

interface TeamDescriptionEditableProps {
  team: { id: string; description?: string }
  teamId: string
  onDescriptionUpdate: (newDescription: string) => void
}

export function TeamDescriptionEditable({ team, teamId, onDescriptionUpdate }: TeamDescriptionEditableProps) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(team.description || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDescription(team.description || "")
  }, [team.description])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateTeam(teamId, { description })
      onDescriptionUpdate(description)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || "Failed to update team description")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group flex items-center gap-2 mt-1">
      {editing ? (
        <>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add team description..."
            className="w-96 h-8 px-2 text-sm"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setEditing(false)
              setDescription(team.description || "")
            }}
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">
            {description || "Add team description..."}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}
