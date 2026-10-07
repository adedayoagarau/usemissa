"use client";

import { useState } from "react";
import { ChevronDown, Copy, FileText, Globe, ListChecks, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePickerField } from "@/components/missa/date-picker-field";
import { LabelPill } from "@/components/missa/label-pill";
import { PersonAvatar } from "@/components/missa/person-avatar";

/**
 * Every shared primitive on one page, with the overlays held open, so a
 * change to the component system can be judged in a single screenshot.
 */
export function ComponentSheet() {
  const [tab, setTab] = useState("list");
  const rows = [
    { name: "The tide table", who: "Ada Okafor", reads: "2/2", avg: "90", state: "Accepted" },
    { name: "Saltwater", who: "Rosa Lindqvist", reads: "2/2", avg: "62", state: "Waitlisted" },
    { name: "Night bus", who: "Ivo Marsh", reads: "1/2", avg: "58", state: "Not decided" },
  ];
  return (
    <TooltipProvider>
      <main className="mx-auto grid max-w-6xl gap-10 px-8 py-10">
        <header className="grid gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Component sheet</h1>
          <p className="text-sm text-muted-foreground">Shared primitives with overlays held open.</p>
        </header>

        <section aria-label="Actions" className="flex flex-wrap items-center gap-3">
          <Button>Primary action</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="secondary">Tinted</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive"><Trash2 aria-hidden="true" />Delete</Button>
          <Button size="sm">Compact</Button>
          <Button size="sm" variant="outline"><Plus aria-hidden="true" />Add task</Button>
          <Button size="icon-sm" variant="outline" aria-label="More"><ChevronDown aria-hidden="true" /></Button>
          <Button disabled>Disabled</Button>
        </section>

        <section aria-label="Status" className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="accent">Open</Badge>
          <Badge variant="success">Accepted</Badge>
          <Badge variant="information">Waitlisted</Badge>
          <Badge variant="warning">Due soon</Badge>
          <Badge variant="destructive">Failed</Badge>
          <span className="ms-4 flex -space-x-1.5">
            {["Ada Okafor", "Rosa Lindqvist", "Ivo Marsh", "Mei Tanaka"].map((name) => <Avatar key={name} size="sm"><AvatarFallback>{name.split(" ").map((part) => part[0]).join("")}</AvatarFallback></Avatar>)}
          </span>
        </section>

        <section aria-label="Colour" className="flex flex-wrap items-center gap-3">
          {(["red", "orange", "amber", "yellow", "lime", "green", "teal", "blue", "indigo", "purple", "magenta", "pink"] as const).map((hue) => <LabelPill key={hue} hue={hue}>{hue[0]!.toUpperCase() + hue.slice(1)}</LabelPill>)}
          <span className="ms-4 flex gap-1.5">
            {["Ada Okafor", "Rosa Lindqvist", "Ivo Marsh", "Mei Tanaka", "Tomás Reyes", "Grace Achebe", "Nadia Halloran", "Owen Price"].map((name) => <PersonAvatar key={name} name={name} />)}
          </span>
        </section>

        <section aria-label="Overlays" className="grid min-h-96 grid-cols-3 items-start gap-8">
          <div>
            <DropdownMenu defaultOpen modal={false}>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>Round actions<ChevronDown aria-hidden="true" /></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Round</DropdownMenuLabel>
                  <DropdownMenuItem><FileText aria-hidden="true" />Edit reader brief<DropdownMenuShortcut>B</DropdownMenuShortcut></DropdownMenuItem>
                  <DropdownMenuItem><ListChecks aria-hidden="true" />Edit rubric<DropdownMenuShortcut>R</DropdownMenuShortcut></DropdownMenuItem>
                  <DropdownMenuItem><Copy aria-hidden="true" />Duplicate round</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Trophy aria-hidden="true" />Promote to next round</DropdownMenuItem>
                <DropdownMenuItem><Globe aria-hidden="true" />Publish results</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive"><Trash2 aria-hidden="true" />Delete round</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <Popover defaultOpen modal={false}>
              <PopoverTrigger render={<Button variant="ghost" size="sm" />}><Pencil aria-hidden="true" />Reads due 20 Oct</PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <PopoverHeader>
                  <PopoverTitle>Reads due</PopoverTitle>
                  <PopoverDescription>Applies to every open read in this round.</PopoverDescription>
                </PopoverHeader>
                <Input type="date" defaultValue="2026-10-20" aria-label="Reads due" />
                <div className="flex justify-end gap-2"><Button size="sm" variant="ghost">Clear</Button><Button size="sm">Save</Button></div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-4">
            <DatePickerField aria-label="Decisions by" value="2026-11-02" onChange={() => undefined} />
            <Tooltip defaultOpen>
              <TooltipTrigger render={<Button variant="outline" size="sm" />}>Hover target</TooltipTrigger>
              <TooltipContent>Scores high: +15 against the round</TooltipContent>
            </Tooltip>
          </div>
        </section>

        <section aria-label="Forms" className="grid grid-cols-3 gap-6">
          <Field>
            <FieldLabel htmlFor="sheet-name">Round name</FieldLabel>
            <Input id="sheet-name" defaultValue="First read" />
            <FieldDescription>Readers see this name in their queue.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="sheet-select">Opportunity</FieldLabel>
            <Select defaultValue="salt">
              <SelectTrigger id="sheet-select" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salt">Saltwater Poetry Prize 2027</SelectItem>
                <SelectItem value="river">River Fiction Fellowship</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="sheet-notes">Notes</FieldLabel>
            <Textarea id="sheet-notes" rows={2} placeholder="What stood out" />
          </Field>
          <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked />Treat a shared domain as a conflict</label>
          <label className="flex items-center gap-2 text-sm"><Switch defaultChecked />Remind readers weekly</label>
          <Progress value={62} aria-label="Round 62% complete" />
        </section>

        <section aria-label="List">
          <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
            <TabsList variant="line">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="pt-3">
              <Table variant="grid">
                <TableHeader>
                  <TableRow>
                    <TableHead>Work</TableHead>
                    <TableHead>Submitter</TableHead>
                    <TableHead className="text-end">Reads</TableHead>
                    <TableHead className="text-end">Average</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.name} data-state={index === 1 ? "selected" : undefined}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell><span className="flex items-center gap-2"><PersonAvatar name={row.who} size="sm" />{row.who}</span></TableCell>
                      <TableCell className="text-end tabular-nums">{row.reads}</TableCell>
                      <TableCell className="text-end tabular-nums">{row.avg}</TableCell>
                      <TableCell>{row.state}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </section>

        <section aria-label="Dialog">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New review round</DialogTitle>
                <DialogDescription>A round holds its own readers, due date, brief and rubric.</DialogDescription>
              </DialogHeader>
              <Field>
                <FieldLabel htmlFor="sheet-dialog-name">Round name</FieldLabel>
                <Input id="sheet-dialog-name" defaultValue="Second read" />
              </Field>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button>Create round</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </main>
    </TooltipProvider>
  );
}
