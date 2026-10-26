import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const savedToken = localStorage.getItem('dg_token');
const savedUser = localStorage.getItem('dg_user') ? JSON.parse(localStorage.getItem('dg_user')!) : null;

export const useAuthStore = create<AuthState>((set) => ({
  token: savedToken,
  user: savedUser,
  isAuthenticated: Boolean(savedToken),

  setAuth: (token: string, user: User) => {
    localStorage.setItem('dg_token', token);
    localStorage.setItem('dg_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('dg_token');
    localStorage.removeItem('dg_user');
    set({ token: null, user: null, isAuthenticated: false });
  }
}));
