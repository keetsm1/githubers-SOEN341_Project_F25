 import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Calendar, Shield, AlertCircle, TrendingDown, Clock, ExternalLink } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, Analytics } from '@/services/database';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import LoginForm from '@/components/auth/LoginForm';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [pendingEvents, setPendingEvents] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [pendingEventsList, setPendingEventsList] = useState<any[]>([]);
  const [pendingOrgsList, setPendingOrgsList] = useState<any[]>([]);
  const [lowRegistrationEvents, setLowRegistrationEvents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      if (isSupabaseEnabled && supabase) {
        const now = new Date();
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(now.getDate() + 7);

        const [
          { count: publishedCount },
          { count: pendingCount },
          { count: usersCount },
          { count: registrationsCount },
          { count: checkedInCount },
          pendingEventsData,
          pendingOrgsData,
          upcomingEventsData,
        ] = await Promise.all([
          // Count published events
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published'),
          
          // Count pending events
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          
          // Count total users
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
          
          // Count total registrations
          supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true }),
          
          // Count checked-in tickets
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('is_checked_in', true),
          
          // Fetch pending events (top 5)
          supabase
            .from('events')
            .select('event_id, title, created_at, org_name, max_cap')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),
          
          // Fetch pending organization applications (top 5)
          supabase
            .from('organization_applications')
            .select('application_id, org_name, email, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),
          
          // Fetch upcoming events (next 7 days)
          supabase
            .from('events')
            .select('event_id, title, starts_at, location, org_name')
            .eq('status', 'published')
            .gte('starts_at', now.toISOString())
            .lte('starts_at', sevenDaysFromNow.toISOString())
            .order('starts_at', { ascending: true })
            .limit(5),
        ]);
        
        setTotalEvents(publishedCount || 0);
        setPendingEvents(pendingCount || 0);
        setTotalUsers(usersCount || 0);
        
        // Calculate attendance rate
        const regCount = registrationsCount || 0;
        const checkedIn = checkedInCount || 0;
        const rate = regCount > 0 ? Math.round((checkedIn / regCount) * 100) : 0;
        setAttendanceRate(rate);

        // Set lists
        setPendingEventsList(pendingEventsData.data || []);
        setPendingOrgsList(pendingOrgsData.data || []);
        setUpcomingEvents(upcomingEventsData.data || []);

        // Fetch events with low registration (less than 20% capacity)
        const { data: allPublishedEvents } = await supabase
          .from('events')
          .select('event_id, title, max_cap, org_name, starts_at')
          .eq('status', 'published')
          .gte('starts_at', now.toISOString())
          .not('max_cap', 'is', null)
          .order('starts_at', { ascending: true });

        if (allPublishedEvents) {
          const lowRegEvents = await Promise.all(
            allPublishedEvents.map(async (event) => {
              const { count: regCount } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.event_id);

              const registrationRate = event.max_cap ? (regCount || 0) / event.max_cap : 0;
              
              return {
                ...event,
                registration_count: regCount || 0,
                registration_rate: Math.round(registrationRate * 100),
              };
            })
          );

          // Filter events with less than 20% registration and sort by rate
          const filtered = lowRegEvents
            .filter(e => e.registration_rate < 20 && e.max_cap > 0)
            .sort((a, b) => a.registration_rate - b.registration_rate)
            .slice(0, 5);

          setLowRegistrationEvents(filtered);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
              <p className="text-muted-foreground">This dashboard is only available for administrators.</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Campus Events Platform Overview</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-3xl font-bold text-primary">{totalEvents}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold text-accent">{totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    <p className="text-3xl font-bold text-primary">{attendanceRate}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                    <p className="text-3xl font-bold text-yellow-600">{pendingEvents}</p>
                  </div>
                  <Shield className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Items & Alerts */}
        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Pending Event Approvals */}
          <Card className="shadow-card border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Pending Event Approvals
                </div>
                <Badge variant="destructive">{pendingEvents}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : pendingEventsList.length > 0 ? (
                <div className="space-y-3">
                  {pendingEventsList.map((event) => (
                    <div
                      key={event.event_id}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      onClick={() => navigate('/admin/approve-events')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.org_name || 'Student Event'} • {new Date(event.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                    </div>
                  ))}
                  {pendingEvents > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate('/admin/approve-events')}
                    >
                      View All {pendingEvents} Pending Events
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending events to approve
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pending Organization Applications */}
          <Card className="shadow-card border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Pending Organization Applications
                </div>
                <Badge variant="secondary" className="bg-orange-500 text-white">{pendingOrgsList.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : pendingOrgsList.length > 0 ? (
                <div className="space-y-3">
                  {pendingOrgsList.map((org) => (
                    <div
                      key={org.application_id}
                      className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors cursor-pointer"
                      onClick={() => navigate('/admin/approve-companies')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{org.org_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.email} • {new Date(org.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/admin/approve-companies')}
                  >
                    Review All Applications
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending organization applications
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Registration & Upcoming Events */}
        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Events with Low Registration */}
          <Card className="shadow-card border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-yellow-500" />
                  Low Registration Events
                </div>
                <Badge variant="secondary" className="bg-yellow-500 text-white">{lowRegistrationEvents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : lowRegistrationEvents.length > 0 ? (
                <div className="space-y-3">
                  {lowRegistrationEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm truncate flex-1">{event.title}</p>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {event.registration_rate}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{event.org_name || 'Student Event'}</span>
                        <span>{event.registration_count}/{event.max_cap} registered</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{ width: `${event.registration_rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  All events have healthy registration rates! 🎉
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events (Next 7 Days) */}
          <Card className="shadow-card border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Upcoming Events (Next 7 Days)
                </div>
                <Badge variant="secondary" className="bg-blue-500 text-white">{upcomingEvents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/events/${event.event_id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.starts_at).toLocaleDateString()} • {event.location || 'TBA'}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming events in the next 7 days
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;