import { supabase } from '../../lib/supabase';
import type {
  Session,
  User,
  AuthResponse,
  AuthTokenResponsePassword,
} from '@supabase/supabase-js';

export interface SignUpParams {
  email: string;
  password: string;
  redirectTo: string;
  captchaToken?: string;
  displayName?: string;
}

export interface SignInParams {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface ResetPasswordParams {
  email: string;
  redirectTo: string;
  captchaToken?: string;
}

export interface ResendVerificationParams {
  email: string;
  redirectTo: string;
  captchaToken?: string;
}

export interface SignInWithOAuthParams {
  provider: 'google';
  redirectTo?: string;
}

/**
 * Centralized Supabase Auth service.
 * Enforces parameter normalization and secure error boundaries.
 */
export const authService = {
  async signUp(params: SignUpParams): Promise<AuthResponse['data']> {
    const { email, password, redirectTo, captchaToken, displayName } = params;
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        captchaToken,
        data: displayName
          ? { display_name: displayName.trim(), full_name: displayName.trim() }
          : undefined,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async signInWithPassword(params: SignInParams): Promise<AuthTokenResponsePassword['data']> {
    const { email, password, captchaToken } = params;
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
      options: {
        captchaToken,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async resetPasswordForEmail(params: ResetPasswordParams): Promise<void> {
    const { email, redirectTo, captchaToken } = params;
    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
      captchaToken,
    });

    if (error) {
      throw error;
    }
  },

  async updatePassword(password: string): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  },

  async resendVerification(params: ResendVerificationParams): Promise<void> {
    const { email, redirectTo, captchaToken } = params;
    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectTo,
        captchaToken,
      },
    });

    if (error) {
      throw error;
    }
  },

  async exchangeCodeForSession(code: string): Promise<Session> {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    if (!data.session) {
      throw new Error('No session returned after code exchange');
    }
    return data.session;
  },

  async getUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    return data.user;
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return null;
    }
    return data.session;
  },

  async signOut(scope: 'global' | 'local' = 'global'): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope });
    if (error) {
      throw error;
    }
  },

  async signInWithOAuth(params: SignInWithOAuthParams): Promise<void> {
    const { provider, redirectTo } = params;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw error;
    }
  },

  async updateDisplayName(displayName: string): Promise<User> {
    const cleanName = displayName.trim();
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: cleanName,
        full_name: cleanName,
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Failed to update user profile');
    }

    // Sync with public.profiles table
    try {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, display_name: cleanName }, { onConflict: 'id' });
    } catch (profileErr) {
      console.warn('[NearNotice Auth] Profile table sync notice:', profileErr);
    }

    return data.user;
  },
};
