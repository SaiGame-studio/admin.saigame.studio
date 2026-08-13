"use client";
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Clock, Package } from "lucide-react";
import { TipsBanner } from "@/components/TipsBanner";
import { ALL_TIMEZONES } from "@/components/profile-content";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";
import { updateUserTimezone } from "@/lib/api";
import { SITE_NAME } from "@/lib/utils/site-config";
import { getUserTimezone } from "@/lib/utils/date-utils";
export function Footer() {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    const { user, refreshUser } = useAuth();
    const [timezone, setTimezone] = useState<string>("");
    const [time, setTime] = useState<string>("");
    const [timezoneValue, setTimezoneValue] = useState("");
    const [timezoneOpen, setTimezoneOpen] = useState(false);
    const [timezoneSaving, setTimezoneSaving] = useState(false);
    useEffect(() => {
        const tz = user?.timezone || getUserTimezone();
        setTimezone(tz);
        setTimezoneValue(tz);
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-GB", {
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [user?.timezone]);
    async function selectTimezone(value: string) {
        if (!user || value === timezone)
            return;
        setTimezoneSaving(true);
        try {
            setTimezoneValue(value);
            await updateUserTimezone(value);
            await refreshUser();
            setTimezoneOpen(false);
        }
        catch {
            setTimezoneValue(timezone);
        }
        finally {
            setTimezoneSaving(false);
        }
    }
    return (<footer id="app-footer" className="shrink-0 border-t py-2 px-4 text-xs text-muted-foreground flex items-center justify-between gap-3">
      <TipsBanner />
      <div id="app-footer-details" className="flex items-center gap-3">
      {timezone && (<span id="app-footer-timezone" className="app-footer-timezone flex items-center gap-1 opacity-60" title={`Dates and times are shown in: ${timezone}`}>
          <Clock id="app-footer-timezone-icon" className="app-footer-timezone-icon h-3 w-3"/>
          <span id="app-footer-timezone-editor" className="app-footer-timezone-editor flex items-center">
              <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                <PopoverTrigger asChild>
                  <Button id="app-footer-timezone-select" variant="ghost" role="combobox" aria-label="Select timezone" className="app-footer-timezone-select h-6 gap-1 px-1 text-xs font-normal" disabled={!user || timezoneSaving}>
                    <span id="app-footer-timezone-select-value" className="app-footer-timezone-select-value">{timezoneValue}</span>
                    <ChevronsUpDown id="app-footer-timezone-select-icon" className="app-footer-timezone-select-icon h-3 w-3 opacity-50"/>
                  </Button>
                </PopoverTrigger>
                <PopoverContent id="app-footer-timezone-popover" className="app-footer-timezone-popover w-64 p-0" align="start">
                  <Command id="app-footer-timezone-command" className="app-footer-timezone-command">
                    <CommandInput id="app-footer-timezone-search-input" placeholder="Search timezone..." className="app-footer-timezone-search-input h-8"/>
                    <CommandList id="app-footer-timezone-options" className="app-footer-timezone-options max-h-60">
                      <CommandEmpty id="app-footer-timezone-empty" className="app-footer-timezone-empty">No timezone found.</CommandEmpty>
                      <CommandGroup id="app-footer-timezone-options-group" className="app-footer-timezone-options-group">
                        {ALL_TIMEZONES.map(tz => (<CommandItem id={`app-footer-timezone-option-${tz.toLowerCase().replaceAll("/", "-").replaceAll("_", "-")}`} className="app-footer-timezone-option" key={tz} value={tz} onSelect={selectTimezone}>
                            <Check id={`app-footer-timezone-option-${tz.toLowerCase().replaceAll("/", "-").replaceAll("_", "-")}-check`} className={`app-footer-timezone-option-check mr-2 h-3.5 w-3.5 ${timezoneValue === tz ? "opacity-100" : "opacity-0"}`}/>
                            {tz}
                          </CommandItem>))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </span>
        </span>)}
      <span className="flex items-center gap-1">
        <Package className="h-3 w-3"/>
        {SITE_NAME} {version} • {new Date().getFullYear()}
      </span>

        {time && (<span className="font-mono tabular-nums tracking-tight opacity-70">{time}</span>)}
      </div>
    </footer>);
}
