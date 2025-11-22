import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, MapPin, Users, Tag, X, Pencil } from 'lucide-react';

import Navigation from '@/components/layout/Navigation';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { getEventById, updateEventPendingOwned, EventRow, EventUpdate } from '@/services/database';

const CATEGORIES = ['Technology','Career','Sports','Arts','Social','Academic','Business'];

export default function EditEvent() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { toast } = useToast();

    if (!user) return <LoginForm />;

    // Fetch current event
    const { data: event, isLoading, error } = useQuery({
        queryKey: ['event', id],
        queryFn: () => getEventById(id!),
        enabled: !!id,
    });

    // Initialize local form state from fetched event
    const [formState, setFormState] = useState<{
        title: string;
        description: string;
        dateLocal: string;
        durationMinutes: number;
        location: string;
        category: string;
        maxCapacity: string;
        imageUrl: string;
        tags: string[];
    } | null>(null);

    React.useEffect(() => {
        if (!event) return;
        // prefill using existing server values
        const start = new Date(event.starts_at);
        const durationMs = new Date(event.ends_at).getTime() - start.getTime();
        const mins = Math.max(30, Math.round(durationMs / 60000)); // minimum 30 mins for UI sanity

        setFormState({
            title: event.title ?? '',
            description: event.description ?? '',
            dateLocal: new Date(start.getTime() - start.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16), // yyyy-MM-ddTHH:mm
            durationMinutes: mins,
            location: event.location ?? '',
            category: event.category ?? '',
            maxCapacity: event.max_cap?.toString() ?? '',
            imageUrl: event.image_url ?? '',
            tags: event.tags ?? [],
        });
    }, [event]);

    const onChange = (field: keyof NonNullable<typeof formState>, val: any) => {
        setFormState((prev) => (prev ? { ...prev, [field]: val } : prev));
    };

    const addTag = (newTag: string) => {
        const t = newTag.trim();
        if (!t || !formState) return;
        if (formState.tags.includes(t)) return;
        onChange('tags', [...formState.tags, t]);
    };

    const removeTag = (tag: string) => {
        if (!formState) return;
        onChange('tags', formState.tags.filter((x) => x !== tag));
    };

    const mutation = useMutation({
        mutationFn: async (payload: EventUpdate) =>
            updateEventPendingOwned(id!, user.id, payload),
        onSuccess: () => {
            // refresh caches (listing & detail)
            qc.invalidateQueries({ queryKey: ['events'] });
            qc.invalidateQueries({ queryKey: ['event', id] });
            toast({ title: 'Event updated', description: 'Your pending event was updated successfully.' });
            navigate('/my-events');
        },
        onError: (e: any) => {
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: e?.message ?? 'Unable to update event. Make sure the event is pending and you are the organizer.',
            });
        },
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState || !event) return;

        // Only pending events can be edited by organizer
        if (event.status !== 'pending') {
            toast({
                variant: 'destructive',
                title: 'Not editable',
                description: 'Only pending events can be edited.',
            });
            return;
        }
        if (event.created_by !== user.id && user.role !== 'admin') {
            toast({
                variant: 'destructive',
                title: 'Not allowed',
                description: 'You can only edit your own pending events.',
            });
            return;
        }

        const startLocal = new Date(formState.dateLocal);
        const starts_at = new Date(startLocal.getTime() + startLocal.getTimezoneOffset() * 60000).toISOString();
        const ends_at = new Date(new Date(starts_at).getTime() + formState.durationMinutes * 60000).toISOString();

        const patch: EventUpdate = {
            title: formState.title,
            description: formState.description,
            starts_at,
            ends_at,
            location: formState.location,
            category: formState.category,
            max_cap: formState.maxCapacity ? parseInt(formState.maxCapacity, 10) : null,
            image_url: formState.imageUrl || null,
            tags: formState.tags,
        };

        mutation.mutate(patch);
    };

    // Derived view model for the “Previously saved details” panel
    const previousView = useMemo(() => {
        if (!event) return null;
        const start = new Date(event.starts_at);
        const end = new Date(event.ends_at);
        return {
            title: event.title,
            when: `${start.toLocaleString()} – ${end.toLocaleTimeString()}`,
            location: event.location ?? '—',
            category: event.category ?? '—',
            cap: event.max_cap ?? '—',
            tags: event.tags ?? [],
            image: event.image_url ?? '',
            status: event.status,
        };
    }, [event]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card><CardContent className="p-8">Loading event…</CardContent></Card>
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card><CardContent className="p-8 text-destructive">Could not load event.</CardContent></Card>
                </div>
            </div>
        );
    }

    // Access restriction messaging
    if (event.status !== 'pending' && user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-8 text-center">
                            <h2 className="text-2xl font-bold mb-2">Not Editable</h2>
                            <p className="text-muted-foreground">Only pending events can be edited.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navigation />

            <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-8">
                {/* Left: Edit form */}
                <Card className="shadow-elevated">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5" /> Edit Event (Pending)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!formState ? (
                            <div>Preparing form…</div>
                        ) : (
                            <form onSubmit={submit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input id="title" value={formState.title} onChange={(e) => onChange('title', e.target.value)} required />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description *</Label>
                                    <Textarea
                                        id="description"
                                        value={formState.description}
                                        onChange={(e) => onChange('description', e.target.value)}
                                        rows={4}
                                        required
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateLocal" className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Start (local) *
                                        </Label>
                                        <Input
                                            id="dateLocal"
                                            type="datetime-local"
                                            value={formState.dateLocal}
                                            onChange={(e) => onChange('dateLocal', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (mins) *</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min={30}
                                            step={15}
                                            value={formState.durationMinutes}
                                            onChange={(e) => onChange('durationMinutes', parseInt(e.target.value || '60', 10))}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="location" className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> Location *
                                        </Label>
                                        <Input
                                            id="location"
                                            value={formState.location}
                                            onChange={(e) => onChange('location', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category *</Label>
                                        <Select value={formState.category} onValueChange={(v) => onChange('category', v)} required>
                                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="cap" className="flex items-center gap-2">
                                            <Users className="W-4 h-4" /> Max Capacity *
                                        </Label>
                                        <Input
                                            id="cap"
                                            type="number"
                                            min={1}
                                            value={formState.maxCapacity}
                                            onChange={(e) => onChange('maxCapacity', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="image">Image URL</Label>
                                        <Input
                                            id="image"
                                            type="url"
                                            value={formState.imageUrl}
                                            onChange={(e) => onChange('imageUrl', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Tag className="w-4 h-4" /> Tags
                                    </Label>
                                    <TagInput
                                        tags={formState.tags}
                                        onAdd={addTag}
                                        onRemove={removeTag}
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button type="submit" disabled={mutation.isPending} className="flex-1">
                                        {mutation.isPending ? 'Saving…' : 'Save Changes'}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => navigate('/my-events')}>
                                        Cancel
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Only pending events can be edited. Once approved/published, editing is restricted.
                                </p>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Previously saved details (read-only) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Previously saved details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div><span className="text-xs text-muted-foreground">Status</span><div className="font-medium capitalize">{previousView?.status}</div></div>
                        <div><span className="text-xs text-muted-foreground">Title</span><div className="font-medium">{previousView?.title}</div></div>
                        <div><span className="text-xs text-muted-foreground">When</span><div className="font-medium">{previousView?.when}</div></div>
                        <div><span className="text-xs text-muted-foreground">Location</span><div className="font-medium">{previousView?.location}</div></div>
                        <div><span className="text-xs text-muted-foreground">Category</span><div className="font-medium">{previousView?.category}</div></div>
                        <div><span className="text-xs text-muted-foreground">Capacity</span><div className="font-medium">{previousView?.cap}</div></div>
                        {previousView?.tags?.length ? (
                            <div>
                                <span className="text-xs text-muted-foreground">Tags</span>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {previousView.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                                </div>
                            </div>
                        ) : null}
                        {previousView?.image ? (
                            <div className="pt-2">
                                <img src={previousView.image} alt="Event" className="w-full rounded-md" loading="lazy" />
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Small local tag input helper
function TagInput({
                      tags,
                      onAdd,
                      onRemove,
                  }: {
    tags: string[];
    onAdd: (t: string) => void;
    onRemove: (t: string) => void;
}) {
    const [draft, setDraft] = useState('');
    return (
        <>
            <div className="flex gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onAdd(draft);
                            setDraft('');
                        }
                    }}
                />
                <Button type="button" variant="outline" onClick={() => (onAdd(draft), setDraft(''))}>
                    Add
                </Button>
            </div>
            {!!tags.length && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((t) => (
                        <Badge key={t} variant="secondary" className="flex items-center gap-1">
                            {t}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => onRemove(t)} />
                        </Badge>
                    ))}
                </div>
            )}
        </>
    );
}
