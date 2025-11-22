import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event } from '@/services/database';
import LoginForm from '@/components/auth/LoginForm';

const AllEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      const response = await db.getEvents({ limit: 50 });
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
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
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">All Events</h1>
          <p className="text-muted-foreground">Moderate and manage campus events</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse p-6">
                <div className="h-6 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={(id) => console.log('Edit event', id)}
                onDelete={async (id) => {
                  await db.deleteEvent(id);
                  loadEvents();
                }}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllEvents;