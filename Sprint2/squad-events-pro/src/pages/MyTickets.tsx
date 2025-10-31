import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { db, Ticket, Event, getEventById } from '@/services/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, QrCode, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const tickets = await db.getUserTickets(user.id);
        const enriched = await Promise.all(
          tickets.map(async (t) => {
            try {
              const row = await getEventById(t.eventId);
              const ev: Event = {
                id: (row as any).event_id ?? t.eventId,
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
                createdAt: (row as any).created_at,
              };
              return { ticket: t, event: ev } as EnrichedTicket;
            } catch {
              return { ticket: t, event: null } as EnrichedTicket;
            }
          })
        );
        setItems(enriched);
      } catch (e: any) {
        setError('Failed to load tickets.');
        // eslint-disable-next-line no-console
        console.error('MyTickets load failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (!user) return <LoginForm />;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Tickets</h1>
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
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary" /> {format(new Date(event.date), 'PPP p')}</div>
                          <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary" /> {event.location}</div>
                        </div>
                      )}
                    </div>
                    <Badge variant={ticket.isCheckedIn ? 'default' : 'outline'}>
                      {ticket.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                    <QrCode className="w-5 h-5 text-primary" />
                    <code className="text-sm break-all">{ticket.qrCode}</code>
                  </div>
                  <div className="mt-4 flex justify-end">
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
      </div>
    </div>
  );
};

export default MyTickets;
