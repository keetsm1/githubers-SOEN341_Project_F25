// Database Service Layer - Placeholder functions for Supabase integration
// All functions here represent what would be actual database calls
import {createClient} from '@supabase/supabase-js';

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


export const supabase = isSupabaseEnabled ? 
  createClient(supaBaseUrl as string, supabaseAnonKey as string,{
    auth: {
      persistSession  : true,
      autoRefreshToken: true,
  },
}): null;


export const auth={
  async signUp(email:string,password:string,fullName:string){
    if (!supabase){
      throw new Error('Supabase not configured');
    }

    const {data,error}= await supabase.auth.signUp({
      email,
      password,
      options:{
        data:{full_name:fullName},
      },
    });

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

    const e= email.trim().toLowerCase();
    const p= password.trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });

    return {
      user: data.user ?? null,
      session: data.session ?? null,
      error: error ?? null,
      errorMessage: error?.message || null,
    };
  },
}


export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
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
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
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

// Mock data for demonstration
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
    createdAt: '2024-09-20T10:00:00Z'
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
    createdAt: '2024-09-15T14:00:00Z'
  }
];

// Event Management
export const db = {
  // Events
  async createEvent(eventData: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    // Would call: await supabase.from('events').insert(eventData)
    console.log('DB: Creating event', eventData);
    const newEvent = {
      ...eventData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    mockEvents.push(newEvent);
    return newEvent;
  },

  async getEvents(filters?: {
    limit?: number;
    page?: number;
    category?: string;
    search?: string;
    organizerId?: string;
    approved?: boolean;
  }): Promise<{ data: Event[]; meta: { total: number; page: number; perPage: number } }> {
    // Would call: await supabase.from('events').select().match(filters)
    console.log('DB: Fetching events with filters', filters);
    
    let filteredEvents = [...mockEvents];
    
    if (filters?.approved !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.isApproved === filters.approved);
    }
    if (filters?.category) {
      filteredEvents = filteredEvents.filter(e => e.category === filters.category);
    }
    if (filters?.search) {
      filteredEvents = filteredEvents.filter(e => 
        e.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
        e.description.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }
    if (filters?.organizerId) {
      filteredEvents = filteredEvents.filter(e => e.organizerId === filters.organizerId);
    }

    const page = filters?.page || 1;
    const perPage = filters?.limit || 20;
    const start = (page - 1) * perPage;
    const end = start + perPage;

    return {
      data: filteredEvents.slice(start, end),
      meta: {
        total: filteredEvents.length,
        page,
        perPage
      }
    };
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    // Would call: await supabase.from('events').update(updates).eq('id', id)
    console.log('DB: Updating event', id, updates);
    const eventIndex = mockEvents.findIndex(e => e.id === id);
    if (eventIndex >= 0) {
      mockEvents[eventIndex] = { ...mockEvents[eventIndex], ...updates };
      return mockEvents[eventIndex];
    }
    throw new Error('Event not found');
  },

  async deleteEvent(id: string): Promise<void> {
    // Would call: await supabase.from('events').delete().eq('id', id)
    console.log('DB: Deleting event', id);
    const eventIndex = mockEvents.findIndex(e => e.id === id);
    if (eventIndex >= 0) {
      mockEvents.splice(eventIndex, 1);
    }
  },

  // Tickets
  async createTicket(eventId: string, userId: string): Promise<Ticket> {
    // Would call: await supabase.from('tickets').insert({ eventId, userId })
    console.log('DB: Creating ticket for event', eventId, 'user', userId);
    return {
      id: Date.now().toString(),
      eventId,
      userId,
      qrCode: `QR_${eventId}_${userId}_${Date.now()}`,
      isCheckedIn: false,
      createdAt: new Date().toISOString()
    };
  },

  async getUserTickets(userId: string): Promise<Ticket[]> {
    // Would call: await supabase.from('tickets').select().eq('userId', userId)
    console.log('DB: Fetching tickets for user', userId);
    return []; // Mock empty array
  },

  async checkInTicket(ticketId: string): Promise<Ticket> {
    // Would call: await supabase.from('tickets').update({ isCheckedIn: true }).eq('id', ticketId)
    console.log('DB: Checking in ticket', ticketId);
    return {
      id: ticketId,
      eventId: '1',
      userId: '1',
      qrCode: `QR_${ticketId}`,
      isCheckedIn: true,
      checkedInAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  },

  // Friends
  async sendFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    // Would call: await supabase.from('friendships').insert({ userId, friendId, status: 'pending' })
    console.log('DB: Sending friend request from', userId, 'to', friendId);
    return {
      id: Date.now().toString(),
      userId,
      friendId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  },

  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    // Would call: await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    console.log('DB: Accepting friend request', friendshipId);
    return {
      id: friendshipId,
      userId: '1',
      friendId: '2',
      status: 'accepted',
      createdAt: new Date().toISOString()
    };
  },

  async getFriends(userId: string): Promise<Friendship[]> {
    // Would call: await supabase.from('friendships').select().eq('userId', userId).eq('status', 'accepted')
    console.log('DB: Fetching friends for user', userId);
    return []; // Mock empty array
  },

  async getFriendsEvents(userId: string): Promise<Event[]> {
    // Would call complex join query to get events that friends are attending
    console.log('DB: Fetching friends events for user', userId);
    return mockEvents.slice(0, 2); // Mock some events
  },

  // Companies
  async getCompanies(status?: 'pending' | 'approved' | 'rejected'): Promise<Company[]> {
    // Would call: await supabase.from('companies').select().match({ status })
    console.log('DB: Fetching companies with status', status);
    return [
      {
        id: '1',
        name: 'Tech Club',
        userId: '2',
        email: 'sarah@techclub.org',
        description: 'University technology enthusiasts club',
        status: status || 'approved',
        createdAt: '2024-09-01T10:00:00Z'
      }
    ];
  },

  async approveCompany(companyId: string): Promise<Company> {
    // Would call: await supabase.from('companies').update({ status: 'approved' }).eq('id', companyId)
    console.log('DB: Approving company', companyId);
    return {
      id: companyId,
      name: 'Tech Club',
      userId: '2',
      email: 'sarah@techclub.org',
      description: 'University technology enthusiasts club',
      status: 'approved',
      createdAt: '2024-09-01T10:00:00Z'
    };
  },

  async rejectCompany(companyId: string): Promise<Company> {
    // Would call: await supabase.from('companies').update({ status: 'rejected' }).eq('id', companyId)
    console.log('DB: Rejecting company', companyId);
    return {
      id: companyId,
      name: 'Tech Club',
      userId: '2',
      email: 'sarah@techclub.org',
      description: 'University technology enthusiasts club',
      status: 'rejected',
      createdAt: '2024-09-01T10:00:00Z'
    };
  },

  // Analytics
  async getGlobalStats(): Promise<Analytics> {
    // Would call multiple queries to aggregate stats across all events
    console.log('DB: Fetching global analytics');
    return {
      totalRegistrations: 96,
      ticketsSold: 100,
      checkedIn: 83,
      attendanceRate: 83,
      eventsByCategory: {
        'Technology': 15,
        'Career': 8,
        'Sports': 12,
        'Arts': 6,
        'Social': 20
      },
      registrationTrend: [
        { date: '2024-09-01', count: 5 },
        { date: '2024-09-02', count: 8 },
        { date: '2024-09-03', count: 12 },
        { date: '2024-09-04', count: 15 },
        { date: '2024-09-05', count: 22 }
      ]
    };
  },

  async getEventStats(eventId: string): Promise<Analytics> {
    // Would call queries specific to one event
    console.log('DB: Fetching analytics for event', eventId);
    return {
      totalRegistrations: 32,
      ticketsSold: 35,
      checkedIn: 28,
      attendanceRate: 80,
      eventsByCategory: {},
      registrationTrend: [
        { date: '2024-09-20', count: 5 },
        { date: '2024-09-21', count: 12 },
        { date: '2024-09-22', count: 15 }
      ]
    };
  }
};