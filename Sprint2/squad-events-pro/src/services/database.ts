// Database Service Layer – Supabase-backed implementation
// Replaces mock calls for Events & Friends, keeps your interfaces intact.

import { createClient } from '@supabase/supabase-js';

/** ──────────────────────────────────────────────────────────────────────────
 *  Supabase client boot
 *  (supports Vite and Node-ish envs you already had)
 *  ────────────────────────────────────────────────────────────────────────── */
const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const nodeEnv =
    typeof process !== 'undefined' && (process as any).env
        ? (process as any).env
        : {};

const supaBaseUrl: string =
    viteEnv.VITE_SUPABASE_URL ||
    nodeEnv.NEXT_PUBLIC_SUPABASE_URL ||
    '';

const supabaseAnonKey: string =
    viteEnv.VITE_SUPABASE_ANON_KEY ||
    nodeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

export const isSupabaseEnabled = !!(supaBaseUrl && supabaseAnonKey);

export const supabase = isSupabaseEnabled
    ? createClient(supaBaseUrl as string, supabaseAnonKey as string, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    })
    : null;

/** ──────────────────────────────────────────────────────────────────────────
 *  Auth helpers (your existing auth kept; added ensureProfile)
 *  ────────────────────────────────────────────────────────────────────────── */
export const auth = {
    async signUp(email: string, password: string, fullName: string) {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        });

        // Ensure a profile row exists (optional but recommended for RLS)
        const userId = data.user?.id;
        if (userId) {
            await ensureProfile(userId, fullName, email).catch(() => {});
        }

        return {
            user: data.user ?? null,
            session: data.session ?? null,
            error: error ?? null,
            errorMessage: error?.message || null,
        };
    },

    async signIn(email: string, password: string) {
        if (!isSupabaseEnabled || !supabase) {
            throw new Error('Supabase is not configured. Check your .env.');
        }

        const e = email.trim().toLowerCase();
        const p = password.trim();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: e,
            password: p,
        });

        // Ensure a profile row exists
        const userId = data.user?.id;
        if (userId) {
            const fullName = (data.user?.user_metadata as any)?.full_name ?? null;
            await ensureProfile(userId, fullName ?? undefined, e).catch(() => {});
        }

        return {
            user: data.user ?? null,
            session: data.session ?? null,
            error: error ?? null,
            errorMessage: error?.message || null,
        };
    },
};

// Ensure there is a corresponding profiles row for RLS-based tables
export async function ensureProfile(userId: string, fullName?: string, email?: string) {
    if (!supabase) return;
    const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!data) {
        // If your profiles table doesn't have "email", remove it here.
        await supabase.from('profiles').insert({
            user_id: userId,
            full_name: fullName ?? null,
            email: email ?? null, // <- remove if you don't have this column
            role: 'student',
        });
    }
}

/** ──────────────────────────────────────────────────────────────────────────
 *  App-level interfaces (kept from your file)
 *  ────────────────────────────────────────────────────────────────────────── */
export interface Event {
    id: string;
    title: string;
    description: string;
    date: string; // mapped from DB starts_at
    location: string;
    category: string;
    organizerId: string;
    organizerName: string;
    maxCapacity: number;
    currentAttendees: number;
    imageUrl?: string;
    tags: string[];
    isApproved: boolean;
    createdAt: string;
}

export interface Ticket {
    id: string;
    eventId: string;
    userId: string;
    qrCode: string;
    isCheckedIn: boolean;
    checkedInAt?: string;
    createdAt: string;
}

