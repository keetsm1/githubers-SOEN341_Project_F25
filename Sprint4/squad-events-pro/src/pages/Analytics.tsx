import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Download
} from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, Analytics as AnalyticsType, Event } from '@/services/database';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import LoginForm from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<Array<{ action: string; event: string; time: string }>>([]);
  const [trend, setTrend] = useState<{ date: string; rsvps: number; checkins: number }[]>([]);
  const [series, setSeries] = useState<'rsvps' | 'checkins'>('rsvps');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filteredAnalytics, setFilteredAnalytics] = useState<AnalyticsType | null>(null);
  const [filteredTrend, setFilteredTrend] = useState<{ date: string; rsvps: number; checkins: number }[]>([]);

  useEffect(() => {
    if (user?.role === 'company') {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      // Load company's events
      const eventsResponse = await db.getEvents({ organizerId: user.id });
      let events = eventsResponse.data;

      // Fetch attendance counts for these events
      const attendance = await db.getEventAttendance(events.map((e) => e.id));
      events = events.filter((e) => e.isApproved).map((e) => {
        const a = attendance[e.id];
        return { ...e, currentAttendees: a ? a.total : 0 };
      });
      setMyEvents(events);

      // Organizer-level aggregated analytics
      const organizerAnalytics = await db.getOrganizerStats(user.id);
      setAnalytics(organizerAnalytics);

      // Dual-series trend (RSVPs vs Check-ins)
      const t = await db.getOrganizerTrends(user.id);
      setTrend(t);

      // Recent activity: latest ticket creations across organizer's events with attendee names
      if (isSupabaseEnabled && supabase && events.length > 0) {
        const { data: tix } = await supabase
          .from('tickets')
          .select('created_at, event_id, user_id, events!inner(title)')
          .in('event_id', events.map((e) => e.id))
          .order('created_at', { ascending: false })
          .limit(10);
        const tickets = (tix ?? []) as any[];
        const userIds = Array.from(new Set(tickets.map(t => String(t.user_id)).filter(Boolean)));
        let nameMap = new Map<string, string | null>();
        if (userIds.length > 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', userIds as any);
            nameMap = new Map((profs ?? []).map((p: any) => [String(p.user_id), p.full_name ?? null]));
          } catch { }
        }
        const mapped = tickets.map((row: any) => ({
          action: nameMap.get(String(row.user_id)) ? `${nameMap.get(String(row.user_id))} RSVP` : 'New registration',
          event: row.events?.title ?? 'Event',
          time: new Date(row.created_at).toLocaleString(),
        }));
        setRecent(mapped);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventFilter = async (eventId: string | null) => {
    setSelectedEventId(eventId);

    if (!eventId) {
      // Reset to all events
      setFilteredAnalytics(null);
      setFilteredTrend([]);
      return;
    }

    try {
      // Get analytics for specific event
      const eventAnalytics = await db.getEventStats?.(eventId);
      setFilteredAnalytics(eventAnalytics || null);

      // Get trend data for specific event
      const eventTrend = await db.getEventTrends?.(eventId);
      setFilteredTrend(eventTrend || []);
    } catch (error) {
      console.error('Error filtering analytics by event:', error);
    }
  };

  const exportReport = () => {
    const organizerId = user?.id ?? 'unknown';
    const organizerName =
      // try common user fields for display
      (user as any)?.full_name || (user as any)?.name || (user as any)?.org_name || user?.email || 'Organizer';
    const totals = {
      totalEvents: myEvents.length,
      totalRegistrations: analytics?.totalRegistrations ?? 0,
      checkedIn: analytics?.checkedIn ?? 0,
      attendanceRate: analytics?.attendanceRate ?? 0,
    };

    const lines: string[] = [];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    // Report title
    lines.push(`Analytics Report - ${organizerName} (${organizerId})`);
    lines.push('');

    // Totals section
    lines.push('Totals');
    lines.push(['Total Events', 'Total RSVPs', 'Checked-in', 'Check-in Percentage'].map(esc).join(','));
    lines.push([
      totals.totalEvents,
      totals.totalRegistrations,
      totals.checkedIn,
      `${totals.attendanceRate}%`,
    ].map(esc).join(','));
    lines.push('');

    // Per-event section
    lines.push('Per Event');
    lines.push(['Event Title', 'Event ID', 'RSVPs', 'Capacity'].map(esc).join(','));
    myEvents.forEach((e) => {
      lines.push([
        e.title,
        (e as any).id ?? (e as any).event_id,
        e.currentAttendees ?? 0,
        e.maxCapacity ?? 0,
      ].map(esc).join(','));
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${organizerId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return <LoginForm />;
  }

  if (user.role !== 'company') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
              <p className="text-muted-foreground">
                Analytics are only available for company organizers.
              </p>
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
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Track your events performance and engagement
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-8 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Events
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {selectedEventId ? 1 : myEvents.length}
                      </p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {selectedEventId ? 'Selected event' : 'Organizer events'}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Registrations</p>
                      <p className="text-3xl font-bold text-accent">
                        {selectedEventId
                          ? filteredAnalytics?.totalRegistrations || 0
                          : analytics?.totalRegistrations || 0}
                      </p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {selectedEventId ? 'For selected event' : 'Across all your events'}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-accent opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <p className="text-3xl font-bold text-primary">
                        {selectedEventId
                          ? filteredAnalytics?.attendanceRate || 0
                          : analytics?.attendanceRate || 0}%
                      </p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Checked-in / Tickets
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Checked-in</p>
                      <p className="text-3xl font-bold text-accent">
                        {selectedEventId
                          ? filteredAnalytics?.checkedIn || 0
                          : analytics?.checkedIn || 0}
                      </p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Total attendees checked-in
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-accent opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Performance */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>
                    {selectedEventId ? 'Event Details' : 'Event Performance'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedEventId
                      ? myEvents
                        .map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleEventFilter(selectedEventId === event.id ? null : event.id)}
                            className={`flex items-center justify-between p-4 rounded-lg cursor-pointer ${selectedEventId === event.id ? 'bg-muted/40 ring-2 ring-primary' : 'bg-muted/30'}`}>
                            <div className="flex-1">
                              <h3 className="font-medium">{event.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {event.currentAttendees} / {event.maxCapacity} attendees
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={event.currentAttendees >= event.maxCapacity * 0.8 ? 'default' : 'secondary'}>
                                {Math.round((event.currentAttendees / event.maxCapacity) * 100)}% Full
                              </Badge>
                            </div>
                          </div>
                        ))
                      : myEvents
                        .sort((a, b) => (b.currentAttendees || 0) - (a.currentAttendees || 0))
                        .map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleEventFilter(selectedEventId === event.id ? null : event.id)}
                            className={`flex items-center justify-between p-4 rounded-lg cursor-pointer ${selectedEventId === event.id ? 'bg-muted/40 ring-2 ring-primary' : 'bg-muted/30'}`}>
                            <div className="flex-1">
                              <h3 className="font-medium">{event.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {event.currentAttendees} / {event.maxCapacity} attendees
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={event.currentAttendees >= event.maxCapacity * 0.8 ? 'default' : 'secondary'}>
                                {Math.round((event.currentAttendees / event.maxCapacity) * 100)}% Full
                              </Badge>
                            </div>
                          </div>
                        ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trends */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{series === 'rsvps' ? 'RSVPs' : 'Check-ins'} (Last 14 days)</CardTitle>
                    <div className="flex gap-2 text-xs">
                      <Button size="sm" variant={series === 'rsvps' ? 'default' : 'outline'} onClick={() => setSeries('rsvps')}>RSVPs</Button>
                      <Button size="sm" variant={series === 'checkins' ? 'default' : 'outline'} onClick={() => setSeries('checkins')}>Check-ins</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      rsvps: { label: 'RSVPs', color: 'hsl(var(--primary))' },
                      checkins: { label: 'Check-ins', color: 'hsl(var(--accent))' },
                    }}
                    className="w-full h-[280px]"
                  >
                    <BarChart data={selectedEventId ? filteredTrend : trend} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      <Bar dataKey="rsvps" fill="var(--color-rsvps)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="checkins" fill="var(--color-checkins)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>
                  {selectedEventId ? 'Recent Activity for Selected Event' : 'Recent Activity'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(recent.length ? recent : [])
                    .filter((activity) => !selectedEventId || activity.event === myEvents.find(e => e.id === selectedEventId)?.title)
                    .slice(0, 10)
                    .map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 border-l-4 border-l-primary bg-muted/20 rounded-r-lg">
                        <div className={`w-2 h-2 rounded-full bg-green-500`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.event}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  {(recent.length === 0 || (selectedEventId && !recent.some(a => a.event === myEvents.find(e => e.id === selectedEventId)?.title))) && (
                    <div className="text-sm text-muted-foreground">No recent activity.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;