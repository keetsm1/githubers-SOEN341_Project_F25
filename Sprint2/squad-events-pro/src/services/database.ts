import { createClient } from '@supabase/supabase-js';

/** ──────────────────────────────────────────────────────────────────────────
 *  Supabase client boot (Vite / Node-ish)
 *  ────────────────────────────────────────────────────────────────────────── */
const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const nodeEnv =
    typeof process !== 'undefined' && (process as any).env ? (process as any).env : {};

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
        auth: { persistSession: true, autoRefreshToken: true },
    })
    : null;

// Small helper to generate a random id when needed (fallback path)
function cryptoRandomId() {
    try {
        // @ts-ignore
        const arr = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(4)) : null;
        if (arr) return Array.from(arr).map(n => n.toString(16)).join('');
    } catch {}
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Recently-joined cache to smooth UI immediately after RSVP across remounts
const RECENT_JOIN_TTL_MS = 5 * 60 * 1000; // 5 minutes
function getLocalUid(): string | undefined {
    try {
        const raw = localStorage.getItem('campusUser');
        return raw ? (JSON.parse(raw)?.id as string | undefined) : undefined;
    } catch {
        return undefined;
    }
}
function setRecentlyJoined(uid: string, eventId: string) {
    try {
        const key = 'recentlyJoined';
        const raw = localStorage.getItem(key);
        const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        obj[`${uid}:${eventId}`] = Date.now();
        localStorage.setItem(key, JSON.stringify(obj));
    } catch {}
}
function wasRecentlyJoined(uid: string, eventId: string): boolean {
    try {
        const key = 'recentlyJoined';
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const obj = JSON.parse(raw) as Record<string, number>;
        const ts = obj[`${uid}:${eventId}`];
        if (!ts) return false;
        if (Date.now() - ts > RECENT_JOIN_TTL_MS) {
            // Expired; clean entry
            delete obj[`${uid}:${eventId}`];
            localStorage.setItem(key, JSON.stringify(obj));
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Auth helpers (kept behavior; added ensureProfile)
 *  ────────────────────────────────────────────────────────────────────────── */
export const auth = {
    async signUp(email: string, password: string, fullName: string) {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });

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
        const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });

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
 *  App-level interfaces (kept)
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
    // Derived UI status for display
    statusText?: 'approved' | 'pending' | 'rejected';
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
    id: string; // request_id for requests, or composed key for friendships
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
 *  New: Filter types + helpers for event listing
 *  ────────────────────────────────────────────────────────────────────────── */
export type EventFilters = {
    q?: string;                 // free text (title/description)
    categories?: string[];      // events.category IN (...)
    orgIds?: string[];          // events.org_id IN (...)
    dateFrom?: string;          // ISO
    dateTo?: string;            // ISO
    sort?: 'soonest' | 'newest' | 'popularity';
};

export type EventInsert = {
    org_id: string;
    title: string;
    description?: string | null;
    starts_at: string; // ISO
    ends_at: string;   // ISO
    location?: string | null;
    max_cap?: number | null;
    image_url?: string | null;
    status?: 'draft' | 'published' | 'cancelled';
    category?: string | null;
    tags?: string[] | null;
    // ticket_type?: 'free' | 'paid' | 'rsvp' // if you add later
};

export type EventRow = {
    event_id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    location: string | null;
    category: string | null;
    max_cap: number | null;
    image_url: string | null;
    tags: string[] | null;
    status: 'pending' | 'published' | 'cancelled';
    created_by: string;
    org_name?: string | null;
};

// Narrow update payload (all optional)
export type EventUpdate = Partial<
    Pick<
        EventRow,
        | 'title'
        | 'description'
        | 'starts_at'
        | 'ends_at'
        | 'location'
        | 'category'
        | 'max_cap'
        | 'image_url'
        | 'tags'
    >
>;

// Helper for pages: list orgs (id+name) for menus
export async function listOrganizationsBasic(): Promise<{ org_id: string; name: string }[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('organizations')
        .select('org_id,name')
        .eq('status', 'approved')
        .order('name', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

// Helper for pages: distinct categories
export async function listEventCategories(): Promise<string[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('events')
        .select('category')
        .not('category', 'is', null);

    if (error) throw error;

    const set = new Set<string>();
    (data ?? []).forEach((r: any) => r?.category && set.add(r.category));
    return [...set].sort();
}

// Core: filterable events (AND-logic; integrates search + sort)
export async function listEvents(filters: EventFilters = {}): Promise<Event[]> {
    if (!supabase) throw new Error('Supabase not configured');

    const { q, categories, orgIds, dateFrom, dateTo, sort } = filters;

    let query = supabase
        .from('events')
        .select(
            `event_id, org_id, title, description, starts_at, ends_at, location,
       max_cap, image_url, status, created_at, created_by, category`
        )
        .eq('status', 'published');

    if (categories?.length) query = query.in('category', categories);
    if (orgIds?.length)     query = query.in('org_id', orgIds);
    if (dateFrom)           query = query.gte('starts_at', dateFrom);
    if (dateTo)             query = query.lte('starts_at', dateTo);

    if (q && q.trim()) {
        const like = `%${q.trim()}%`;
        query = query.or(`title.ilike.${like},description.ilike.${like}`);
    }

    switch (sort) {
        case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
        case 'popularity':
            // Placeholder: if you later add popularity_score, order by it here.
            query = query.order('starts_at', { ascending: true });
            break;
        case 'soonest':
        default:
            query = query.order('starts_at', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map DB → UI Event
    return (data ?? []).map((ev: any) => ({
        id: ev.event_id,
        title: ev.title,
        description: ev.description ?? '',
        date: ev.starts_at,
        location: ev.location ?? '',
        category: ev.category ?? 'General',
        organizerId: ev.created_by,
        organizerName: ev.org_id ? 'Organization' : 'Student',
        maxCapacity: ev.max_cap ?? 0,
        currentAttendees: 0, // wire to registrations count later
        imageUrl: ev.image_url ?? undefined,
        tags: [],
        isApproved: ev.status === 'published',
        createdAt: ev.created_at,
    })) as Event[];
}

export async function createEvent(input: EventInsert) {
    const { data, error } = await supabase
        .from('events')
        .insert(input)
        .select('*')         // IMPORTANT: return the inserted row
        .single();

    if (error) throw error;
    return data; // the new event row (includes event_id)
}

// Get a single event by id
export async function getEventById(eventId: string) {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single();

    if (error) throw error;
    return data as EventRow;
}

/**
 * Update a pending event that belongs to a user.
 * Server-side RLS should enforce ownership & pending status;
 * the client filter is added here for defense in depth.
 */
export async function updateEventPendingOwned(
    eventId: string,
    userId: string,
    patch: EventUpdate
) {
    const { data, error } = await supabase
        .from('events')
        .update(patch)
        .eq('event_id', eventId)
        .eq('created_by', userId)
        .eq('status', 'pending')
        .select('*')
        .single();

    if (error) throw error;
    return data as EventRow;
}

export async function deleteEventPendingOwned(eventId: string, userId: string) {
    const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('event_id', eventId)
        .eq('created_by', userId)
        .eq('status', 'pending')
        .select('event_id')
        .single();

    if (error) throw error;
    return data;
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
 *  Mock seed retained for update/delete fallbacks
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

/** ──────────────────────────────────────────────────────────────────────────
 *  Friend Requests (Supabase)
 *  ────────────────────────────────────────────────────────────────────────── */
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
 *  (Events list now uses new listEvents in the page; these remain for compatibility)
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
    // Star an event for the current user
    async starEvent(eventId: string): Promise<void> {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');
        const { error } = await supabase
            .from('starred_events')
            .insert({ user_id: uid, event_id: eventId });
        if (error) throw error;
    },

        // Star an event for the current user
    async createEvent(eventData: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
        const uid = await requireAuth();

        // Enforce role check via profiles
        if (!supabase) throw new Error('Supabase not configured');
        const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', uid)
            .maybeSingle();

        const role = (prof as any)?.role ?? 'student';
        if (role === 'student') {
            throw new Error('Students are not permitted to create events.');
        }

        // Resolve organization for this user (if any) to set org_id and org_name
        let orgId: string | null = null;
        let orgName: string | null = null;
        if (supabase) {
            const { data: org } = await supabase
                .from('organizations')
                .select('org_id, name, approved_at')
                .eq('owner_user_id', uid)
                .order('approved_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (org) {
                orgId = (org as any).org_id ?? null;
                orgName = (org as any).name ?? null;
            }
        }

        // If the user is a company, ensure we have an organization to attach
        if (role === 'company' && !orgId) {
            throw new Error('No approved organization found for your account. Please wait for approval or contact an administrator.');
        }

        // Map UI -> DB
        const startsAt = eventData.date;
        const endsAt = new Date(new Date(eventData.date).getTime() + 2 * 60 * 60 * 1000).toISOString();

        const payload = {
            org_id: role === 'company' ? orgId : null,
            created_by: uid,
            title: eventData.title,
            description: eventData.description ?? null,
            starts_at: startsAt,
            ends_at: endsAt,
            location: eventData.location ?? null,
            max_cap: Number.isFinite(eventData.maxCapacity as number)
                ? (eventData.maxCapacity as number)
                : null,
            image_url: eventData.imageUrl ?? null,
            status: false,
            // New columns added to events: category and org_name
            category: (eventData.tags && eventData.tags.length > 0)
                ? eventData.tags.join(',')
                : (eventData.category || 'General'),
            org_name: orgName ?? eventData.organizerName ?? null,
            created_at: new Date().toISOString(),
        };
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase
            .from('events')
            .insert(payload)
            .select(`
        event_id, title, description, starts_at, ends_at, location,
        max_cap, image_url, status, created_at, created_by, org_id, category, org_name
      `)
            .single();

        if (error) {
            // Surface details in the browser console for debugging
            // eslint-disable-next-line no-console
            console.error('Supabase insert events failed:', error, { payload });
            throw error;
        }

        // Map DB -> UI
        return {
            id: data.event_id,
            title: data.title,
            description: data.description ?? '',
            date: data.starts_at,
            location: data.location ?? '',
            category: data.category ?? (eventData.category || 'General'),
            organizerId: data.created_by,
            organizerName: data.org_name ?? eventData.organizerName,
            maxCapacity: data.max_cap ?? 0,
            currentAttendees: 0,
            imageUrl: data.image_url ?? undefined,
            tags: eventData.tags ?? [],
            isApproved: Boolean(data.status),
            statusText: (Boolean(data.status) ? 'approved' : 'pending') as 'approved' | 'pending' | 'rejected',
            createdAt: data.created_at,
        };
    },

    // Legacy-style list with simple search/paging (kept for other screens)
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
        max_cap, image_url, status, created_at, created_by, org_id, category, org_name
      `,
            { count: 'exact' }
        );

        if (filters?.organizerId) {
            query = query.eq('created_by', filters.organizerId);
        }
        if (filters?.approved !== undefined) {
            if (filters.approved) {
                // Query for published events (string status)
                query = query.eq('status', 'published');
            } else {
                // Query for non-published events (false, draft, rejected, etc.)
                query = query.neq('status', 'published');
            }
        }
        if (filters?.search) {
            query = query.ilike('title', `%${filters.search}%`);
        }
        if (filters?.category) {
            query = query.eq('category', filters.category);
        }

        const page = filters?.page || 1;
        const perPage = filters?.limit || 20;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const { data, error, count } = await query
            .order('starts_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const mapped = (data ?? []).map((ev: any) => {
            const raw = ev.status;
            let isApproved: boolean;
            let statusText: 'approved' | 'pending' | 'rejected';

            if (typeof raw === 'boolean') {
                isApproved = raw;
                statusText = raw ? 'approved' : 'pending';
            } else if (typeof raw === 'string') {
                if (raw.toLowerCase() === 'rejected') {
                    isApproved = false;
                    statusText = 'rejected';
                } else if (raw.toLowerCase() === 'published' || raw.toLowerCase() === 'approved') {
                    isApproved = true;
                    statusText = 'approved';
                } else {
                    isApproved = false;
                    statusText = 'pending';
                }
            } else {
                isApproved = false;
                statusText = 'pending';
            }

            return {
                id: ev.event_id,
                title: ev.title,
                description: ev.description ?? '',
                date: ev.starts_at,
                location: ev.location ?? '',
                category: ev.category ?? filters?.category ?? 'General',
                organizerId: ev.created_by,
                organizerName: ev.org_name ?? 'You',
                maxCapacity: ev.max_cap ?? 0,
                currentAttendees: 0,
                imageUrl: ev.image_url ?? undefined,
                tags: [],
                isApproved,
                statusText,
                createdAt: ev.created_at,
            } as Event;
        });

        return {
            data: mapped,
            meta: { total: count ?? mapped.length, page, perPage },
        };
    },

    async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
        // Kept mocked for now
        const eventIndex = mockEvents.findIndex((e) => e.id === id);
        if (eventIndex >= 0) {
            mockEvents[eventIndex] = { ...mockEvents[eventIndex], ...updates };
            return mockEvents[eventIndex];
        }
        throw new Error('Event not found');
    },

    async deleteEvent(id: string): Promise<void> {
        // Kept mocked for now
        const eventIndex = mockEvents.findIndex((e) => e.id === id);
        if (eventIndex >= 0) mockEvents.splice(eventIndex, 1);
    },

    /* ───────────── Tickets (local storage backed for Sprint 2) ───────────── */

    async hasUserTicket(eventId: string, userId?: string): Promise<boolean> {
        if (isSupabaseEnabled && supabase) {
            // Always use the current session user to satisfy RLS
            const uid = userId || await requireAuth();
            // Fast-path: honor recent local join to avoid flicker after remount
            if (wasRecentlyJoined(uid, eventId)) return true;
            const { count, error } = await supabase
                .from('registrations')
                .select('registration_id', { head: true, count: 'exact' })
                .eq('event_id', eventId)
                .eq('user_id', uid);
            if (error) throw error;
            return (count ?? 0) > 0;
        }
        // Local storage fallback
        const { readJSON } = await import('@/lib/storage');
        const all: Ticket[] = readJSON<Ticket[]>('tickets', []);
        if (!userId) return false;
        // Also honor recent local join cache
        return all.some(t => t.eventId === eventId && t.userId === userId) ||
            (getLocalUid() ? wasRecentlyJoined(getLocalUid() as string, eventId) : false);
    },

    async createTicket(eventId: string, _userId?: string): Promise<Ticket> {
        if (isSupabaseEnabled && supabase) {
            // Always use the current session user; ignore any external id to avoid mismatch
            const uid = await requireAuth();
            // Prefer atomic RPC if available
            const { data: rpcData, error: rpcError } = await supabase.rpc('register_for_event', {
                p_event_id: eventId,
            });
            if (!rpcError && rpcData) {
                // Mark recently joined for flicker-free UI
                setRecentlyJoined(uid, eventId);
                return {
                    id: (rpcData as any).registration_id ?? (rpcData as any).id ?? cryptoRandomId(),
                    eventId: (rpcData as any).event_id ?? eventId,
                    userId: uid,
                    qrCode: `QR_${eventId}_${uid}_${Date.now()}`,
                    isCheckedIn: false,
                    createdAt: (rpcData as any).created_at ?? new Date().toISOString(),
                } as Ticket;
            }
            // Fallback to safe client-side checks + insert with unique constraint
            if (rpcError) {
                const msg = (rpcError as any)?.message || '';
                if (/already registered/i.test(msg) || (rpcError as any)?.code === '23505') {
                    throw new Error('You have already RSVPed to this event.');
                }
                if (/capacity/i.test(msg)) {
                    throw new Error('Event is at capacity.');
                }
                if (/not published/i.test(msg)) {
                    throw new Error('Event is not published.');
                }
            }
            // As a last resort, try insert; rely on unique constraint to block dupes
            const { data, error } = await supabase
                .from('registrations')
                .insert({ event_id: eventId, user_id: uid })
                .select('registration_id, event_id, user_id, created_at')
                .single();
            if (error) {
                const code = (error as any)?.code;
                if (code === '23505') {
                    throw new Error('You have already RSVPed to this event.');
                }
                throw error;
            }
            setRecentlyJoined(uid, eventId);
            return {
                id: (data as any).registration_id,
                eventId: (data as any).event_id,
                userId: (data as any).user_id,
                qrCode: `QR_${eventId}_${uid}_${Date.now()}`,
                isCheckedIn: false,
                createdAt: (data as any).created_at,
            } as Ticket;
        }

        // Local storage fallback
        const { readJSON, writeJSON } = await import('@/lib/storage');
        const all: Ticket[] = readJSON<Ticket[]>('tickets', []);
        const uidLS = _userId || (() => {
            try {
                const raw = localStorage.getItem('campusUser');
                return raw ? (JSON.parse(raw)?.id as string | undefined) : undefined;
            } catch { return undefined; }
        })() || 'local-user';
        const exists = all.find(t => t.eventId === eventId && t.userId === uidLS);
        if (exists) {
            throw new Error('You have already RSVPed to this event.');
        }
        try {
            const ev = await getEventById(eventId);
            const cap = ev?.max_cap ?? null;
            if (cap !== null && typeof cap === 'number' && cap > 0) {
                const currentCount = all.filter(t => t.eventId === eventId).length;
                if (currentCount >= cap) {
                    throw new Error('Event is at capacity.');
                }
            }
        } catch {}
        const ticket: Ticket = {
            id: Date.now().toString(),
            eventId,
            userId: uidLS,
            qrCode: `QR_${eventId}_${uidLS}_${Date.now()}`,
            isCheckedIn: false,
            createdAt: new Date().toISOString(),
        };
        writeJSON<Ticket[]>('tickets', [ticket, ...all]);
        setRecentlyJoined(uidLS, eventId);
        return ticket;
    },

    async getUserTickets(userId: string): Promise<Ticket[]> {
        if (isSupabaseEnabled && supabase) {
            const uid = await requireAuth();
            if (uid !== userId) throw new Error('Unauthorized');
            const { data, error } = await supabase
                .from('registrations')
                .select('registration_id, event_id, user_id, created_at')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []).map((r: any) => ({
                id: r.registration_id,
                eventId: r.event_id,
                userId: r.user_id,
                qrCode: `QR_${r.event_id}_${r.user_id}_${new Date(r.created_at).getTime()}`,
                isCheckedIn: false,
                createdAt: r.created_at,
            }));
        }
        const { readJSON } = await import('@/lib/storage');
        const all: Ticket[] = readJSON<Ticket[]>('tickets', []);
        return all.filter(t => t.userId === userId);
    },

    async checkInTicket(ticketId: string): Promise<Ticket> {
        const { readJSON, writeJSON } = await import('@/lib/storage');
        const all: Ticket[] = readJSON<Ticket[]>('tickets', []);
        const idx = all.findIndex(t => t.id === ticketId);
        if (idx === -1) throw new Error('Ticket not found');
        const updated: Ticket = {
            ...all[idx],
            isCheckedIn: true,
            checkedInAt: new Date().toISOString(),
        };
        all[idx] = updated;
        writeJSON<Ticket[]>('tickets', all);
        return updated;
    },

    async getEventTicketCount(eventId: string): Promise<number> {
        if (isSupabaseEnabled && supabase) {
            const { count, error } = await supabase
                .from('registrations')
                .select('registration_id', { count: 'exact', head: true })
                .eq('event_id', eventId);
            if (error) throw error;
            return count ?? 0;
        }
        const { readJSON } = await import('@/lib/storage');
        const all: Ticket[] = readJSON<Ticket[]>('tickets', []);
        return all.filter(t => t.eventId === eventId).length;
    },

    async isEventFull(eventId: string): Promise<boolean> {
        try {
            const ev = await getEventById(eventId);
            const cap = ev?.max_cap ?? null;
            if (!cap || cap <= 0) return false;
            const count = await db.getEventTicketCount(eventId);
            return count >= cap;
        } catch {
            return false;
        }
    },

    /* ───────────── Friends (Supabase-backed) ───────────── */

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

    // Expects a friend REQUEST id
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

    async getFriends(userId: string): Promise<Friendship[]> {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase
            .from('friendships')
            .select('user_id, friend_id, created_at')
            .eq('user_id', uid);

        if (error) throw error;

        return (data ?? []).map((row: any) => ({
            id: `${row.user_id}_${row.friend_id}`,
            userId: row.user_id,
            friendId: row.friend_id,
            status: 'accepted',
            createdAt: row.created_at,
        }));
    },

    async getFriendsEvents(userId: string): Promise<Event[]> {
        const uid = await requireAuth();
        if (!supabase) throw new Error('Supabase not configured');

        const { data: friendRows, error: fErr } = await supabase
            .from('friendships')
            .select('friend_id')
            .eq('user_id', uid);
        if (fErr) throw fErr;

        const friendIds = (friendRows ?? []).map((r) => r.friend_id);
        if (friendIds.length === 0) return [];

        const { data: events, error: eErr } = await supabase
            .from('events')
            .select(`
        event_id, title, description, starts_at, ends_at, location,
        max_cap, image_url, status, created_at, created_by, category
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
            category: ev.category ?? 'Social',
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

    // Expose friend-request helpers for the Friends page
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
