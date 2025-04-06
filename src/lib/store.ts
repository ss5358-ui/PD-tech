import { create } from 'zustand';
import { supabase } from './supabase';

interface UserState {
  currentTime: any;
  user: any | null;
  role: 'head' | 'employee' | 'admin' | 'e.head' | 'e.employee' | 'finance.employee'  | null;
  setUser: (user: any) => void;
  setRole: (role: 'head' | 'employee' | 'admin' | 'e.head' | 'e.employee' | 'finance.employee'  | null) => void;
  logout: () => void;
}

export const useStore = create<UserState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null });
  },
}));