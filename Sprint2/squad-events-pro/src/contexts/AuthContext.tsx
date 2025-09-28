import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';

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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const init = async () => {
      try {
        if (isSupabaseEnabled && supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user) {
            const mapped: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email || 'User',
              role: (session.user.user_metadata?.role as UserRole) || 'student',
              isApproved: true,
              avatar: session.user.user_metadata?.avatar_url,
            };
            setUser(mapped);
            localStorage.setItem('campusUser', JSON.stringify(mapped));
          } else {
            const savedUser = localStorage.getItem('campusUser');
            if (savedUser) setUser(JSON.parse(savedUser));
          }
          const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              const mapped: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.email || 'User',
                role: (session.user.user_metadata?.role as UserRole) || 'student',
                isApproved: true,
                avatar: session.user.user_metadata?.avatar_url,
              };
              setUser(mapped);
              localStorage.setItem('campusUser', JSON.stringify(mapped));
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
      if (isSupabaseEnabled && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return false;
        const session = data.session;
        if (session?.user) {
          const mapped: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email || 'User',
            role: (session.user.user_metadata?.role as UserRole) || 'student',
            isApproved: true,
            avatar: session.user.user_metadata?.avatar_url,
          };
          setUser(mapped);
          localStorage.setItem('campusUser', JSON.stringify(mapped));
          return true;
        }
        return false;
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        const foundUser = mockUsers.find(u => u.email === email);
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('campusUser', JSON.stringify(foundUser));
          return true;
        }
        return false;
      }
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