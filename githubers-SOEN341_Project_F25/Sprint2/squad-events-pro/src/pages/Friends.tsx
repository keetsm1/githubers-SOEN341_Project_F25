import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Search, 
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import { useAuth } from '@/contexts/AuthContext';
import { db, Friendship, Event } from '@/services/database';
import LoginForm from '@/components/auth/LoginForm';
import { format } from 'date-fns';

const Friends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsEvents, setFriendsEvents] = useState<Event[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'student') {
      loadFriendsData();
    }
  }, [user]);

  const loadFriendsData = async () => {
    if (!user) return;
    
    try {
      const [friendsData, eventsData] = await Promise.all([
        db.getFriends(user.id),
        db.getFriendsEvents(user.id)
      ]);
      
      setFriends(friendsData);
      setFriendsEvents(eventsData);
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !searchEmail.trim()) return;
    
    try {
      await db.sendFriendRequest(user.id, searchEmail); // In real app, would look up user by email
      setSearchEmail('');
      loadFriendsData();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  if (!user) {
    return <LoginForm />;
  }

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Enter friend's email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={sendFriendRequest} disabled={!searchEmail.trim()}>
                Send Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              My Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Friends' Events ({friendsEvents.length})
            </TabsTrigger>
          </TabsList>

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
              <div className="space-y-4">
                {/* Mock friends data since we don't have real user data */}
                {[
                  { id: '1', name: 'Sarah Johnson', email: 'sarah@university.edu', mutual: 3 },
                  { id: '2', name: 'Mike Chen', email: 'mike@university.edu', mutual: 7 },
                  { id: '3', name: 'Emma Davis', email: 'emma@university.edu', mutual: 2 }
                ].map((friend) => (
                  <Card key={friend.id} className="shadow-card hover:shadow-elevated transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} />
                            <AvatarFallback>{friend.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{friend.name}</h3>
                            <p className="text-sm text-muted-foreground">{friend.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {friend.mutual} mutual friends
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">Friends</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

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
                  <p className="text-muted-foreground mb-4">
                    Your friends haven't RSVP'd to any events yet, or you don't have friends added.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Events Your Friends Are Attending</h3>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {friendsEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onRSVP={async (eventId) => {
                        await db.createTicket(eventId, user.id);
                        loadFriendsData();
                      }}
                      showActions={true}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends;