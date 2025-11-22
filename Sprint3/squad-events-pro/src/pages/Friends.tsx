import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Users,
    UserPlus,
    Search,
    Calendar,
    Mail,
    Check,
    X as XIcon,
} from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

import {
    db,
    Friendship,
    FriendsEvent,
    IncomingFriendRequest,
    supabase,
} from '@/services/database';

function initials(name?: string | null) {
    if (!name) return '??';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('');
}

const Friends: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [friends, setFriends] = useState<Friendship[]>([]);
    const [friendsProfiles, setFriendsProfiles] = useState<
        Record<string, { full_name: string | null; avatar_url: string | null; email?: string | null }>
    >({});
    const [requests, setRequests] = useState<IncomingFriendRequest[]>([]);
    const [friendsEvents, setFriendsEvents] = useState<FriendsEvent[]>([]);
    const [searchEmail, setSearchEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'friends' | 'requests' | 'events'>('friends');

    // gate
    if (!user) return <LoginForm />;

    if (user.role !== 'student') {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-8 text-center">
                            <h2 className="text-2xl font-bold mb-4">Student Feature</h2>
                            <p className="text-muted-foreground">
                                The friends feature is only available for students.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // load lists
    useEffect(() => {
        let isMounted = true;
        async function load() {
            if (!user) return;
            setLoading(true);
            try {
                const [friendsData, incoming, eventsData] = await Promise.all([
                    db.getFriends(user.id),
                    db.getIncomingFriendRequests(),
                    db.getFriendsEvents(user.id),
                ]);

                if (!isMounted) return;
                setFriends(friendsData);
                setRequests(incoming);
                setFriendsEvents(eventsData);

                // Enrich friend rows with profile display info (name/avatar/email)
                const friendIds = Array.from(new Set(friendsData.map((f) => f.friendId)));
                if (friendIds.length && supabase) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('user_id, full_name, avatar_url, email')
                        .in('user_id', friendIds);

                    if (!error && data) {
                        const map: Record<
                            string,
                            { full_name: string | null; avatar_url: string | null; email?: string | null }
                        > = {};
                        data.forEach((p: any) => {
                            map[p.user_id] = {
                                full_name: p.full_name ?? null,
                                avatar_url: p.avatar_url ?? null,
                                email: p.email ?? null,
                            };
                        });
                        setFriendsProfiles(map);
                    }
                }
            } catch (err: any) {
                console.error(err);
                toast({
                    variant: 'destructive',
                    title: 'Failed to load friends',
                    description: err?.message ?? 'Please try again.',
                });
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        load();
        return () => {
            isMounted = false;
        };
    }, [user, toast]);

    // Live-update friends' events when new registrations are written/changed
    useEffect(() => {
        if (!user || !supabase) return;

        const refresh = async () => {
            try {
                const updated = await db.getFriendsEvents(user.id);
                setFriendsEvents(updated);
            } catch (err) {
                console.error('Failed to refresh friends events', err);
            }
        };

        const ch1 = supabase
            .channel(`friends-events-regs-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'event_registrations' },
                refresh
            )
            .subscribe();

        // Legacy path (if your RSVP code writes into `registrations`)
        const ch2 = supabase
            .channel(`friends-events-legacy-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'registrations' },
                refresh
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(ch1);
                supabase.removeChannel(ch2);
            } catch {
                // ignore
            }
        };
    }, [user?.id]);

    const onSend = async () => {
        if (!searchEmail.trim()) return;
        try {
            await db.sendFriendRequest(user.id, searchEmail.trim());
            setSearchEmail('');
            toast({ title: 'Request sent', description: 'Your friend request was sent.' });
            // refresh requests tab in case the other user is on same device (dev demo)
            const incoming = await db.getIncomingFriendRequests();
            setRequests(incoming);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Could not send request',
                description: err?.message ?? 'Please verify the email and try again.',
            });
        }
    };

    const onAccept = async (requestId: string) => {
        try {
            await db.acceptFriendRequest(requestId);
            toast({ title: 'Request accepted' });
            // refresh lists
            const [friendsData, incoming] = await Promise.all([
                db.getFriends(user.id),
                db.getIncomingFriendRequests(),
            ]);
            setFriends(friendsData);
            setRequests(incoming);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Could not accept request',
                description: err?.message ?? 'Try again later.',
            });
        }
    };

    const onDecline = async (requestId: string) => {
        try {
            await db.declineFriendRequest(requestId);
            toast({ title: 'Request declined' });
            const incoming = await db.getIncomingFriendRequests();
            setRequests(incoming);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Could not decline request',
                description: err?.message ?? 'Try again later.',
            });
        }
    };

    const totalFriends = friends.length;
    const totalRequests = requests.length;
    const totalEvents = friendsEvents.length;

    const friendCards = useMemo(() => {
        if (!friends.length) return null;
        return friends.map((f) => {
            const prof = friendsProfiles[f.friendId];
            const name = prof?.full_name ?? `User ${f.friendId.slice(0, 6)}`;
            const email = prof?.email ?? 'hidden';
            const avatar =
                prof?.avatar_url ??
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
            return (
                <Card key={f.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={avatar} alt={name} />
                                    <AvatarFallback>{initials(name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold">{name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>{email}</span>
                                    </div>
                                </div>
                            </div>
                            <Badge variant="secondary">Friends</Badge>
                        </div>
                    </CardContent>
                </Card>
            );
        });
    }, [friends, friendsProfiles]);

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navigation />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Friends</h1>
                    <p className="text-muted-foreground">
                        Connect with classmates and discover events together
                    </p>
                </div>

                {/* Add Friend */}
                <Card className="mb-8 shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Add Friends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Enter friend's email address"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={onSend} disabled={!searchEmail.trim()}>
                                Send Request
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="friends" className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            My Friends ({totalFriends})
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Incoming Requests ({totalRequests})
                        </TabsTrigger>
                        <TabsTrigger value="events" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Friends' Events ({totalEvents})
                        </TabsTrigger>
                    </TabsList>

                    {/* Friends list */}
                    <TabsContent value="friends">
                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Card key={i} className="animate-pulse">
                                        <CardContent className="p-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-muted rounded-full" />
                                                <div className="space-y-2 flex-1">
                                                    <div className="h-4 bg-muted rounded w-1/3" />
                                                    <div className="h-3 bg-muted rounded w-1/2" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : friends.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Friends Yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Start building your network by sending friend requests!
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">{friendCards}</div>
                        )}
                    </TabsContent>

                    {/* Incoming requests */}
                    <TabsContent value="requests">
                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(2)].map((_, i) => (
                                    <Card key={i} className="animate-pulse">
                                        <CardContent className="p-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-muted rounded-full" />
                                                <div className="space-y-2 flex-1">
                                                    <div className="h-4 bg-muted rounded w-1/3" />
                                                    <div className="h-3 bg-muted rounded w-1/2" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : requests.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <UserPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Incoming Requests</h3>
                                    <p className="text-muted-foreground">You're all caught up.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {requests.map((req) => {
                                    const name = req.fullName ?? `User ${req.requesterId.slice(0, 6)}`;
                                    const avatar =
                                        req.avatarUrl ??
                                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
                                    return (
                                        <Card key={req.requestId} className="shadow-card">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarImage src={avatar} alt={name} />
                                                            <AvatarFallback>{initials(name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <h3 className="font-semibold">{name}</h3>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                <span>{req.email ?? 'hidden'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => onAccept(req.requestId)}
                                                        >
                                                            <Check className="w-4 h-4 mr-1" />
                                                            Accept
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => onDecline(req.requestId)}>
                                                            <XIcon className="w-4 h-4 mr-1" />
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* Friends' events */}
                    <TabsContent value="events">
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
                        ) : friendsEvents.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Friends' Events</h3>
                                    <p className="text-muted-foreground">
                                        Your friends haven’t joined any events yet.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {friendsEvents.map(({ event, friendIds }) => {
                                    const friendsForEvent = friendIds.map((fid) => {
                                        const prof = friendsProfiles[fid];
                                        const name = prof?.full_name ?? `Friend ${fid.slice(0, 6)}`;
                                        const avatar =
                                            prof?.avatar_url ??
                                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
                                        return { id: fid, name, avatar };
                                    });

                                    return (
                                        <div key={event.id} className="space-y-3">
                                            <EventCard
                                                event={event}
                                                onRSVP={async (eventId) => {
                                                    await db.createTicket(eventId, user.id);
                                                    toast({ title: 'RSVP created' });
                                                }}
                                                showActions={true}
                                            />

                                            {/* Friends attending row */}
                                            <div className="px-4 pb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                <span className="font-medium">Friends attending:</span>
                                                {friendsForEvent.map((f) => (
                                                    <Badge key={f.id} variant="outline" className="flex items-center gap-1 px-2 py-1">
                                                        <Avatar className="w-5 h-5">
                                                            <AvatarImage src={f.avatar} alt={f.name} />
                                                            <AvatarFallback>{initials(f.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{f.name}</span>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Friends;
