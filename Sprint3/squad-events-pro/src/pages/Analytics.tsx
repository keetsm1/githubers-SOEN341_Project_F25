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
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip, Legend } from 'recharts';

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<Array<{ action: string; event: string; time: string }>>([]);
  const [trend, setTrend] = useState<{ date: string; rsvps: number; checkins: number }[]>([]);
  const [series, setSeries] = useState<'rsvps' | 'checkins'>('rsvps');

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
      events = events.map((e) => {
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

      // Recent activity: latest ticket creations across organizer's events
      if (isSupabaseEnabled && supabase && events.length > 0) {
        const { data } = await supabase
          .from('tickets')
          .select('created_at, event_id, events!inner(title)')
          .in('event_id', events.map((e) => e.id))
          .order('created_at', { ascending: false })
          .limit(5);
        const mapped = (data ?? []).map((row: any) => ({
          action: 'New registration',
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your events performance and engagement
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
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
                      <p className="text-sm text-muted-foreground">Total Events</p>
                      <p className="text-3xl font-bold text-primary">{myEvents.length}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Organizer events
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
                      <p className="text-3xl font-bold text-accent">{analytics?.totalRegistrations || 0}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Across all your events
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
                      <p className="text-3xl font-bold text-primary">{analytics?.attendanceRate || 0}%</p>
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
                      <p className="text-3xl font-bold text-accent">{analytics?.checkedIn || 0}</p>
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
                  <CardTitle>Event Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {event.currentAttendees} / {event.maxCapacity} attendees
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={event.currentAttendees >= event.maxCapacity * 0.8 ? 'default' : 'secondary'}
                          >
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
                    <LineChart data={trend} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      {series === 'rsvps' ? (
                        <Line type="monotone" dataKey="rsvps" stroke="var(--color-rsvps)" dot={false} strokeWidth={2} />
                      ) : (
                        <Line type="monotone" dataKey="checkins" stroke="var(--color-checkins)" dot={false} strokeWidth={2} />
                      )}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(recent.length ? recent : []).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border-l-4 border-l-primary bg-muted/20 rounded-r-lg">
                      <div className={`w-2 h-2 rounded-full bg-green-500`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.event}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                  {recent.length === 0 && (
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