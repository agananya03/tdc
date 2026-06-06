import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/types';
import { useEffect, useState } from 'react';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'tdc-auth-storage',
    }
  )
);

// Safe hook to use in client components to prevent SSR/hydration mismatches
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    user: mounted ? user : null,
    isAuthenticated: mounted ? isAuthenticated : false,
    login,
    logout,
    isHydrated: mounted,
  };
}