export interface Friendship {
    id: string;           // request_id for requests, or composed key for friendships
    userId: string;
    friendId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

export interface IncomingFriendRequest {
    requestId: string;
    requesterId: string;
    fullName: string | null;
    avatarUrl: string | null;
    email?: string | null;
    createdAt: string;
}

export interface Company {
    id: string;
    name: string;
    userId: string;
    email: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export interface Analytics {
    totalRegistrations: number;
    ticketsSold: number;
    checkedIn: number;
    attendanceRate: number;
    eventsByCategory: { [key: string]: number };
    registrationTrend: { date: string; count: number }[];
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Local helpers
 *  ────────────────────────────────────────────────────────────────────────── */
async function requireAuth() {
    if (!supabase) throw new Error('Supabase not configured');
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (!uid) throw new Error('Not logged in');
    return uid;
}

// Look up a user_id from an email mirrored into profiles.email
// If you don't have profiles.email, change this to whatever identifier you store.
async function lookupUserIdByEmail(email: string): Promise<string | null> {
    if (!supabase) return null;
    const e = email.trim().toLowerCase();
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('email', e) // exact match recommended if email is unique
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data?.user_id ?? null;
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Mock seed you had (kept for non-Supabase functions & fallbacks)
 *  ────────────────────────────────────────────────────────────────────────── */
const mockEvents: Event[] = [
    {
        id: '1',
        title: 'AI & Machine Learning Workshop',
        description: 'Learn the fundamentals of AI and ML with hands-on projects.',
        date: '2024-10-15T18:00:00Z',
        location: 'Engineering Building, Room 201',
        category: 'Technology',
        organizerId: '2',
        organizerName: 'Tech Club',
        maxCapacity: 50,
        currentAttendees: 32,
        imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
        tags: ['AI', 'Machine Learning', 'Workshop'],
        isApproved: true,
        createdAt: '2024-09-20T10:00:00Z',
    },
    {
        id: '2',
        title: 'Campus Career Fair 2024',
        description: 'Meet with top employers and explore career opportunities.',
        date: '2024-10-22T09:00:00Z',
        location: 'Student Center, Main Hall',
        category: 'Career',
        organizerId: '3',
        organizerName: 'Career Services',
        maxCapacity: 200,
        currentAttendees: 156,
        imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400',
        tags: ['Career', 'Networking', 'Jobs'],
        isApproved: true,
        createdAt: '2024-09-15T14:00:00Z',
    },
];

// ───────────── Incoming Friend Requests (Supabase) ─────────────

async function getIncomingFriendRequests(): Promise<IncomingFriendRequest[]> {
    if (!supabase) throw new Error('Supabase not configured');
    const uid = await requireAuth();

    const { data, error } = await supabase
        .from('friend_requests')
        .select(`
      request_id,
      requester_id,
      addressee_id,
      created_at,
      status,
      requester:requester_id ( user_id, full_name, avatar_url, email )
    `)
        .eq('addressee_id', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
        requestId: row.request_id,
        requesterId: row.requester?.user_id ?? row.requester_id,
        fullName: row.requester?.full_name ?? null,
        avatarUrl: row.requester?.avatar_url ?? null,
        email: row.requester?.email ?? null,
        createdAt: row.created_at,
    }));
}

async function declineFriendRequest(requestId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    await requireAuth();
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .eq('status', 'pending');

    if (error) throw error;
}

/** ──────────────────────────────────────────────────────────────────────────
 *  db: Events, Tickets, Friends, Companies, Analytics
 *  (Events + Friends now use Supabase; others remain mocked)
 *  ────────────────────────────────────────────────────────────────────────── */
export const db = {
    // Unstar an event for the current user
    unstarEvent: async (eventId: string): Promise<void> => {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');
        const { error } = await supabase
            .from('starred_events')
            .delete()
            .eq('user_id', uid)
            .eq('event_id', eventId);
        if (error) throw error;
    },
    // Get starred events for the current user
    async getStarredEvents(): Promise<Event[]> {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase
            .from('starred_events')
            .select('event:events (event_id, title, description, starts_at, location, category, organizer_id, max_cap, image_url, tags, status, created_at, created_by)')
            .eq('user_id', uid);
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.event.event_id,
            title: row.event.title,
            description: row.event.description ?? '',
            date: row.event.starts_at,
            location: row.event.location ?? '',
            category: row.event.category ?? 'General',
            organizerId: row.event.organizer_id,
            organizerName: '',
            maxCapacity: row.event.max_cap ?? 0,
            currentAttendees: 0,
            imageUrl: row.event.image_url ?? undefined,
            tags: row.event.tags ?? [],
            isApproved: row.event.status === 'published',
            createdAt: row.event.created_at,
        }));
    },
    /* ───────────── Events (Supabase-backed) ───────────── */

        // Star an event for the current user
        async starEvent(eventId: string): Promise<void> {
            const uid = await requireAuth();
            if (!supabase) throw new Error('Supabase not configured');
            const { error } = await supabase
                .from('starred_events')
                .insert({ user_id: uid, event_id: eventId });
            if (error) throw error;
        },
    async createEvent(eventData: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
        const uid = await requireAuth();

        // Map UI -> DB
        const startsAt = eventData.date;
        const endsAt = new Date(new Date(eventData.date).getTime() + 2 * 60 * 60 * 1000).toISOString();

        const payload = {
            org_id: null, // student-created event
            created_by: uid,
            title: eventData.title,
            description: eventData.description ?? null,
            starts_at: startsAt,
            ends_at: endsAt,
            location: eventData.location ?? null,
            max_cap: eventData.maxCapacity ?? null,
            image_url: eventData.imageUrl ?? null,
            status: eventData.isApproved ? 'published' : 'draft',
        };

        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase
            .from('events')
            .insert(payload)
            .select(`
        event_id, title, description, starts_at, ends_at, location,
        max_cap, image_url, status, created_at, created_by
      `)
            .single();

        if (error) throw error;

        // Map DB -> UI
        return {
            id: data.event_id,
            title: data.title,
            description: data.description ?? '',
            date: data.starts_at,
            location: data.location ?? '',
            category: eventData.category, // UI-level field (not yet in DB)
            organizerId: data.created_by,
            organizerName: eventData.organizerName, // UI-level field
            maxCapacity: data.max_cap ?? 0,
            currentAttendees: 0, // fill from registrations later
            imageUrl: data.image_url ?? undefined,
            tags: eventData.tags ?? [],
            isApproved: data.status === 'published',
            createdAt: data.created_at,
        };
    },

    async getEvents(filters?: {
        limit?: number;
        page?: number;
        category?: string;
        search?: string;
        organizerId?: string;
        approved?: boolean;
    }): Promise<{ data: Event[]; meta: { total: number; page: number; perPage: number } }> {
        if (!supabase) throw new Error('Supabase not configured');
        await requireAuth();

        let query = supabase.from('events').select(
            `
        event_id, title, description, starts_at, ends_at, location,
        max_cap, image_url, status, created_at, created_by, org_id
      `,
            { count: 'exact' }
        );

        if (filters?.organizerId) {
            query = query.eq('created_by', filters.organizerId).is('org_id', null);
        }
        if (filters?.approved !== undefined) {
            query = query.eq('status', filters.approved ? 'published' : 'draft');
        }
        if (filters?.search) {
            query = query.ilike('title', `%${filters.search}%`);
        }

        const page = filters?.page || 1;
        const perPage = filters?.limit || 20;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const { data, error, count } = await query
            .order('starts_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const mapped = (data ?? []).map((ev: any) => ({
            id: ev.event_id,
            title: ev.title,
            description: ev.description ?? '',
            date: ev.starts_at,
            location: ev.location ?? '',
            category: filters?.category ?? 'General',
            organizerId: ev.created_by,
            organizerName: 'You',
            maxCapacity: ev.max_cap ?? 0,
            currentAttendees: 0,
            imageUrl: ev.image_url ?? undefined,
            tags: [],
            isApproved: ev.status === 'published',
            createdAt: ev.created_at,
        }));

        return {
            data: mapped,
            meta: { total: count ?? mapped.length, page, perPage },
        };
    },

    async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
        // Keep mocked for now (wire later if needed)
        const eventIndex = mockEvents.findIndex((e) => e.id === id);
        if (eventIndex >= 0) {
            mockEvents[eventIndex] = { ...mockEvents[eventIndex], ...updates };
            return mockEvents[eventIndex];
        }
        throw new Error('Event not found');
    },

    async deleteEvent(id: string): Promise<void> {
        // Keep mocked for now
        const eventIndex = mockEvents.findIndex((e) => e.id === id);
        if (eventIndex >= 0) mockEvents.splice(eventIndex, 1);
    },

    /* ───────────── Tickets (mocked) ───────────── */

    async createTicket(eventId: string, userId: string): Promise<Ticket> {
        return {
            id: Date.now().toString(),
            eventId,
            userId,
            qrCode: `QR_${eventId}_${userId}_${Date.now()}`,
            isCheckedIn: false,
            createdAt: new Date().toISOString(),
        };
    },

    async getUserTickets(userId: string): Promise<Ticket[]> {
        return []; // mocked
    },

    async checkInTicket(ticketId: string): Promise<Ticket> {
        return {
            id: ticketId,
            eventId: '1',
            userId: '1',
            qrCode: `QR_${ticketId}`,
            isCheckedIn: true,
            checkedInAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };
    },

    /* ───────────── Friends (Supabase-backed) ───────────── */

    // Note: UI passes (currentUserId, email). We ignore currentUserId and
    // take the session user per RLS; second arg is treated as the friend's email.
    async sendFriendRequest(currentUserId: string, friendIdentifier: string): Promise<Friendship> {
        const uid = await requireAuth();
        const addresseeId = await lookupUserIdByEmail(friendIdentifier);
        if (!addresseeId) throw new Error('Could not find a user with that email');

        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase
            .from('friend_requests')
            .insert({ requester_id: uid, addressee_id: addresseeId })
            .select('request_id, requester_id, addressee_id, status, created_at')
            .single();

        if (error) throw error;

        return {
            id: data.request_id,
            userId: data.requester_id,
            friendId: data.addressee_id,
            status: (data.status as any) ?? 'pending',
            createdAt: data.created_at,
        };
    },

    // Expects a friend REQUEST id (from friend_requests), not a friendship id.
    async acceptFriendRequest(friendshipOrRequestId: string): Promise<Friendship> {
        await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');

        const { error } = await supabase.rpc('accept_friend_request', {
            p_request_id: friendshipOrRequestId,
        });
        if (error) throw error;

        return {
            id: friendshipOrRequestId,
            userId: '',
            friendId: '',
            status: 'accepted',
            createdAt: new Date().toISOString(),
        };
    },

    // Returns accepted friendships where the current user is user_id
    async getFriends(userId: string): Promise<Friendship[]> {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase
            .from('friendships')
            .select('user_id, friend_id, created_at')
            .eq('user_id', uid);

        if (error) throw error;

        return (data ?? []).map((row: any) => ({
            id: `${row.user_id}_${row.friend_id}`, // composed
            userId: row.user_id,
            friendId: row.friend_id,
            status: 'accepted',
            createdAt: row.created_at,
        }));
    },

    // Events created by my friends (student-created, published)
    async getFriendsEvents(userId: string): Promise<Event[]> {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');

        // 1) friend IDs
        const { data: friendRows, error: fErr } = await supabase
            .from('friendships')
            .select('friend_id')
            .eq('user_id', uid);
        if (fErr) throw fErr;

        const friendIds = (friendRows ?? []).map((r) => r.friend_id);
        if (friendIds.length === 0) return [];

        // 2) their published events (org-less == student events)
        const { data: events, error: eErr } = await supabase
            .from('events')
            .select(`
        event_id, title, description, starts_at, ends_at, location,
        max_cap, image_url, status, created_at, created_by
      `)
            .in('created_by', friendIds)
            .eq('status', 'published')
            .order('starts_at', { ascending: true });

        if (eErr) throw eErr;

        return (events ?? []).map((ev: any) => ({
            id: ev.event_id,
            title: ev.title,
            description: ev.description ?? '',
            date: ev.starts_at,
            location: ev.location ?? '',
            category: 'Social', // not modeled; pick a default
            organizerId: ev.created_by,
            organizerName: 'Friend',
            maxCapacity: ev.max_cap ?? 0,
            currentAttendees: 0,
            imageUrl: ev.image_url ?? undefined,
            tags: [],
            isApproved: ev.status === 'published',
            createdAt: ev.created_at,
        }));
    },

    // ✅ Export the two new functions so the Friends page can call them
    getIncomingFriendRequests,
    declineFriendRequest,

    /* ───────────── Companies (mocked) ───────────── */

    async getCompanies(status?: 'pending' | 'approved' | 'rejected'): Promise<Company[]> {
        return [
            {
                id: '1',
                name: 'Tech Club',
                userId: '2',
                email: 'sarah@techclub.org',
                description: 'University technology enthusiasts club',
                status: status || 'approved',
                createdAt: '2024-09-01T10:00:00Z',
            },
        ];
    },

    async approveCompany(companyId: string): Promise<Company> {
        return {
            id: companyId,
            name: 'Tech Club',
            userId: '2',
            email: 'sarah@techclub.org',
            description: 'University technology enthusiasts club',
            status: 'approved',
            createdAt: '2024-09-01T10:00:00Z',
        };
    },

    async rejectCompany(companyId: string): Promise<Company> {
        return {
            id: companyId,
            name: 'Tech Club',
            userId: '2',
            email: 'sarah@techclub.org',
            description: 'University technology enthusiasts club',
            status: 'rejected',
            createdAt: '2024-09-01T10:00:00Z',
        };
    },

    /* ───────────── Analytics (mocked) ───────────── */

    async getGlobalStats(): Promise<Analytics> {
        return {
            totalRegistrations: 96,
            ticketsSold: 100,
            checkedIn: 83,
            attendanceRate: 83,
            eventsByCategory: {
                Technology: 15,
                Career: 8,
                Sports: 12,
                Arts: 6,
                Social: 20,
            },
            registrationTrend: [
                { date: '2024-09-01', count: 5 },
                { date: '2024-09-02', count: 8 },
                { date: '2024-09-03', count: 12 },
                { date: '2024-09-04', count: 15 },
                { date: '2024-09-05', count: 22 },
            ],
        };
    },

    async getEventStats(eventId: string): Promise<Analytics> {
        return {
            totalRegistrations: 32,
            ticketsSold: 35,
            checkedIn: 28,
            attendanceRate: 80,
            eventsByCategory: {},
            registrationTrend: [
                { date: '2024-09-20', count: 5 },
                { date: '2024-09-21', count: 12 },
                { date: '2024-09-22', count: 15 },
            ],
        };
    },
};
