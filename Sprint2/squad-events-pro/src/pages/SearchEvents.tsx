import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Calendar, MapPin } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/events/EventCard';
import { useAuth } from '@/contexts/AuthContext';
import { db, Event } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import LoginForm from '@/components/auth/LoginForm';

const categories = [
  'All', 'Technology', 'Career', 'Sports', 'Arts', 'Social', 'Academic', 'Business'
];

const SearchEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await db.getEvents({
        limit: 12,
        page,
        search: searchTerm || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        approved: true
      });
      setEvents(response.data);
      setTotalEvents(response.meta.total);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load events"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, selectedCategory, page]);

  const handleRSVP = async (eventId: string) => {
    if (!user) return;
    
    try {
      const ticket = await db.createTicket(eventId, user.id);
      toast({
        title: "RSVP Successful!",
        description: "Your ticket has been generated. Check My Events to view it."
      });
      fetchEvents(); // Refresh to update attendee counts
    } catch (error) {
      toast({
        variant: "destructive",
        title: "RSVP Failed",
        description: "Unable to RSVP at this time"
      });
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
              <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
              <p className="text-muted-foreground">
                Event browsing is only available for students.
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Discover Events</h1>
          <p className="text-muted-foreground">Find and join exciting campus events</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search events by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={`cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors ${
                      selectedCategory === category 
                        ? 'bg-primary text-primary-foreground' 
                        : ''
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'All'
                  ? 'Try adjusting your search criteria'
                  : 'No events are currently available'}
              </p>
              {(searchTerm || selectedCategory !== 'All') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {events.length} of {totalEvents} events
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRSVP={handleRSVP}
                  showActions={true}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalEvents > 12 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(totalEvents / 12)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(totalEvents / 12)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchEvents;