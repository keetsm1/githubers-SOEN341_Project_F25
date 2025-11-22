import React from 'react';
import { db } from '@/services/database';
import EventCard from '@/components/events/EventCard';

const StarredEvents: React.FC = () => {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchStarred = async () => {
      setLoading(true);
      try {
        const starred = await db.getStarredEvents();
        setEvents(starred);
      } catch (err: any) {
        setError(err.message || 'Failed to load starred events');
      } finally {
        setLoading(false);
      }
    };
    fetchStarred();
  }, []);

  if (loading) return <div>Loading starred events...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">My Starred Events</h2>
      {events.length === 0 ? (
        <div>No starred events yet.</div>
      ) : (
        events.map(event => (
          <EventCard key={event.id} event={event} showActions={false} />
        ))
      )}
    </div>
  );
};

export default StarredEvents;
