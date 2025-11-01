import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Ticket, Star } from 'lucide-react';
import { format } from 'date-fns';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import StarredEvents from './StarredEvents';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event, Ticket as TicketType } from '@/services/database';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { QRCodeSVG } from 'qrcode.react';

const MyEvents = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myEvents, setMyEvents] = useState<Event[]>([]);
    const [myTickets, setMyTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [starredCount, setStarredCount] = useState(0);
    const [qrToShow, setQrToShow] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role === 'student') {
            db.getStarredEvents()
                .then(events => setStarredCount(events.length))
                .catch(() => setStarredCount(0));
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadMyData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadMyData = async () => {
        if (!user) return;

        try {
            // Load events created by this user
            const eventsResponse = await db.getEvents({ organizerId: user.id });
            setMyEvents(eventsResponse.data);

            // Load tickets for this user (student only)
            if (user.role === 'student') {
                const tickets = await db.getUserTickets(user.id);
                setMyTickets(tickets);
            }
        } catch (error) {
            console.error('Error loading my data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditEvent = (eventId: string) => {
        navigate(`/events/${eventId}/edit`);
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!user) return;
        const ev = myEvents.find(e => ((e as any).id ?? (e as any).event_id) === eventId);
        const isPending =
            (ev as any)?.status === 'pending' ||
            (ev as any)?.statusText === 'pending' ||
            (ev as any)?.isApproved === false;

        if (!isPending && user.role !== 'admin') {
            alert('Only pending events can be deleted.');
            return;
        }

        if (!confirm('Delete this pending event? This action cannot be undone.')) {
            return;
        }

        // Optimistic remove
        const prev = myEvents;
        setMyEvents(prev.filter(e => ((e as any).id ?? (e as any).event_id) !== eventId));

        try {
            // Prefer a pending-guarded helper if available
            const svc: any = db as any;
            if (typeof svc.deleteEventPendingOwned === 'function') {
                await svc.deleteEventPendingOwned(eventId, user.id);
            } else {
                await db.deleteEvent(eventId);
            }

            // Reload to stay in sync (also ensures admin pending list sees it if shared cache exists)
            await loadMyData();
        } catch (error) {
            console.error('Error deleting event:', error);
            // Rollback
            setMyEvents(prev);
            alert('Delete failed. Make sure the event is still pending and you are the organizer.');
        }
    };

    if (!user) {
        return <LoginForm />;
    }

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navigation />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">My Events</h1>
                        <p className="text-muted-foreground">
                            {user.role === 'student'
                                ? 'Manage your created events and tickets'
                                : "Manage your organization's events"}
                        </p>
                    </div>
                    {user.role !== 'student' && (
                        <Button
                            onClick={() => navigate('/create-event')}
                            className="bg-gradient-to-r from-primary to-primary/90"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Event
                        </Button>
                    )}
                </div>

                <Tabs defaultValue="created" className="space-y-6">
                    <TabsList className={`grid w-full ${user.role === 'student' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                        <TabsTrigger value="created" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created Events ({myEvents.length})
                        </TabsTrigger>
                        {user.role === 'student' && (
                            <>
                                <TabsTrigger value="tickets" className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4" />
                                    My Tickets ({myTickets.length})
                                </TabsTrigger>
                                <TabsTrigger value="starred" className="flex items-center gap-2">
                                    <Star className="w-4 h-4" />
                                    Starred Events ({starredCount})
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    <TabsContent value="created">
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
                        ) : myEvents.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Events Created</h3>
                                    <p className="text-muted-foreground mb-4">
                                        You haven't created any events yet. Start by creating your first event!
                                    </p>
                                    <Button onClick={() => navigate('/create-event')}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Your First Event
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myEvents.map((event) => (
                                    <EventCard
                                        key={(event as any).id ?? (event as any).event_id}
                                        event={event}
                                        onEdit={handleEditEvent}
                                        onDelete={handleDeleteEvent}
                                        showActions={true}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {user.role === 'student' && (
                        <>
                            <TabsContent value="tickets">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <Card key={i} className="animate-pulse">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="h-5 bg-muted rounded w-1/3" />
                                                            <div className="h-4 bg-muted rounded w-1/2" />
                                                        </div>
                                                        <div className="h-8 w-20 bg-muted rounded" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : myTickets.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-12 text-center">
                                            <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-xl font-semibold mb-2">No Tickets Yet</h3>
                                            <p className="text-muted-foreground mb-4">
                                                You don't have any event tickets. Browse events to get started!
                                            </p>
                                            <Button onClick={() => navigate('/search')}>Browse Events</Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {Array.from(new Map(myTickets.map((t) => [t.id || `${t.eventId}:${t.userId}`, t])).values()).map((ticket) => (
                                            <Card key={ticket.id} className="shadow-card">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="font-semibold">Event Ticket</h3>
                                                            <p className="text-sm text-muted-foreground">Ticket ID: {ticket.id}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Status: {ticket.isCheckedIn ? 'Checked In' : 'Valid'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                RSVP’d on {format(new Date(ticket.createdAt), 'PPP p')}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setQrToShow(ticket.qrCode)}
                                                        >
                                                            View QR Code
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="starred">
                                <StarredEvents />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>

            {/* QR Viewer Dialog */}
            <AlertDialog open={qrToShow !== null} onOpenChange={(open) => !open && setQrToShow(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ticket QR Code</AlertDialogTitle>
                        <AlertDialogDescription>
                            Present this QR at event check-in. You can also copy the raw code below.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col items-center gap-4 py-2">
                        {qrToShow && (
                            <div className="bg-white p-4 rounded-md border">
                                <QRCodeSVG value={qrToShow} size={192} />
                            </div>
                        )}
                        <code className="text-sm break-all text-center max-w-full">
                            {qrToShow ?? ''}
                        </code>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setQrToShow(null)}>Close</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!qrToShow) return;
                                try { await navigator.clipboard.writeText(qrToShow); } catch {}
                            }}
                        >
                            Copy Code
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MyEvents;
