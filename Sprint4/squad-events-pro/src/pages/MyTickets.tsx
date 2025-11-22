import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { db, Ticket, Event, getEventById } from '@/services/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, QrCode, ArrowRight, RotateCcw, Loader2, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePayment } from '@/contexts/PaymentContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EnrichedTicket {
  ticket: Ticket;
  event: Event | null;
}

const MyTickets: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EnrichedTicket[]>([]);
  const [confirming, setConfirming] = useState<EnrichedTicket | null>(null);
  const [canceling, setCanceling] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const paymentCtx = usePayment();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await db.getUserTickets(user.id);
      // Deduplicate tickets defensively: prefer unique by ticket.id, else by eventId:userId
      const dedupMap = new Map<string, Ticket>();
      for (const t of raw) {
        const key = t.id ? `id:${t.id}` : `eu:${t.eventId}:${t.userId}`;
        if (!dedupMap.has(key)) dedupMap.set(key, t);
      }
      const tickets = Array.from(dedupMap.values());

      // Fetch unique events only once for performance
      const uniqueEventIds = Array.from(new Set(tickets.map(t => t.eventId)));
      const eventMap = new Map<string, Event | null>();
      await Promise.all(
        uniqueEventIds.map(async (eid) => {
          try {
            const row = await getEventById(eid);
            const ev: Event = {
              id: (row as any).event_id ?? eid,
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
                      isApproved: (row as any).status === 'published' || (row as any).status === true,
                      isPaid: !!(row as any).is_paid,
                      price: row.price ? Number(row.price) : 0,
              createdAt: (row as any).created_at,
            };
            eventMap.set(eid, ev);
          } catch {
            eventMap.set(eid, null);
          }
        })
      );

      const enriched: EnrichedTicket[] = tickets.map((t) => ({
        ticket: t,
        event: eventMap.get(t.eventId) ?? null,
      }));

      // Apply local payment state so UI reflects payments persisted locally
      const mapped = enriched.map(it => {
        const locally = paymentCtx.hasPaidLocally(it.ticket.eventId);
        return { ...it, ticket: { ...it.ticket, isPaid: it.ticket.isPaid || locally } };
      });
      setItems(mapped);
    } catch (e: any) {
      setError('Failed to load tickets.');
      // eslint-disable-next-line no-console
      console.error('MyTickets load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, paymentCtx]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-apply local payment state when the payment context changes (ensures persistence after refresh)
  useEffect(() => {
    const applyLocal = () => {
      setItems((prev) => prev.map(it => {
        try {
          const locally = paymentCtx.hasPaidLocally(it.ticket.eventId);
          return { ...it, ticket: { ...it.ticket, isPaid: it.ticket.isPaid || locally } };
        } catch {
          return it;
        }
      }));
    };

    // Run once to sync after mount
    applyLocal();

    // No subscription API on context, but re-run when provider state changes (object identity)
    // We rely on React re-rendering consumers when context.payments updates; calling applyLocal again
    // ensures the list reflects any new payments.
  }, [paymentCtx.payments]);

  if (!user) return <LoginForm />;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" /> Refresh
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">You haven’t RSVPed to any events yet.</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate('/search')}>Browse Events</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(({ ticket, event }) => (
              <Card key={ticket.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {event ? (
                          <Link to={`/events/${event.id}`} className="hover:underline">{event.title}</Link>
                        ) : (
                          'Event'
                        )}
                      </CardTitle>
                          {event && (
                        <>
                          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary" /> {format(new Date(event.date), 'PPP p')}</div>
                            <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary" /> {event.location}</div>
                          </div>
                          {typeof event.price !== 'undefined' && (
                            <div className="mt-2 text-sm text-muted-foreground">Price: {event.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}</div>
                          )}
                        </>
                      )}
                    </div>
                    <Badge variant={ticket.isCheckedIn ? 'default' : 'outline'}>
                      {ticket.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex items-center gap-4 p-3 rounded-md border bg-muted/30">
                    <div className="bg-white p-2 rounded">
                      <QRCodeSVG value={ticket.qrCode} size={96} />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="w-5 h-5 text-primary shrink-0" />
                      <code className="text-sm break-all">
                        {ticket.qrCode}
                      </code>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    RSVP’d on {format(new Date(ticket.createdAt), 'PPP p')}
                  </div>
                  <div className="mt-4 flex justify-between items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirming({ ticket, event })}
                      disabled={canceling}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Cancel RSVP
                    </Button>
                    {event && ( (event.isPaid || (event.price > 0)) ) && (
                      (ticket.isPaid || paymentCtx.hasPaidLocally(ticket.eventId)) ? (
                        <Button variant="primary" size="sm" disabled>Paid</Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            const amountToPay = event.price > 0 ? event.price : undefined;
                            try {
                              const idx = items.findIndex(it => it.ticket.id === ticket.id);
                              const res = await db.processMockPayment(ticket.eventId, amountToPay);
                              if (res && (String(res.status).toLowerCase() === 'success' || res.status === 'success')) {
                                // mark locally as paid in our context
                                try { paymentCtx.markPaid(ticket.eventId, amountToPay, res); } catch {}
                                const copy = [...items];
                                copy[idx] = { ...copy[idx], ticket: { ...copy[idx].ticket, isPaid: true } };
                                setItems(copy);
                                paymentCtx.showConfirmation({ eventId: ticket.eventId, title: event.title, amount: amountToPay, status: 'success', retry: null });
                              } else {
                                paymentCtx.showConfirmation({ eventId: ticket.eventId, title: event.title, amount: amountToPay, status: 'failure', retry: async () => {
                                  /* retry closure: re-run click handler */
                                } });
                                toast({ variant: 'destructive', title: 'Payment Failed', description: res?.message ?? 'Mock payment failed. Try again.' });
                              }
                            } catch (e: any) {
                              paymentCtx.showConfirmation({ eventId: ticket.eventId, title: event.title, amount: amountToPay, status: 'failure', retry: async () => { /* retry closure */ } });
                              toast({ variant: 'destructive', title: 'Payment Error', description: e?.message ?? 'Failed to process payment.' });
                            }
                          }}
                        >
                          Pay Now
                        </Button>
                      )
                    )}
                    {event ? (
                      <Button variant="outline" asChild>
                        <Link to={`/events/${event.id}`}>
                          View Event <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>Event Unavailable</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={!!confirming} onOpenChange={(open) => !open && !canceling && setConfirming(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel RSVP?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your ticket for this event. You can RSVP again later if spots are available.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={canceling}>Keep Ticket</AlertDialogCancel>
              <AlertDialogAction
                disabled={canceling}
                onClick={async () => {
                  if (!confirming) return;
                  setCanceling(true);
                  // Optimistic UI: remove now
                  const tid = confirming.ticket.id;
                  const eid = confirming.ticket.eventId;
                  const prev = items;
                  setItems(items.filter((it) => it.ticket.id !== tid));
                  try {
                    await db.cancelRSVP(eid);
                    // Invalidate related queries (belt-and-suspenders)
                    try {
                      qc.invalidateQueries({ queryKey: ['events'] });
                      qc.invalidateQueries({ queryKey: ['event', eid] });
                      qc.invalidateQueries({ queryKey: ['tickets'] });
                      qc.invalidateQueries({ queryKey: ['tickets', user?.id] });
                    } catch {}
                    // Verify data integrity and auto-heal counters if needed
                    try {
                      let v = await db.verifyCancellationIntegrity(eid);
                      if (!v.ok && v.regCountInCounters !== v.regCountActual) {
                        await db.syncEventCounters(eid);
                        v = await db.verifyCancellationIntegrity(eid);
                      }
                      if (v.ok) {
                        toast({ title: 'RSVP cancelled', description: 'All linked data removed and counters verified.' });
                      } else {
                        // Log details for debugging but keep user informed
                        // eslint-disable-next-line no-console
                        console.warn('Post-cancel verification failed', v);
                        toast({
                          variant: 'destructive',
                          title: 'Verification incomplete',
                          description: 'Your ticket was removed, but a data check did not fully pass. Please refresh; we will resync shortly.',
                        });
                      }
                    } catch {
                      // If verification RPC not available, still show basic success
                      toast({ title: 'RSVP cancelled', description: 'Your ticket has been removed.' });
                    }
                    setConfirming(null);
                  } catch (e) {
                    // rollback on error
                    setItems(prev);
                    const msg = (e as any)?.message || 'Failed to cancel RSVP. Please try again.';
                    toast({ variant: 'destructive', title: 'Cancel failed', description: msg });
                  } finally {
                    setCanceling(false);
                  }
                }}
              >
                {canceling ? 'Cancelling...' : 'Yes, Cancel'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default MyTickets;
