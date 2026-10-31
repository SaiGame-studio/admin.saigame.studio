"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
    id: string;
    label: string;
    /** The value shown as plain text when not editing. */
    display: ReactNode;
    disabled?: boolean;
    /** Called when the Pencil is clicked, to reset the editor's draft to the current value. */
    onEdit: () => void;
    /** The input(s) shown while editing. */
    editor: ReactNode;
    /** Saves the draft; resolves true to close the editor. */
    onSave: () => Promise<boolean>;
};

/** A labelled value shown as text, with a Pencil that swaps it for an editor with Save / Cancel. */
export function InlineEditField({ id, label, display, disabled, onEdit, editor, onSave }: Props) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            if (await onSave()) {
                setEditing(false);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id={`${id}-field`} className="inline-edit-field group space-y-2">
            <Label id={`${id}-label`} className="inline-edit-field-label">{label}</Label>
            {editing ? (
                <div id={`${id}-editor`} className="inline-edit-field-editor flex items-start gap-1">
                    <div id={`${id}-editor-inputs`} className="inline-edit-field-editor-inputs min-w-0 flex-1 space-y-2">{editor}</div>
                    <Button id={`${id}-save`} size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => void save()} disabled={saving}>
                        {saving ? <Loader2 id={`${id}-save-icon`} className="h-4 w-4 animate-spin"/> : <Save id={`${id}-save-icon`} className="h-4 w-4"/>}
                    </Button>
                    <Button id={`${id}-cancel`} size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setEditing(false)} disabled={saving}>
                        <X id={`${id}-cancel-icon`} className="h-4 w-4"/>
                    </Button>
                </div>
            ) : (
                <div id={`${id}-view`} className="inline-edit-field-view flex min-h-9 items-center gap-1">
                    <span id={`${id}-value`} className="inline-edit-field-value min-w-0 truncate text-sm">{display}</span>
                    <Button
                        id={`${id}-edit`}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => {
                            onEdit();
                            setEditing(true);
                        }}
                        disabled={disabled}
                    >
                        <Pencil id={`${id}-edit-icon`} className="h-4 w-4"/>
                    </Button>
                </div>
            )}
        </div>
    );
}
