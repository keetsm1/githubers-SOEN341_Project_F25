import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Image as ImageIcon, Check, X } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type PendingEvent = {
    event_id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    max_cap: number | null;
    image_url: string | null;
    status: string;
    created_at: string;
    created_by: string;
    org_name: string | null;
};

const ApproveEvents: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<PendingEvent[]>([]);

    const fetchPendingEvents = async () => {
        if (!isSupabaseEnabled || !supabase) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('event_id, title, description, starts_at, ends_at, location, max_cap, image_url, status, created_at, created_by, org_name')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            toast({ title: 'Failed to load events', description: error.message, variant: 'destructive' });
            setEvents([]);
        } else {
            const rows = (data as PendingEvent[]) ?? [];
            const isPending = (s: any) => {
                if (typeof s === 'boolean') return s === false;
                if (typeof s === 'string') {
                    const v = s.toLowerCase();
                    // treat unknown strings (including 'pending') as pending, except explicit approved/published/rejected
                    return !['published', 'approved', 'rejected'].includes(v);
                }
                return true; // null/undefined -> treat as pending
            };
            setEvents(rows.filter(r => isPending((r as any).status)));
        }
        setLoading(false);
    };

    useEffect(() => {
        // initial load
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetchPendingEvents();

        // realtime: reflect deletes and status changes instantly
        if (isSupabaseEnabled && supabase) {
            const channel = supabase
                .channel('pending-events-live')
                .on(
                    'postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'events' },
                    (payload: any) => {
                        const oldId = payload.old?.event_id;
                        if (oldId) {
                            setEvents(prev => prev.filter(e => e.event_id !== oldId));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'events' },
                    (payload: any) => {
                        const updated = payload.new as PendingEvent;
                        // If status moved away from pending, remove it. If it became pending, add/update.
                        if (updated.status !== 'pending') {
                            setEvents(prev => prev.filter(e => e.event_id !== updated.event_id));
                        } else {
                            setEvents(prev => {
                                const idx = prev.findIndex(e => e.event_id === updated.event_id);
                                if (idx === -1) return [updated, ...prev];
                                const clone = [...prev];
                                clone[idx] = updated;
                                return clone;
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                void supabase.removeChannel(channel);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateEventStatus = async (ev: PendingEvent, nextStatus: 'published' | 'rejected') => {
        if (!isSupabaseEnabled || !supabase) return;
        const { error } = await supabase
            .from('events')
            .update({ status: nextStatus })
            .eq('event_id', ev.event_id);

        if (error) {
            toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
            return;
        }

        // Local remove; realtime will also handle it, but this keeps UI snappy
        setEvents((prev) => prev.filter((e) => e.event_id !== ev.event_id));
        toast({ title: nextStatus === 'published' ? 'Event approved' : 'Event rejected' });
    };

    if (!user) return <LoginForm />;
    if (user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-8 text-center">
                            <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navigation />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Approve Events</h1>
                    <p className="text-muted-foreground">Review and approve events submitted by organizations</p>
                </div>

                {loading ? (
                    <Card className="shadow-card"><CardContent className="p-6">Loading pending events…</CardContent></Card>
                ) : events.length === 0 ? (
                    <Card className="shadow-card"><CardContent className="p-6">No pending events.</CardContent></Card>
                ) : (
                    <div className="space-y-6">
                        {events.map((ev) => (
                            <Card key={ev.event_id} className="shadow-card">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            {ev.title}
                                        </CardTitle>
                                        <Badge variant="outline">Pending</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(ev.starts_at).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                                <span>{ev.location || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                <span>Max capacity: {ev.max_cap ?? '—'}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <span className="font-medium">Organization:</span>
                                                <span className="ml-2">{ev.org_name || 'Independent'}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <span className="font-medium">Submitted by:</span>
                                                <span className="ml-2 font-mono break-all">{ev.created_by}</span>
                                            </div>
                                        </div>

                                        {ev.description && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Description</p>
                                                <p className="mt-1">{ev.description}</p>
                                            </div>
                                        )}

                                        {ev.image_url ? (
                                            <div className="pt-2">
                                                <p className="text-sm text-muted-foreground">Image</p>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={ev.image_url} alt={`${ev.title} image`} className="h-24 w-24 object-cover border rounded" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <ImageIcon className="w-4 h-4" />
                                                <span>No image provided</span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => void updateEventStatus(ev, 'published')}>
                                                <Check className="w-4 h-4 mr-2" />
                                                Approve
                                            </Button>
                                            <Button variant="destructive" onClick={() => void updateEventStatus(ev, 'rejected')}>
                                                <X className="w-4 h-4 mr-2" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApproveEvents;
