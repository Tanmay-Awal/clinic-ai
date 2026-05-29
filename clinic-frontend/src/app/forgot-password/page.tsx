'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateEmail(email)) return;
    
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      // Mock rate limiting
      if (email === 'spam@test.com') {
        setRateLimited(true);
        return;
      }
      
      // Always show success to prevent email enumeration
      setSubmitted(true);
    }, 800);
  };

  if (submitted) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
        </div>

        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <CheckCircle2 className="h-6 w-6 text-foreground" />
              </div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-2">
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Didn't receive an email? Check your spam folder or contact support if the issue persists.
              </p>
              <Button asChild className="h-11 w-full">
                <a href="/login">Return to Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {/* Rate limit warning */}
          {rateLimited && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Too many requests. Please wait a few minutes before trying again.
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateEmail(email)}
                autoComplete="username"
                required
                className="h-11"
                aria-invalid={!!error}
                aria-describedby={error ? 'email-error' : undefined}
                disabled={rateLimited}
              />
              {error && (
                <p id="email-error" className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-medium"
              disabled={isLoading || rateLimited}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to login
            </a>
          </div>
        </div>

        {/* Hint */}
        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          Hint: Use spam@test.com to test rate limiting
        </p>
      </div>
    </div>
  );
}
