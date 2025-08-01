import { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { ThemeToggle } from './ThemeToggle';

export function AuthComponent() {
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Where the ELO am I?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {view === 'sign_in'
              ? 'Sign in to your GeoGuessr league account'
              : 'Create your GeoGuessr league account'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3B82F6',
                    brandAccent: '#2563EB',
                  },
                },
              },
            }}
            providers={['google']}
            redirectTo={window.location.origin}
            showLinks={false}
            view={view}
            additionalData={{
              data: {
                // Add any additional user metadata here
                app_name: 'Where the ELO am I?',
                user_type: 'player',
              },
            }}
          />

          <div className="mt-6 text-center">
            <button
              onClick={() =>
                setView(view === 'sign_in' ? 'sign_up' : 'sign_in')
              }
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {view === 'sign_in'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
