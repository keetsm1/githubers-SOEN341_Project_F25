import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseEnabled } from '@/services/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Profile { full_name?: string | null; email?: string | null }
interface Row {
  registration_id?: string;
  ticket_id?: string;
  created_at: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
  profiles?: Profile | null;
}

const EventHistory: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloadCsv = () => {
    const header = ['Name','Email','Registration ID','Ticket ID','RSVP Time','Checked-in','Check-in Time'];
    const lines = rows.map(r => [
      r.profiles?.full_name ?? '',
      r.profiles?.email ?? '',
      r.registration_id ?? '',
      r.ticket_id ?? '',
      r.created_at,
      r.is_checked_in ? 'Yes' : 'No',
      r.checked_in_at ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-history-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const title = useMemo(() => 'Event History', []);

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      setLoading(true);
      setError(null);
      try {
        if (!isSupabaseEnabled || !supabase) {
          setRows([]);
          setLoading(false);
          return;
        }
        // 1) Load registrations (RSVPs)
        let regs: any[] = [];
        try {
          const { data: r1 } = await supabase
            .from('registrations')
            .select('registration_id, user_id, created_at')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
          regs = (r1 as any[]) ?? [];
        } catch {
          regs = [];
        }

        // 2) Load tickets (check-ins)
        let tix: any[] = [];
        try {
          const { data: t1 } = await supabase
            .from('tickets')
            .select('ticket_id, registration_id, user_id, is_checked_in, checked_in_at, created_at')
            .eq('event_id', eventId);
          tix = (t1 as any[]) ?? [];
        } catch {
          tix = [];
        }

        // 3) Load profiles for all user_ids we saw
        const userIds = Array.from(new Set([
          ...regs.map(r => String(r.user_id)),
          ...tix.map(t => String(t.user_id)),
        ].filter(Boolean)));
        const profileMap = new Map<string, Profile>();
        if (userIds.length > 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, full_name, email')
              .in('user_id', userIds as any);
            (profs ?? []).forEach((p: any) => profileMap.set(String(p.user_id), { full_name: p.full_name, email: p.email }));
          } catch {
            // ignore profile failures, show rows without names/emails
          }
        }

        // 4) Build unified per-user rows so "Checked-in" reflects any scanned ticket
        const byUser = new Map<string, Row>();
        const allUsers = new Set<string>([...regs.map(r => String(r.user_id)), ...tix.map(t => String(t.user_id))].filter(Boolean));
        allUsers.forEach((uid) => {
          const reg = regs.find(r => String(r.user_id) === uid) as any | undefined;
          const userTix = tix.filter(t => String(t.user_id) === uid);

          const rsvpTime = reg?.created_at ?? (userTix.length ? userTix.map(t => t.created_at).filter(Boolean).sort()[0] : new Date(0).toISOString());
          const checkedTickets = userTix.filter(t => t.is_checked_in);
          const isChecked = checkedTickets.length > 0;
          const latestCheck = isChecked
            ? checkedTickets
                .slice()
                .sort((a, b) => new Date(b.checked_in_at ?? b.created_at ?? 0).getTime() - new Date(a.checked_in_at ?? a.created_at ?? 0).getTime())[0]
            : null;
          const ticketForId = (latestCheck ?? userTix.slice().sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0]) ?? null;
          const prof = profileMap.get(uid) ?? null;

          byUser.set(uid, {
            registration_id: reg?.registration_id,
            ticket_id: ticketForId?.ticket_id,
            created_at: rsvpTime,
            is_checked_in: isChecked,
            checked_in_at: isChecked ? (latestCheck?.checked_in_at ?? latestCheck?.created_at ?? null) : null,
            profiles: prof,
          });
        });

        let merged: Row[] = Array.from(byUser.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // 5) Fallback: If no registrations visible but tickets exist, show tickets
        if (merged.length === 0 && tix.length > 0) {
          merged = tix
            .sort((a, b) => new Date(b.created_at ?? b.checked_in_at ?? 0).getTime() - new Date(a.created_at ?? a.checked_in_at ?? 0).getTime())
            .map(t => ({
              registration_id: t.registration_id,
              ticket_id: t.ticket_id,
              created_at: t.created_at ?? t.checked_in_at ?? new Date().toISOString(),
              is_checked_in: Boolean(t.is_checked_in),
              checked_in_at: t.is_checked_in ? (t.checked_in_at ?? t.created_at ?? null) : null,
              profiles: profileMap.get(String(t.user_id)) ?? undefined,
            } as Row));
        }

        setRows(merged);
      } catch (e) {
        setError('Failed to load event history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">Full attendee history for this event</p>
          </div>
          {eventId && (
            <Button variant="outline" asChild>
              <Link to={`/events/${eventId}`}>Back to Event</Link>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendees</CardTitle>
            <Button variant="outline" onClick={downloadCsv}>Export CSV</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : rows.length === 0 ? (
              <div>No history yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">RSVP Time</th>
                      <th className="py-2 pr-3">Checked-in</th>
                      <th className="py-2 pr-3">Check-in Time</th>
                      <th className="py-2 pr-3">Ticket ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 pr-3">{r.profiles?.full_name ?? '—'}</td>
                        <td className="py-2 pr-3">{r.profiles?.email ?? '—'}</td>
                        <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-3">{r.is_checked_in ? 'Yes' : 'No'}</td>
                        <td className="py-2 pr-3">{r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '—'}</td>
                        <td className="py-2 pr-3">{r.ticket_id ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventHistory;
