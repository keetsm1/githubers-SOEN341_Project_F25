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
import LoginForm from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'company') {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      // Load company's approved events only
      const eventsResponse = await db.getEvents({ organizerId: user.id });
      const approvedEvents = eventsResponse.data.filter(event =>
        event.isApproved && event.statusText === 'approved'
      );
      setMyEvents(approvedEvents);

      // Load aggregated analytics for the organizer (sum across all events)
      try {
        const orgAnalytics = await db.getOrganizerStats(user.id);
        setAnalytics(orgAnalytics);
      } catch (err) {
        // Fallback: if organizer-level stats fail, try per-event stats for the first event
        if (approvedEvents.length > 0) {
          const eventAnalytics = await db.getEventStats(approvedEvents[0].id);
          setAnalytics(eventAnalytics);
        }
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
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Events</p>
                      <p className="text-3xl font-bold text-primary">{myEvents.length}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +12% from last month
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
                      <p className="text-3xl font-bold text-accent">{analytics?.totalRegistrations}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +8% from last week
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
                        Above average
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-primary opacity-80" />
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

              {/* Registration Trends */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Registration Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">This Week</span>
                      <span className="font-semibold">32 registrations</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Week</span>
                      <span className="font-semibold">28 registrations</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: '70%' }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Month Average</span>
                      <span className="font-semibold">25 registrations</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-muted-foreground h-2 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
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
                  {[
                    { action: 'New registration', event: 'AI Workshop', time: '2 minutes ago', type: 'positive' },
                    { action: 'Event approved', event: 'Career Fair 2024', time: '1 hour ago', type: 'positive' },
                    { action: 'Ticket checked in', event: 'AI Workshop', time: '3 hours ago', type: 'neutral' },
                    { action: 'New registration', event: 'Study Session', time: '5 hours ago', type: 'positive' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border-l-4 border-l-primary bg-muted/20 rounded-r-lg">
                      <div className={`w-2 h-2 rounded-full ${activity.type === 'positive' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.event}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
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