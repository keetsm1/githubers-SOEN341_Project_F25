import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { db, supabase, isSupabaseEnabled } from '@/services/database';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, ArrowLeft, BarChart3, Target, ScanQrCode } from 'lucide-react';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [isRSVPing, setIsRSVPing] = useState(false);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const { toast } = useToast();
  const [hasTicket, setHasTicket] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [eventAnalytics, setEventAnalytics] = useState<import('@/services/database').Analytics | null>(null);
  const [trend, setTrend] = useState<{ date: string; rsvps: number; checkins: number }[]>([]);
  const [recent, setRecent] = useState<Array<{ kind: 'RSVP' | 'Check-in'; time: string; name?: string | null }>>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  const eventId = useMemo(() => id as string, [id]);

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      setLoading(true);
      setError(null);
      try {
        const row = await (await import('@/services/database')).getEventById(eventId);
        const mapped = {
          id: (row as any).event_id ?? (row as any).id ?? eventId,
          title: row.title,
          description: row.description ?? '',
          date: row.starts_at,
          location: row.location ?? '',
          category: (row as any).category ?? 'General',
          organizerId: row.created_by,
          organizerName: (row as any).org_name ?? 'Organizer',
          maxCapacity: row.max_cap ?? 0,
          currentAttendees: 0,
          imageUrl: row.image_url ?? undefined,
          tags: (row as any).tags ?? [],
          isApproved:
            (row as any).status === true ||
            (typeof (row as any).status === 'string' && ['published','approved'].includes(String((row as any).status).toLowerCase())),
          createdAt: (row as any).created_at,
          status: (row as any).status,
          isPaid: !!(row as any).is_paid,
          price: (row as any).price ? Number(row.price) : 0,
        };
        setEvent(mapped);
        // Load per-event analytics and trends for organizers
        if (user && (user.role === 'company' || user.role === 'admin')) {
          if (mapped.organizerId === user.id) {
            const analytics = await (await import('@/services/database')).db.getEventStats(mapped.id);
            setEventAnalytics(analytics);
            const trendData = await (await import('@/services/database')).db.getEventTrends(mapped.id);
            setTrend(trendData);
          }
        }
        // Load initial attendee count
        try {
          const { db } = await import('@/services/database');
          const c = await db.getEventTicketCount(mapped.id);
          setAttendeeCount(c);
        } catch {}
      } catch (e: any) {
        setError('Failed to load event.');
        // eslint-disable-next-line no-console
        console.error('EventDetails load failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, user]);

  // Realtime attendee count for this event
  useEffect(() => {
    if (!eventId) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { subscribeToEventRegistrationCount } = await import('@/services/database');
        cleanup = subscribeToEventRegistrationCount(eventId, (count) => setAttendeeCount(count));
      } catch {
        // ignore
      }
    })();
    return () => { if (cleanup) try { cleanup(); } catch {} };
  }, [eventId]);

  // Recent Activity (names fetched from profiles by user_id)
  useEffect(() => {
    const loadRecent = async () => {
      if (!eventId) return;
      if (!isSupabaseEnabled || !supabase) {
        setRecent([]);
        return;
      }
      setRecentLoading(true);
      setRecentError(null);
      try {
        // Fetch latest registrations and tickets separately
        const [{ data: rsvps }, { data: tix }] = await Promise.all([
          supabase
            .from('registrations')
            .select('registration_id, user_id, created_at')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('tickets')
            .select('ticket_id, user_id, is_checked_in, checked_in_at, created_at')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })
            .limit(30),
        ]);

        const regs = (rsvps as any[]) ?? [];
        const tickets = ((tix as any[]) ?? []).filter(t => t.is_checked_in);

        const userIds = Array.from(new Set([
          ...regs.map(r => String(r.user_id)),
          ...tickets.map(t => String(t.user_id)),
        ].filter(Boolean)));

        const nameMap = new Map<string, { full_name?: string | null }>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds as any);
          (profs ?? []).forEach((p: any) => nameMap.set(String(p.user_id), { full_name: p.full_name }));
        }

        const rItems = regs.map(r => ({
          kind: 'RSVP' as const,
          time: r.created_at as string,
          name: nameMap.get(String(r.user_id))?.full_name ?? null,
        }));
        const cItems = tickets.map(t => ({
          kind: 'Check-in' as const,
          time: (t.checked_in_at ?? t.created_at) as string,
          name: nameMap.get(String(t.user_id))?.full_name ?? null,
        }));

        const merged = [...rItems, ...cItems]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 20);
        setRecent(merged);
      } catch (e) {
        setRecentError('Failed to load recent activity');
      } finally {
        setRecentLoading(false);
      }
    };
    loadRecent();
  }, [eventId]);

  // Check if this user already RSVPed to this event
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        if (!user || !eventId) return;
        // Use session-bound lookup to avoid id mismatches
        const already = await db.hasUserTicket(eventId);
        if (mounted) setHasTicket(prev => prev || already);
        try {
          const paid = await db.hasUserPaid(eventId);
          if (mounted) setHasPaid(paid);
        } catch {}
      } catch {}
    };
    run();
    return () => { mounted = false; };
  }, [eventId, user?.id]);

  const handleRSVPConfirm = async () => {
    if (!user || !event) return;
    setIsRSVPing(true);
    try {
      // Prevent RSVPs to past events
      const starts = new Date(event.date);
      if (starts <= new Date()) {
        toast({
          variant: 'destructive',
          title: 'Event Passed',
          description: 'This event has already ended. RSVP is closed.',
        });
        return;
      }
      // Pre-check capacity to show a friendly message
      const full = await db.isEventFull(event.id);
      if (full) {
        toast({
          variant: 'destructive',
          title: 'Event Full',
          description: 'This event has reached its capacity.',
        });
        return;
      }
      const t = await db.createTicket(event.id);
      // Optimistically bump local count
      setAttendeeCount((c) => c + 1);
      toast({
        title: 'RSVP Successful!',
        description: `Ticket created${t?.id ? ` (#${t.id})` : ''}. Check My Tickets to view it.`,
      });
      navigate('/my-tickets');
    } catch (e) {
      const msg = (e as any)?.message || 'Unable to RSVP at this time';
      toast({
        variant: 'destructive',
        title: 'RSVP Failed',
        description: msg,
      });
    } finally {
      setIsRSVPing(false);
      setShowRSVPDialog(false);
    }
  };

  if (!user) return <LoginForm />;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(user && (user.role === 'company' || user.role === 'admin') ? '/my-events' : '/search')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {loading ? (
          <Card className="animate-pulse">
            <div className="aspect-video bg-muted" />
            <CardContent className="p-6 space-y-3">
              <div className="h-7 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardContent>
          </Card>
        ) : error || !event ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive">{error ?? 'Event not found.'}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-elevated">
            {event.imageUrl ? (
              <div className="aspect-video overflow-hidden">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-primary flex items-center justify-center text-primary-foreground">
                <span className="text-xl font-semibold px-4 text-center line-clamp-2">{event.title}</span>
              </div>
            )}

            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
                  <div className="flex gap-2 mb-2">
                    {event.category && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20">
                        {event.category}
                      </Badge>
                    )}
                    {event.isApproved ? (
                      <Badge variant="outline" className="border-green-600 text-green-700">Published</Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-600 text-yellow-700">Pending</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary" /> {format(new Date(event.date), 'PPP p')}</div>
                    <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary" /> {event.location}</div>
                    <div className="flex items-center"><Users className="w-4 h-4 mr-2 text-primary" /> {attendeeCount} / {event.maxCapacity} attending</div>
                  </div>
                </div>
                {user?.role === 'student' && (
                  hasTicket ? (
                    <Button variant="outline" onClick={() => navigate('/my-tickets')}>
                      View Ticket
                    </Button>
                  ) : event.isApproved ? (
                    <AlertDialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
                      <AlertDialogTrigger asChild>
                        <Button onClick={() => setShowRSVPDialog(true)} disabled={isRSVPing} className="bg-gradient-to-r from-primary to-primary/90">
                          {isRSVPing ? 'RSVPing…' : 'RSVP'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm RSVP</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to RSVP to <b>{event.title}</b>? This will secure your spot if available.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isRSVPing}>Cancel</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button onClick={handleRSVPConfirm} disabled={isRSVPing}>
                              {isRSVPing ? 'RSVPing…' : 'Confirm RSVP'}
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null
                )}
                {/* Paid event: show Pay Now if user hasn't paid yet but has RSVP (or hasTicket is true) */}
                {user?.role === 'student' && event.isPaid && (
                  <div className="ml-4">
                    <PayNowButton
                      eventId={event.id}
                      amount={event.price ?? 0}
                      initialPaid={hasPaid}
                      onPaid={() => setHasPaid(true)}
                    />
                  </div>
                )}
                {user && (user.role === 'company' || user.role === 'admin') && event.organizerId === user.id && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/scan/${event.id}`)}>
                      <ScanQrCode className="w-4 h-4 mr-2" /> Scan Tickets
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {event.description && (
                <section>
                  <h3 className="font-semibold mb-2">About this event</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                </section>
              )}

              {/* Recent Activity with Full History shortcut (rendered beneath analytics) */}
              {user && (user.role === 'company' || user.role === 'admin') && user.id === event.organizerId && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Recent Activity</h3>
                    <Button variant="secondary" asChild>
                      <Link to={`/events/${event.id}/history`}>Full History</Link>
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {recentLoading ? (
                      <div>Loading…</div>
                    ) : recentError ? (
                      <div className="text-destructive">{recentError}</div>
                    ) : recent.length === 0 ? (
                      <div>No activity yet.</div>
                    ) : (
                      recent.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b last:border-0 py-2">
                          <div className="flex items-center gap-2">
                            <span className={it.kind === 'Check-in' ? 'text-green-700' : 'text-primary'}>{it.kind}</span>
                            <span className="text-muted-foreground">{it.name ?? 'New attendee'}</span>
                          </div>
                          <div className="text-muted-foreground">{new Date(it.time).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}
              

              {event.tags && event.tags.length > 0 && (
                <section>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((t: string, i: number) => (
                      <Badge key={i} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </section>
              )}

              

              {user && (user.role === 'company' || user.role === 'admin') && user.id === event.organizerId && (
                <section>
                  <h3 className="font-semibold mb-3">Event Analytics</h3>
                  {!eventAnalytics ? (
                    <div className="text-sm text-muted-foreground">Loading analytics…</div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">RSVPs</p>
                              <p className="text-2xl font-bold">{eventAnalytics.totalRegistrations}</p>
                            </div>
                            <Users className="w-6 h-6 text-accent" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Checked-in</p>
                              <p className="text-2xl font-bold">{eventAnalytics.checkedIn}</p>
                            </div>
                            <BarChart3 className="w-6 h-6 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Check-in Percentage</p>
                              <p className="text-2xl font-bold">{eventAnalytics.attendanceRate}%</p>
                            </div>
                            <Target className="w-6 h-6 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  <div className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>RSVPs vs Check-ins (Last 14 days)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={{
                            rsvps: { label: 'RSVPs', color: 'hsl(var(--primary))' },
                            checkins: { label: 'Check-ins', color: 'hsl(var(--accent))' },
                          }}
                          className="w-full h-[240px]"
                        >
                          <BarChart data={trend} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend content={<ChartLegendContent />} />
                            <Bar dataKey="rsvps" fill="var(--color-rsvps)" radius={[4,4,0,0]} />
                            <Bar dataKey="checkins" fill="var(--color-checkins)" radius={[4,4,0,0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Small Pay Now button component (local to this file)
const PayNowButton: React.FC<{ eventId: string; amount: number; initialPaid?: boolean; onPaid?: () => void }> = ({ eventId, amount, initialPaid = false, onPaid }) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [paid, setPaid] = React.useState(initialPaid);

  const handlePay = async () => {
    setLoading(true);
    try {
      // call db helper which invokes the RPC
      const res = await (await import('@/services/database')).db.processMockPayment(eventId, amount);
      if (res.status && String(res.status).toLowerCase() === 'success') {
        setPaid(true);
        toast({ title: 'Payment Successful', description: res.message ?? 'Your payment was processed (mock).' });
        try { if (onPaid) onPaid(); } catch {}
      } else {
        toast({ variant: 'destructive', title: 'Payment Failed', description: res.message ?? 'Mock payment failed. Please try again.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Payment Error', description: (e?.message) || 'Failed to process payment.' });
    } finally {
      setLoading(false);
    }
  };

  if (paid) return <Button variant="primary" disabled>Paid</Button>;
  return (
    <Button onClick={handlePay} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-emerald-400">
      {loading ? 'Processing…' : `Pay Now ${amount ? `- $${amount.toFixed(2)}` : ''}`}
    </Button>
  );
};

export default EventDetails;
