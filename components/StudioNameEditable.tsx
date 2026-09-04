import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
        }
        catch (e: any) {
            setError(e.message || "Failed to update studio name");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="group flex items-center gap-2">
      {editing ? (<>
          <Input value={name} onChange={e => setName(e.target.value)} className="w-48 h-8 px-2 text-lg font-bold" disabled={loading}/>
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4"/>
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(studio.name); }} disabled={loading}>
            <X className="w-4 h-4"/>
          </Button>
        </>) : (<>
          <span className="text-3xl font-bold">{studio.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4"/>
          </Button>
        </>)}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>);
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
            await updateGame(gameId, { name });
            onNameUpdate(name);
            setEditing(false);
        }
        catch (e: any) {
            setError(e.message || "Failed to update game name");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="group flex items-center gap-2 flex-wrap">
      {editing ? (<>
          <Input value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-0 h-8 px-2 text-lg font-bold sm:w-48 sm:flex-none" disabled={loading}/>
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4"/>
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(game.name); }} disabled={loading}>
            <X className="w-4 h-4"/>
          </Button>
        </>) : (<>
          <span className="text-2xl font-bold break-words min-w-0 sm:text-3xl">{game.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Pencil className="w-4 h-4"/>
          </Button>
        </>)}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>);
}
interface GameDescriptionEditableProps {
    game: any;
    gameId: string;
    onDescriptionUpdate: (newDescription: string) => void;
}
export function GameDescriptionEditable({ game, gameId, onDescriptionUpdate }: GameDescriptionEditableProps) {
    const [editing, setEditing] = useState(false);
    const [description, setDescription] = useState(game.description || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        setDescription(game.description || "");
    }, [game.description]);
    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            await updateGame(gameId, { description });
            onDescriptionUpdate(description);
            setEditing(false);
        }
        catch (e: any) {
            setError(e.message || "Failed to update game description");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="group mt-1 space-y-1">
      <div id={`game-description-editable-header-${gameId}`} className="flex items-center gap-2">
        <h3 id={`game-description-editable-label-${gameId}`} className="text-sm font-medium">Description</h3>
        {editing ? (<>
            <Button id={`game-description-editable-save-${gameId}`} size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-7 w-7">
              <Save id={`game-description-editable-save-icon-${gameId}`} className="w-4 h-4"/>
            </Button>
            <Button id={`game-description-editable-cancel-${gameId}`} size="icon" variant="ghost" onClick={() => { setEditing(false); setDescription(game.description || ""); }} disabled={loading} className="h-7 w-7">
              <X id={`game-description-editable-cancel-icon-${gameId}`} className="w-4 h-4"/>
            </Button>
          </>) : (
            <Button id={`game-description-editable-edit-${gameId}`} size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <Pencil id={`game-description-editable-edit-icon-${gameId}`} className="w-4 h-4"/>
            </Button>
          )}
      </div>
      {editing ? (
          <Textarea id={`game-description-editable-input-${gameId}`} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add game description..." className="min-h-40 resize-y text-sm" disabled={loading}/>
        ) : (
          <span id={`game-description-editable-value-${gameId}`} className="block text-sm text-muted-foreground break-words min-w-0">
            {description || "Add game description..."}
          </span>
        )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>);
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
            await updateGame(gameId, { status });
            onStatusUpdate(status);
            setEditing(false);
        }
        catch (e: any) {
            setError(e.message || "Failed to update game status");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div id={`game-status-editable-${gameId}`} className="group flex items-center gap-2">
      {editing ? (<>
          <Select value={status} onValueChange={setStatus} disabled={loading}>
            <SelectTrigger id={`game-status-editable-trigger-${gameId}`} className="w-36 h-8 text-sm">
              <SelectValue id={`game-status-editable-value-${gameId}`} placeholder="Select status"/>
            </SelectTrigger>
            <SelectContent id={`game-status-editable-content-${gameId}`}>
              <SelectItem id={`game-status-editable-option-development-${gameId}`} value="development">Development</SelectItem>
              <SelectItem id={`game-status-editable-option-alpha-${gameId}`} value="alpha">Alpha</SelectItem>
              <SelectItem id={`game-status-editable-option-beta-${gameId}`} value="beta">Beta</SelectItem>
              <SelectItem id={`game-status-editable-option-released-${gameId}`} value="released">Released</SelectItem>
              <SelectItem id={`game-status-editable-option-archived-${gameId}`} value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button id={`game-status-editable-save-${gameId}`} size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save id={`game-status-editable-save-icon-${gameId}`} className="w-4 h-4"/>
          </Button>
          <Button id={`game-status-editable-cancel-${gameId}`} size="icon" variant="ghost" onClick={() => { setEditing(false); setStatus(game.status); }} disabled={loading}>
            <X id={`game-status-editable-cancel-icon-${gameId}`} className="w-4 h-4"/>
          </Button>
        </>) : (<>
          <Badge id={`game-status-editable-badge-${gameId}`} className={`mt-1`}>{game.status}</Badge>
          <Button id={`game-status-editable-edit-${gameId}`} size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil id={`game-status-editable-edit-icon-${gameId}`} className="w-4 h-4"/>
          </Button>
        </>)}
      {error && <div id={`game-status-editable-error-${gameId}`} className="text-red-500 text-xs mt-1">{error}</div>}
    </div>);
}
interface StudioDescriptionEditableProps {
    studio: any;
    studioId: string;
    onDescriptionUpdate: (newDescription: string) => void;
}
export function StudioDescriptionEditable({ studio, studioId, onDescriptionUpdate }: StudioDescriptionEditableProps) {
    const [editing, setEditing] = useState(false);
    const [description, setDescription] = useState(studio.description || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        setDescription(studio.description || '');
    }, [studio.description]);
    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            await updateStudio(studioId, { description });
            onDescriptionUpdate(description);
            setEditing(false);
        }
        catch (e: any) {
            setError(e.message || "Failed to update studio description");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div id={`studio-description-editable-${studioId}`} className="group flex items-center gap-2 mt-1">
      {editing ? (<>
          <Input id={`studio-description-editable-input-${studioId}`} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add studio description..." className="w-96 h-8 px-2 text-sm" disabled={loading}/>
          <Button id={`studio-description-editable-save-${studioId}`} size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save id={`studio-description-editable-save-icon-${studioId}`} className="w-4 h-4"/>
          </Button>
          <Button id={`studio-description-editable-cancel-${studioId}`} size="icon" variant="ghost" onClick={() => { setEditing(false); setDescription(studio.description || ''); }} disabled={loading}>
            <X id={`studio-description-editable-cancel-icon-${studioId}`} className="w-4 h-4"/>
          </Button>
        </>) : (<>
          <span id={`studio-description-editable-value-${studioId}`} className="text-sm text-muted-foreground">
            {description || "Add studio description..."}
          </span>
          <Button id={`studio-description-editable-edit-${studioId}`} size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil id={`studio-description-editable-edit-icon-${studioId}`} className="w-4 h-4"/>
          </Button>
        </>)}
      {error && <div id={`studio-description-editable-error-${studioId}`} className="text-red-500 text-xs mt-1">{error}</div>}
    </div>);
}
