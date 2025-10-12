import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  Plus, 
  TrendingUp, 
  Star,
  Clock,
  MapPin
} from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event, listEvents } from '@/services/database';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Latest published events for the Trending section
      const eventsResponse = await db.getEvents({ limit: 6, approved: true });
      setUpcomingEvents(eventsResponse.data);

      // Today's schedule from Supabase (published events whose starts_at falls today)
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const todays = await listEvents({
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        sort: 'soonest',
      });
      setTodaysEvents(todays);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirect based on user role
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/dashboard');
      return;
    }
    if (user?.role === 'company') {
      navigate('/my-events');
      return;
    }
  }, [user, navigate]);

  if (!user) {
    return <LoginForm />;
  }

  // Student dashboard
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            Discover exciting events happening on campus
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Events This Week</p>
                  <p className="text-2xl font-bold text-primary">12</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My RSVPs</p>
                  <p className="text-2xl font-bold text-accent">5</p>
                </div>
                <Star className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Friends Online</p>
                  <p className="text-2xl font-bold text-primary">23</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trending</p>
                  <p className="text-2xl font-bold text-accent">AI Workshop</p>
                </div>
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={() => navigate('/search')}
              className="bg-gradient-to-r from-primary to-primary/90"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Browse Events
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/create-event')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/friends')}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Friends
            </Button>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Trending Events</h2>
            <Button 
              variant="outline" 
              onClick={() => navigate('/search')}
            >
              View All
            </Button>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-6 bg-muted rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRSVP={async (eventId) => {
                    await db.createTicket(eventId, user.id);
                    loadDashboardData();
                  }}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Today's Schedule (dynamic) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-3 h-3 bg-muted rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : todaysEvents.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No events scheduled for today. <button className="underline" onClick={() => navigate('/search')}>Browse all events</button>.
              </div>
            ) : (
              <div className="space-y-4">
                {todaysEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate('/search')}
                    role="button"
                    aria-label={`View ${ev.title} in events`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      <div>
                        <p className="font-medium">{ev.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </p>
                      </div>
                    </div>
                    <Badge>{new Date(ev.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
