import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import {auth} from '../services/database'
export type UserRole = 'student' | 'company' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  isApproved: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock users for demo purposes
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Alex Student',
    email: 'alex@university.edu',
    role: 'student',
    isApproved: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
  },
  {
    id: '2',
    name: 'Sarah Organizer',
    email: 'sarah@techclub.org',
    role: 'company',
    organization: 'Tech Club',
    isApproved: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    id: '3',
    name: 'Mike Admin',
    email: 'admin@university.edu',
    role: 'admin',
    isApproved: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<{
    full_name?: string | null;
    role?: string | null;
    avatar_url?: string | null;
    organization?: string | null;
  } | null> => {
    if (!isSupabaseEnabled || !supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('user_id', userId)
      .single();
    if (error) {
      // Swallow and fallback to metadata/local
      return null;
    }
    return data as any;
  };

  const mapSupabaseUserToAppUser = async (u: any): Promise<User> => {
    // Try to read profile first; fallback to user metadata
    const profile = await fetchProfile(u.id);
    const roleFromProfile = (profile?.role || u.user_metadata?.role) as UserRole | undefined;
    const nameFromProfile = profile?.full_name || u.user_metadata?.full_name || u.email || 'User';
    const avatarFromProfile = profile?.avatar_url || u.user_metadata?.avatar_url || undefined;
    const mapped: User = {
      id: u.id,
      email: u.email || '',
      name: nameFromProfile || 'User',
      role: (roleFromProfile === 'student' || roleFromProfile === 'company' || roleFromProfile === 'admin')
        ? roleFromProfile
        : 'student',
      isApproved: true,
      avatar: avatarFromProfile || undefined,
    };
    return mapped;
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const init = async () => {
      try {
        if (isSupabaseEnabled && supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user) {
            const mapped: User = await mapSupabaseUserToAppUser(session.user);
            setUser(mapped);
            localStorage.setItem('campusUser', JSON.stringify(mapped));
          } else {
            const savedUser = localStorage.getItem('campusUser');
            if (savedUser) setUser(JSON.parse(savedUser));
          }
          const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              (async () => {
                const mapped: User = await mapSupabaseUserToAppUser(session.user);
                setUser(mapped);
                localStorage.setItem('campusUser', JSON.stringify(mapped));
              })();
            } else {
              setUser(null);
              localStorage.removeItem('campusUser');
            }
          });
          unsubscribe = () => sub.subscription.unsubscribe();
        } else {
          const savedUser = localStorage.getItem('campusUser');
          if (savedUser) setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    init();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error, user, session } = await auth.signIn(email, password);

      if (error || !user) return false;
      let mapped: User;
      if (isSupabaseEnabled && supabase) {
        mapped = await mapSupabaseUserToAppUser(user);
      } else {
        // Fallback to metadata only if Supabase client isn't available
        mapped = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email || 'User',
          role: (user.user_metadata?.role as UserRole) || 'student',
          isApproved: true,
          avatar: user.user_metadata?.avatar_url,
        };
      }

      setUser(mapped);
      localStorage.setItem('campusUser', JSON.stringify(mapped));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (isSupabaseEnabled && supabase) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('campusUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};