'use client';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [isPasswordMode, setIsPasswordMode] = useState(true);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      if (isPasswordMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Redirect admin users to admin panel, regular users to home
        const { data: user } = await supabase.auth.getUser();
        const userRole = user.user?.user_metadata?.role || user.user?.app_metadata?.role;

        if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'shopmanager') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        // Magic link mode
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });
        if (error) throw error;
        setIsMagicLinkSent(true);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {isMagicLinkSent ? (
            <div className="text-center">
              <p className="text-sm text-green-600 mb-4">
                Magic link byl odeslán na váš email. Zkontrolujte svou poštovní schránku.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsMagicLinkSent(false);
                  setIsPasswordMode(true);
                }}
              >
                Zpět na přihlášení
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={isPasswordMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsPasswordMode(true)}
                  >
                    Heslo
                  </Button>
                  <Button
                    type="button"
                    variant={!isPasswordMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsPasswordMode(false)}
                  >
                    Magic Link
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {isPasswordMode && (
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/auth/forgot-password"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? isPasswordMode
                      ? 'Logging in...'
                      : 'Sending magic link...'
                    : isPasswordMode
                      ? 'Login'
                      : 'Send Magic Link'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
