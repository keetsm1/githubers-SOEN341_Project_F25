import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import EditEventDialog from '@/components/events/EditEventDialog';
import DeleteEventDialog from '@/components/events/DeleteEventDialog';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event } from '@/services/database';
import LoginForm from '@/components/auth/LoginForm';
import { useToast } from '@/hooks/use-toast';

const AllEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleEditById = (eventId: string) => {
    const ev = events.find(e => e.id === eventId) || null;
    setEditingEvent(ev);
    setEditDialogOpen(Boolean(ev));
  };

  const handleSaveEdit = async (eventId: string, updates: Partial<Event>) => {
    await db.updateEvent(eventId, updates);
    await loadEvents();
  };

  const handleDeleteById = (eventId: string) => {
    const ev = events.find(e => e.id === eventId) || null;
    setDeletingEvent(ev);
    setDeleteDialogOpen(Boolean(ev));
  };

  const handleConfirmDelete = async (eventId: string) => {
    try {
      // Admin deletes any event, regardless of owner/status
      if (user?.role === 'admin' && (db as any).deleteEventAdmin) {
        await (db as any).deleteEventAdmin(eventId);
      } else {
        await db.deleteEvent(eventId);
      }
      toast({ title: 'Success', description: 'Event deleted successfully' });
      await loadEvents();
    } catch (error) {
      // Check for foreign key constraint violation (approved events can't be deleted)
      const errorCode = (error as any)?.code;
      let errorMessage = 'Failed to delete event';
      
      if (errorCode === '23503') {
        errorMessage = 'Cannot delete this event because it is approved';
      } else if ((error as any)?.message) {
        errorMessage = (error as any).message;
      }
      
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
                onEdit={(id) => handleEditById(id)}
                onDelete={(id) => handleDeleteById(id)}
                showActions={true}
              />
            ))}
          </div>
        )}

        <EditEventDialog
          event={editingEvent}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveEdit}
        />

        <DeleteEventDialog
          event={deletingEvent}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
};

export default AllEvents;