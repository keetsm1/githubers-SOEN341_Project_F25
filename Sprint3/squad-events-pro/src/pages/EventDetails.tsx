import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { db } from '@/services/database';
import { Calendar, MapPin, Users, ArrowLeft, BarChart3, Target, ScanQrCode } from 'lucide-react';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [isRSVPing, setIsRSVPing] = useState(false);
  const [eventAnalytics, setEventAnalytics] = useState<import('@/services/database').Analytics | null>(null);
  const [trend, setTrend] = useState<{ date: string; rsvps: number; checkins: number }[]>([]);

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
          isApproved: (row as any).status === 'published' || (row as any).status === true,
          createdAt: (row as any).created_at,
          status: (row as any).status,
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

  const handleRSVP = async () => {
    if (!user || !event) return;
    setIsRSVPing(true);
    try {
      await db.createTicket(event.id, user.id);
      navigate('/my-events');
    } catch (e) {
      alert('Unable to RSVP at this time.');
    } finally {
      setIsRSVPing(false);
    }
  };

  if (!user) return <LoginForm />;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
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
                    <div className="flex items-center"><Users className="w-4 h-4 mr-2 text-primary" /> {event.currentAttendees} / {event.maxCapacity} attending</div>
                  </div>
                </div>
                {user?.role === 'student' && (
                  <Button onClick={handleRSVP} disabled={isRSVPing} className="bg-gradient-to-r from-primary to-primary/90">
                    {isRSVPing ? 'RSVPing…' : 'RSVP'}
                  </Button>
                )}
                {user && (user.role === 'company' || user.role === 'admin') && event.organizerId === user.id && (
                  <Button variant="outline" onClick={() => navigate(`/scan/${event.id}`)}>
                    <ScanQrCode className="w-4 h-4 mr-2" /> Scan Tickets
                  </Button>
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
                              <p className="text-xs text-muted-foreground">Registrations</p>
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
                              <p className="text-xs text-muted-foreground">Attendance Rate</p>
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
                          <LineChart data={trend} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend content={<ChartLegendContent />} />
                            <Line type="monotone" dataKey="rsvps" stroke="var(--color-rsvps)" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="checkins" stroke="var(--color-checkins)" dot={false} strokeWidth={2} />
                          </LineChart>
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

export default EventDetails;
