import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
