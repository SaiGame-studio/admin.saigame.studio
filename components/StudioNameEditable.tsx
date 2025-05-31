import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import { updateStudio } from "@/lib/studio-api";
import { updateGame } from "@/lib/game-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface StudioNameEditableProps {
  studio: any;
  studioId: string;
  onNameUpdate: (newName: string) => void;
}

export default function StudioNameEditable({ studio, studioId, onNameUpdate }: StudioNameEditableProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(studio.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(studio.name);
  }, [studio.name]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateStudio(studioId, { name });
      onNameUpdate(name);
      setEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to update studio name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-48 h-8 px-2 text-lg font-bold"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(studio.name); }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-3xl font-bold">{studio.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

interface GameNameEditableProps {
  game: any;
  gameId: string;
  onNameUpdate: (newName: string) => void;
}

export function GameNameEditable({ game, gameId, onNameUpdate }: GameNameEditableProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(game.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(game.name);
  }, [game.name]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateGame(gameId, { name, status: game.status });
      onNameUpdate(name);
      setEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to update game name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-48 h-8 px-2 text-lg font-bold"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(game.name); }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-3xl font-bold">{game.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

interface GameStatusEditableProps {
  game: any;
  gameId: string;
  onStatusUpdate: (newStatus: string) => void;
}

export function GameStatusEditable({ game, gameId, onStatusUpdate }: GameStatusEditableProps) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(game.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(game.status);
  }, [game.status]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateGame(gameId, { name: game.name, status });
      onStatusUpdate(status);
      setEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to update game status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group flex items-center gap-2">
      {editing ? (
        <>
          <Select value={status} onValueChange={setStatus} disabled={loading}>
            <SelectTrigger className="w-36 h-8 text-lg font-bold">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="alpha">Alpha</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setStatus(game.status); }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <Badge className={`mt-1`}>{game.status}</Badge>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
} 