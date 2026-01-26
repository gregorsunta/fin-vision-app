import { writable } from 'svelte/store';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  user: { email: string } | null;
}

const AUTH_STORAGE_KEY = 'fin-vision-auth';

// Load initial state from localStorage
function loadAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      accessToken: null,
      isAuthenticated: false,
      user: null,
    };
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return {
        accessToken: null,
        isAuthenticated: false,
        user: null,
      };
    }

    const parsed = JSON.parse(stored);
    console.log('🔐 Loaded auth state from localStorage:', { hasToken: !!parsed.accessToken, user: parsed.user?.email });
    
    return {
      accessToken: parsed.accessToken || null,
      isAuthenticated: !!parsed.accessToken,
      user: parsed.user || null,
    };
  } catch (err) {
    console.error('❌ Failed to load auth state:', err);
    return {
      accessToken: null,
      isAuthenticated: false,
      user: null,
    };
  }
}

// Save auth state to localStorage
function saveAuthState(state: AuthState) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    console.log('💾 Saved auth state to localStorage');
  } catch (err) {
    console.error('❌ Failed to save auth state:', err);
  }
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(loadAuthState());

  return {
    subscribe,
    setAccessToken: (token: string) => {
      update(state => {
        const newState = {
          ...state,
          accessToken: token,
          isAuthenticated: true,
        };
        saveAuthState(newState);
        return newState;
      });
    },
    setUser: (email: string) => {
      update(state => {
        const newState = {
          ...state,
          user: { email },
        };
        saveAuthState(newState);
        return newState;
      });
    },
    login: (token: string, email: string) => {
      const newState = {
        accessToken: token,
        isAuthenticated: true,
        user: { email },
      };
      saveAuthState(newState);
      set(newState);
    },
    logout: () => {
      const newState = {
        accessToken: null,
        isAuthenticated: false,
        user: null,
      };
      saveAuthState(newState);
      set(newState);
    },
    reset: () => {
      const newState = {
        accessToken: null,
        isAuthenticated: false,
        user: null,
      };
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('🗑️ Cleared auth state from localStorage');
      }
      set(newState);
    },
  };
}

export const authStore = createAuthStore();
