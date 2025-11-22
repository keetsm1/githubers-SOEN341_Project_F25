import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    MapPin,
    Users,
    Star,
    Edit,
    Trash2,
    QrCode
} from 'lucide-react';
import { Event } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface EventCardProps {
    event: Event;
    onRSVP?: (eventId: string) => void;
    onRefetch?: () => void;
    onEdit?: (eventId: string) => void;
    onDelete?: (eventId: string) => void;
    onGetTicket?: (eventId: string) => void;
    showActions?: boolean;
    isRSVPed?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
                                                 event,
                                                 onRSVP,
                                                 onEdit,
                                                 onDelete,
                                                 onGetTicket,
                                                 onRefetch,
                                                 showActions = true,
                                                 isRSVPed = false
                                             }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [showRSVPDialog, setShowRSVPDialog] = React.useState(false);
    const [isRSVPing, setIsRSVPing] = React.useState(false);
    // Guard double-submit race conditions in React event loop
    const submittingRef = React.useRef(false);
    const [isStarring, setIsStarring] = React.useState(false);
    const [isStarred, setIsStarred] = React.useState(false);
    const [hasTicket, setHasTicket] = React.useState<boolean>(Boolean(isRSVPed));

    const eventId = (event as any).id ?? (event as any).event_id;
    const eventDate = new Date(event.date);
    const isUpcoming = eventDate > new Date();
    const [attendeeCount, setAttendeeCount] = React.useState<number>(event.currentAttendees || 0);
    const capacityPercentage =
        event.maxCapacity > 0
            ? Math.min((attendeeCount / event.maxCapacity) * 100, 100)
            : 0;

    // "Pending" detection supports both older flags and new status strings
    const isPending =
        (event as any).status === 'pending' ||
        (event as any).statusText === 'pending' ||
        (event as any).isApproved === false;

    const canManageBase =
        user?.role === 'admin' ||
        (user && event.organizerId === user.id);

    // Only show Edit/Delete for pending (unless admin)
    const canEditOrDelete = user?.role === 'admin' ? true : (canManageBase && isPending);

    // On mount, check starred state
    React.useEffect(() => {
        const checkStarred = async () => {
            try {
                const { db } = await import('@/services/database');
                const starredEvents = await db.getStarredEvents();
                setIsStarred(
                    starredEvents.some((e: any) => ((e.id ?? e.event_id) === eventId))
                );
            } catch {
                // ignore
            }
        };
        checkStarred();
    }, [eventId]);

    // Load attendee count from ticket store
    React.useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                const { db } = await import('@/services/database');
                const count = await db.getEventTicketCount(eventId);
                if (mounted) setAttendeeCount(count);
            } catch {}
        };
        run();
        return () => { mounted = false; };
    }, [eventId]);

    // Check if user already has a ticket (duplicate prevention on UI)
    React.useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                if (!user) return;
                const { db } = await import('@/services/database');
                const already = await db.hasUserTicket(eventId, user.id);
                if (mounted) {
                    // Monotonic: once true, never flip back to false on this card
                    setHasTicket(prev => prev || already || Boolean(isRSVPed));
                }
            } catch {
                // If check fails, do not force false; keep current state
            }
        };
        run();
        return () => { mounted = false; };
    }, [eventId, user?.id, isRSVPed]);

    const handleStarEvent = async () => {
        setIsStarring(true);
        try {
            const { db } = await import('@/services/database');
            if (isStarred) {
                await db.unstarEvent(eventId);
                setIsStarred(false);
            } else {
                await db.starEvent(eventId);
                setIsStarred(true);
            }
        } finally {
            setIsStarring(false);
        }
    };

    const handleRSVPConfirm = async () => {
        // Defensive guards: if already submitting or already has ticket, no-op
        if (submittingRef.current || isRSVPing || hasTicket) return;
        submittingRef.current = true;
        // Optimistically lock the card as joined to prevent rapid re-clicks
        setHasTicket(true);
        setIsRSVPing(true);
        // Close immediately to avoid repeated clicks while awaiting
        setShowRSVPDialog(false);
        try {
            const { db } = await import('@/services/database');
            const full = await db.isEventFull(eventId);
            if (full) {
                toast({
                    variant: 'destructive',
                    title: 'Event Full',
                    description: 'This event has reached its capacity.',
                });
                // Revert optimistic lock
                setHasTicket(false);
                return;
            }
            if (typeof onRSVP === 'function') {
                await onRSVP(eventId);
                setAttendeeCount((c) => c + 1);
            } else {
                const ticket = await db.createTicket(eventId);
                if (ticket) {
                    setAttendeeCount((c) => c + 1);
                    toast({
                        title: 'RSVP Successful!',
                        description: 'Your ticket has been generated. Check My Tickets to view it.',
                    });
                    onRefetch?.();
                }
            }
        } catch {
            // If parent handles toasts, avoid double toast here
            if (typeof onRSVP !== 'function') {
                toast({
                    variant: 'destructive',
                    title: 'RSVP Failed',
                    description: 'Unable to RSVP at this time',
                });
            }
            // Revert optimistic lock on failure
            setHasTicket(false);
        } finally {
            setIsRSVPing(false);
            submittingRef.current = false;
        }
    };

    return (
        <Card className="group hover:shadow-elevated transition-all duration-200 overflow-hidden">
            {event.imageUrl && (
                <Link to={`/events/${eventId}`} className="block">
                    <div className="aspect-video overflow-hidden">
                        <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                        />
                    </div>
                </Link>
            )}

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {event.category && (
                                <Badge
                                    variant="secondary"
                                    className="bg-accent/10 text-accent-foreground border-accent/20"
                                >
                                    {event.category}
                                </Badge>
                            )}
                            {isPending && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    Pending Approval
                                </Badge>
                            )}
                        </div>
                        <Link to={`/events/${eventId}`} className="hover:underline">
                            <h3 className="font-semibold text-lg leading-tight mb-2">{event.title}</h3>
                        </Link>
                        {event.description && (
                            <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 pb-4">
                <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2 text-primary" />
                        <span>
              {format(eventDate, 'PPP')} at {format(eventDate, 'p')}
            </span>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                        <span>{event.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 mr-2 text-primary" />
                            <span>
                    {attendeeCount} / {event.maxCapacity} attending
                  </span>
                            </div>
                        <div className="text-xs text-muted-foreground">
                            By {event.organizerName}
                        </div>
                    </div>

                    {/* Status line */}
                    <div className="flex items-center text-xs">
                        <span className="mr-2 text-muted-foreground">Status:</span>
                        {(event as any).status === 'published' || (event as any).isApproved ? (
                            <Badge variant="outline" className="border-green-600 text-green-700">Approved</Badge>
                        ) : (event as any).status === 'rejected' || (event as any).statusText === 'rejected' ? (
                            <Badge variant="outline" className="border-red-600 text-red-700">Rejected</Badge>
                        ) : (
                            <Badge variant="outline" className="border-yellow-600 text-yellow-700">Pending</Badge>
                        )}
                    </div>

                    {/* Capacity Bar */}
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                                capacityPercentage >= 90
                                    ? 'bg-destructive'
                                    : capacityPercentage >= 70
                                        ? 'bg-yellow-500'
                                        : 'bg-primary'
                            }`}
                            style={{ width: `${capacityPercentage}%` }}
                        />
                    </div>

                    {/* Tags */}
                    {event.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {event.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {event.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{event.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>

            {showActions && (
                <CardFooter className="pt-0 gap-2">
                    {/* Student actions */}
                    {user?.role === 'student' && (((event as any).status === 'published') || (event as any).isApproved) && (
                        <div className="flex items-center gap-2 w-full">
                            {hasTicket ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (onGetTicket) onGetTicket(eventId);
                                        else navigate('/my-tickets');
                                    }}
                                    className="flex-1"
                                >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    View Ticket
                                </Button>
                            ) : (
                                <AlertDialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            onClick={() => setShowRSVPDialog(true)}
                                            disabled={
                                                !isUpcoming ||
                                                hasTicket ||
                                                isRSVPing ||
                                                (event.maxCapacity > 0 && attendeeCount >= event.maxCapacity)
                                            }
                                            className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                                            size="sm"
                                        >
                                            {!isUpcoming
                                                ? 'Event Ended'
                                                : (event.maxCapacity > 0 && attendeeCount >= event.maxCapacity)
                                                    ? 'Full'
                                                    : 'RSVP'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm RSVP</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to RSVP to <b>{event.title}</b>? This will secure your spot if available.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isRSVPing}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <Button onClick={handleRSVPConfirm} disabled={isRSVPing}>
                                                    {isRSVPing ? 'RSVPing…' : 'Confirm RSVP'}
                                                </Button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleStarEvent}
                                disabled={isStarring}
                                title={isStarred ? 'Unstar this event' : 'Star this event'}
                            >
                                <Star className={`w-4 h-4 ${isStarred ? 'text-yellow-500 fill-yellow-400' : ''}`} />
                            </Button>
                        </div>
                    )}

                    {/* Organizer/Admin actions (pending only for non-admins) */}
                    {canEditOrDelete && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit?.(eventId)}
                                title="Edit event"
                            >
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onDelete?.(eventId)}
                                title="Delete event"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </CardFooter>
            )}
        </Card>
    );
};

export default EventCard;
