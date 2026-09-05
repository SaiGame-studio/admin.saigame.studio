import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlayerQuestHistorySearchProps {
    value: string;
    placeholder: string;
    clearLabel: string;
    onChange: (value: string) => void;
}

export function PlayerQuestHistorySearch({ value, placeholder, clearLabel, onChange }: PlayerQuestHistorySearchProps) {
    return (<div id="player-quest-history-search" className="relative w-full sm:w-80">
      <Search id="player-quest-history-search-icon" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input id="player-quest-history-search-input" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-9 pl-8 pr-8" autoComplete="off"/>
      {value && (<Button id="player-quest-history-search-clear" type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" onClick={() => onChange("")} title={clearLabel}>
          <X id="player-quest-history-search-clear-icon" className="h-4 w-4"/>
        </Button>)}
    </div>);
}
