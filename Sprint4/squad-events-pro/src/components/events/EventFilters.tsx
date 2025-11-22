import { useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EventFilters } from "@/services/database";

type Opt = { label: string; value: string };

export type EventFiltersState = {
    q: string;
    categories: string[];
    orgIds: string[];
    dateFrom?: string; // ISO (YYYY-MM-DD or full ISO)
    dateTo?: string;
    sort: 'soonest' | 'newest' | 'popularity';
};

export function EventFiltersBar(props: {
    state: EventFiltersState;
    categoryOptions: Opt[];
    orgOptions: Opt[];
    onChange: (next: Partial<EventFiltersState>) => void;
    onClearAll: () => void;
}) {
    const { state, categoryOptions, orgOptions, onChange, onClearAll } = props;

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string }[] = [];
        state.categories.forEach(v => chips.push({ key: `cat:${v}`, label: `Category: ${v}` }));
        state.orgIds.forEach(v => {
            const label = orgOptions.find(o => o.value === v)?.label ?? v;
            chips.push({ key: `org:${v}`, label: `Org: ${label}` });
        });
        if (state.dateFrom) chips.push({ key: `from`, label: `From: ${format(new Date(state.dateFrom), "MMM d, yyyy")}` });
        if (state.dateTo) chips.push({ key: `to`, label: `To: ${format(new Date(state.dateTo), "MMM d, yyyy")}` });
        if (state.sort && state.sort !== 'soonest') chips.push({ key: `sort`, label: `Sort: ${state.sort}` });
        return chips;
    }, [state, orgOptions]);

    const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

    return (
        <div className="w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {/* Categories */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            Categories <ChevronDown className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                        <div className="max-h-64 overflow-auto space-y-2">
                            {categoryOptions.map(opt => (
                                <label key={opt.value} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={state.categories.includes(opt.value)}
                                        onCheckedChange={() => onChange({ categories: toggleIn(state.categories, opt.value) })}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Organizations */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            Organizations <ChevronDown className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                        <div className="max-h-72 overflow-auto space-y-2">
                            {orgOptions.map(opt => (
                                <label key={opt.value} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={state.orgIds.includes(opt.value)}
                                        onCheckedChange={() => onChange({ orgIds: toggleIn(state.orgIds, opt.value) })}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Date range (simple inputs; you can swap for a calendar later) */}
                <input
                    type="date"
                    value={state.dateFrom?.slice(0,10) ?? ''}
                    onChange={(e) => onChange({ dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="border rounded-md px-2 py-1 text-sm"
                    aria-label="From date"
                />
                <input
                    type="date"
                    value={state.dateTo?.slice(0,10) ?? ''}
                    onChange={(e) => onChange({ dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="border rounded-md px-2 py-1 text-sm"
                    aria-label="To date"
                />

                {/* Sort */}
                <select
                    value={state.sort}
                    onChange={(e) => onChange({ sort: e.target.value as EventFiltersState['sort'] })}
                    className="border rounded-md px-2 py-1 text-sm"
                    aria-label="Sort by"
                >
                    <option value="soonest">Sort: Soonest</option>
                    <option value="newest">Sort: Newest</option>
                    <option value="popularity">Sort: Popularity</option>
                </select>

                <Button variant="ghost" size="sm" onClick={onClearAll} className="ml-auto">
                    Clear all
                </Button>
            </div>

            {/* Active chips */}
            <div className="flex flex-wrap gap-2">
                {activeChips.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No filters applied</span>
                ) : activeChips.map(chip => (
                    <Badge
                        key={chip.key}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => {
                            const [k, v] = chip.key.split(':');
                            if (k === 'cat')  onChange({ categories: state.categories.filter(c => c !== v) });
                            if (k === 'org')  onChange({ orgIds: state.orgIds.filter(id => id !== v) });
                            if (k === 'from') onChange({ dateFrom: undefined });
                            if (k === 'to')   onChange({ dateTo: undefined });
                            if (k === 'sort') onChange({ sort: 'soonest' });
                        }}
                        title="Click to remove"
                    >
                        {chip.label} ✕
                    </Badge>
                ))}
            </div>
        </div>
    );
}
