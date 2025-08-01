import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

export function AuthComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Where The Elo Am I
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your GeoGuessr league account
          </p>
        </div>
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
            view="sign_in"
          />
        </div>
      </div>
    </div>
  );
}
