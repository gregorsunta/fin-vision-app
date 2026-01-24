import { writable } from 'svelte/store';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  user: { email: string } | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    accessToken: null,
    isAuthenticated: false,
    user: null,
  });

  return {
    subscribe,
    setAccessToken: (token: string) => {
      update(state => ({
        ...state,
        accessToken: token,
        isAuthenticated: true,
      }));
    },
    setUser: (email: string) => {
      update(state => ({
        ...state,
        user: { email },
      }));
    },
    login: (token: string, email: string) => {
      set({
        accessToken: token,
        isAuthenticated: true,
        user: { email },
      });
    },
    logout: () => {
      set({
        accessToken: null,
        isAuthenticated: false,
        user: null,
      });
    },
    reset: () => {
      set({
        accessToken: null,
        isAuthenticated: false,
        user: null,
      });
    },
  };
}

export const authStore = createAuthStore();
