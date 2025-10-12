import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar } from 'lucide-react';

import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import {
    Event,
    db,
    listEvents,
    listEventCategories,
    listOrganizationsBasic,
    EventFilters,
} from '@/services/database';

type Opt = { label: string; value: string };
const PER_PAGE = 12;

const SearchEvents: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Filters
    const [q, setQ] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [orgIds, setOrgIds] = useState<string[]>([]);
    const [dateFrom, setDateFrom] = useState<string | undefined>();
    const [dateTo, setDateTo] = useState<string | undefined>();
    const [sort, setSort] = useState<EventFilters['sort']>('soonest');

    // Pagination
    const [page, setPage] = useState(1);

    // Options
    const { data: categoryOptions = [] } = useQuery({
        queryKey: ['event-categories'],
        queryFn: async (): Promise<string[]> => listEventCategories(),
    });

    const { data: orgOptionsRaw = [] } = useQuery({
        queryKey: ['orgs-basic'],
        queryFn: async () => listOrganizationsBasic(),
    });
    const orgOptions: Opt[] = useMemo(
        () => orgOptionsRaw.map(o => ({ label: o.name, value: o.org_id })),
        [orgOptionsRaw]
    );

    // Data: fetch all matching (server sorts/filters), paginate client side
    const { data: allEvents = [], isLoading, error, refetch } = useQuery({
        queryKey: ['events', { q, categories, orgIds, dateFrom, dateTo, sort }],
        queryFn: () =>
            listEvents({
                q: q || undefined,
                categories: categories.length ? categories : undefined,
                orgIds: orgIds.length ? orgIds : undefined,
                dateFrom,
                dateTo,
                sort,
            }),
        keepPreviousData: true,
    });

    const totalEvents = allEvents.length;
    const pagedEvents = useMemo(() => {
        const start = (page - 1) * PER_PAGE;
        return allEvents.slice(start, start + PER_PAGE);
    }, [allEvents, page]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [q, categories, orgIds, dateFrom, dateTo, sort]);

    const toggle = (arr: string[], v: string) =>
        arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

    const clearAll = () => {
        setQ('');
        setCategories([]);
        setOrgIds([]);
        setDateFrom(undefined);
        setDateTo(undefined);
        setSort('soonest');
    };

    const handleRSVP = async (eventId: string) => {
        if (!user) return;
        try {
            const ticket = await db.createTicket(eventId, user.id);
            if (ticket) {
                toast({
                    title: 'RSVP Successful!',
                    description: 'Your ticket has been generated. Check My Events to view it.',
                });
            }
            refetch();
        } catch {
            toast({
                variant: 'destructive',
                title: 'RSVP Failed',
                description: 'Unable to RSVP at this time',
            });
        }
    };

    if (!user) return <LoginForm />;

    if (user.role !== 'student') {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-8 text-center">
                            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
                            <p className="text-muted-foreground">Event browsing is only available for students.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Active filter chips
    const chips: { key: string; label: string }[] = [];
    categories.forEach(c => chips.push({ key: `cat:${c}`, label: `Category: ${c}` }));
    orgIds.forEach(id => {
        const label = orgOptions.find(o => o.value === id)?.label ?? id;
        chips.push({ key: `org:${id}`, label: `Org: ${label}` });
    });
    if (dateFrom) chips.push({ key: 'from', label: `From: ${new Date(dateFrom).toLocaleDateString()}` });
    if (dateTo) chips.push({ key: 'to', label: `To: ${new Date(dateTo).toLocaleDateString()}` });
    if (sort !== 'soonest') chips.push({ key: `sort`, label: `Sort: ${sort}` });

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navigation />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Discover Events</h1>
                    <p className="text-muted-foreground">Find and join exciting campus events</p>
                </div>

                {/* Search + Filters */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Search & Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search events by title or description…"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Categories (multi) */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">Categories ▾</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64">
                                    <div className="max-h-64 overflow-auto space-y-2">
                                        {categoryOptions.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">No categories yet</div>
                                        ) : categoryOptions.map(c => (
                                            <label key={c} className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={categories.includes(c)}
                                                    onCheckedChange={() => setCategories(prev => toggle(prev, c))}
                                                />
                                                <span>{c}</span>
                                            </label>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Organizations (multi) */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">Organizations ▾</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72">
                                    <div className="max-h-72 overflow-auto space-y-2">
                                        {orgOptions.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">No organizations yet</div>
                                        ) : orgOptions.map(opt => (
                                            <label key={opt.value} className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={orgIds.includes(opt.value)}
                                                    onCheckedChange={() => setOrgIds(prev => toggle(prev, opt.value))}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Date range */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="fromDate" className="text-sm text-muted-foreground">From:</label>
                                    <input
                                        id="fromDate"
                                        type="date"
                                        aria-label="From date"
                                        value={dateFrom ? new Date(dateFrom).toISOString().slice(0,10) : ''}
                                        onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                                        className="border rounded-md px-2 py-1 text-sm"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <label htmlFor="toDate" className="text-sm text-muted-foreground">To:</label>
                                    <input
                                        id="toDate"
                                        type="date"
                                        aria-label="To date"
                                        value={dateTo ? new Date(dateTo).toISOString().slice(0,10) : ''}
                                        onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                                        className="border rounded-md px-2 py-1 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Sort */}
                            <select
                                aria-label="Sort"
                                value={sort}
                                onChange={(e) => setSort(e.target.value as any)}
                                className="border rounded-md px-2 py-1 text-sm"
                            >
                                <option value="soonest">Sort: Soonest</option>
                                <option value="newest">Sort: Newest</option>
                                <option value="popularity">Sort: Popularity</option>
                            </select>

                            <Button variant="ghost" size="sm" className="ml-auto" onClick={clearAll}>
                                Clear all
                            </Button>
                        </div>

                        {/* Active chips */}
                        <div className="flex flex-wrap gap-2">
                            {chips.length === 0 ? (
                                <span className="text-sm text-muted-foreground">No filters applied</span>
                            ) : chips.map(chip => (
                                <Badge
                                    key={chip.key}
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const [k, v] = chip.key.split(':');
                                        if (k === 'cat') setCategories(cs => cs.filter(c => c !== v));
                                        if (k === 'org') setOrgIds(ids => ids.filter(id => id !== v));
                                        if (k === 'from') setDateFrom(undefined);
                                        if (k === 'to') setDateTo(undefined);
                                        if (k === 'sort') setSort('soonest');
                                    }}
                                >
                                    {chip.label} ✕
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Events Grid */}
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="aspect-video bg-muted" />
                                <CardContent className="p-6">
                                    <div className="h-4 bg-muted rounded mb-2" />
                                    <div className="h-6 bg-muted rounded mb-4" />
                                    <div className="space-y-2">
                                        <div className="h-3 bg-muted rounded" />
                                        <div className="h-3 bg-muted rounded w-3/4" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : error ? (
                    <Card>
                        <CardContent className="p-12 text-center text-destructive">
                            Failed to load events.
                        </CardContent>
                    </Card>
                ) : totalEvents === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
                            <p className="text-muted-foreground mb-4">
                                {q || categories.length || orgIds.length || dateFrom || dateTo
                                    ? 'Try adjusting your search criteria'
                                    : 'No events are currently available'}
                            </p>
                            {(q || categories.length || orgIds.length || dateFrom || dateTo) && (
                                <Button variant="outline" onClick={clearAll}>
                                    Clear Filters
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {pagedEvents.length} of {totalEvents} events
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {pagedEvents.map((event: Event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onRSVP={handleRSVP}
                                    showActions={true}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalEvents > PER_PAGE && (
                            <div className="flex justify-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(totalEvents / PER_PAGE)}
                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= Math.ceil(totalEvents / PER_PAGE)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SearchEvents;
