"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (<TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props}/>));
TabsList.displayName = TabsPrimitive.List.displayName;
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    href?: string;
}>(({ className, href, onClick, onMouseDown, ...props }, ref) => {
    const openNewTab = () => {
        const url = href ??
            (typeof window !== "undefined"
                ? `${window.location.pathname}?tab=${props.value}`
                : `?tab=${props.value}`);
        window.open(url, "_blank", "noopener,noreferrer");
    };
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            openNewTab();
            return;
        }
        onClick?.(e);
    };
    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.button === 1) {
            e.preventDefault();
            openNewTab();
            return;
        }
        onMouseDown?.(e);
    };
    return (<TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} onClick={handleClick} onMouseDown={handleMouseDown} {...props}/>);
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (<TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props}/>));
TabsContent.displayName = TabsPrimitive.Content.displayName;
export { Tabs, TabsList, TabsTrigger, TabsContent };
