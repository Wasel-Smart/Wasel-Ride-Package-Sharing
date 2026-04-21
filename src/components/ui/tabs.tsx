"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-[var(--wasel-panel-muted)] text-[var(--wasel-copy-muted)] inline-flex h-12 w-fit items-center justify-center rounded-[1.5rem] border border-[var(--wasel-panel-border)] p-1.5 backdrop-blur-xl flex",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-[var(--theme-gradient-primary)] data-[state=active]:text-[var(--wasel-button-primary-foreground)] data-[state=active]:border-[var(--wasel-button-primary-border-strong)] data-[state=active]:shadow-[var(--wasel-button-primary-shadow)] dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-[rgb(var(--accent-secondary-rgb)/0.18)] focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-[var(--wasel-copy-primary)] dark:text-muted-foreground inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 rounded-[1.15rem] border border-transparent px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[color,box-shadow,border-color,background-color] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
