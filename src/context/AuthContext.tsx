import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode, type Dispatch, type SetStateAction,
} from 'react';
import type { Conversation, Message, User } from '@/types';
import { authApi, conversationApi } from '@/services/api';

type Screen = 'login' | 'home' | 'create' | 'resume' | 'chat';

interface AuthState {
  user: User | null;
  currentConversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
  screen: Screen;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  loginWithGoogle: () => void;
  setUserEmail: (email: string) => Promise<void>;
  logout: () => void;
  navigate: (screen: Screen) => void;
  setCurrentConversation: (conv: Conversation | null) => void;
  refreshConversations: () => Promise<void>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  addMessage: (message: Message) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'delulu_auth_email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem(STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = params.get('email');
    const email = emailFromUrl || storedEmail;

    console.log('[auth] app init', {
      storedEmail,
      emailFromUrl,
      email,
      pathname: window.location.pathname,
      search: window.location.search,
    });

    if (!email) {
      console.log('[auth] no email found, setting login screen');
      setScreen('login');
      return;
    }

    if (emailFromUrl) {
      console.log('[auth] clearing email query param from URL');
      window.history.replaceState({}, '', window.location.pathname);
    }

    setLoading(true);
    authApi.getProfile(email)
      .then((profile) => {
        console.log('[auth] profile fetched successfully', profile);
        setUser(profile);
        localStorage.setItem(STORAGE_KEY, profile.email);
        window.history.replaceState({ screen: 'home' }, '', window.location.pathname);
        setScreen('home');
      })
      .catch((err) => {
        console.error('[auth] profile fetch failed', err);
        localStorage.removeItem(STORAGE_KEY);
        setScreen('login');
      })
      .finally(() => {
        console.log('[auth] profile request complete');
        setLoading(false);
      });
  }, []);

  const loginWithGoogle = useCallback(() => { authApi.loginWithGoogle(); }, []);

  const setUserEmail = useCallback(async (email: string) => {
    console.log('[auth] setUserEmail called', email);
    setLoading(true); setError(null);
    try {
      const profile = await authApi.getProfile(email);
      console.log('[auth] setUserEmail profile ok', profile);
      setUser(profile);
      localStorage.setItem(STORAGE_KEY, profile.email);
      window.history.replaceState({ screen: 'home' }, '', window.location.pathname);
      setScreen('home');
    } catch (err) {
      console.error('[auth] setUserEmail failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch user profile';
      setError(msg);
      throw err;
    } finally {
      console.log('[auth] setUserEmail finished');
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null); setCurrentConversation(null);
    setConversations([]); setMessages([]); setScreen('login');
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const nextScreen = (event.state as { screen?: Screen } | null)?.screen ?? 'home';
      setScreen(nextScreen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((s: Screen) => {
    setError(null);
    setScreen((prev) => {
      if (prev === s) return prev;
      window.history.pushState({ screen: s }, '', window.location.pathname);
      return s;
    });
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const list = await conversationApi.fetchAll(user._id);
      setConversations(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(msg);
    }
  }, [user]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    user, currentConversation, conversations, messages, screen, loading, error,
    loginWithGoogle, setUserEmail, logout, navigate, setCurrentConversation,
    refreshConversations, setMessages, addMessage, clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
