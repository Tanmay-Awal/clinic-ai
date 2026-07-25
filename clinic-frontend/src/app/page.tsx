'use client';
import { CompanyLogos } from '@/components/CompanyLogos';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, BarChart3, Plug, Shield, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, getUserFullName } from '@/store/authStore';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function Landing() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      // Clear React Query cache before logout
      queryClient.clear();
      await authApi.logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const features = [
    {
      icon: Bot,
      title: 'AI Handled Calls',
      description: 'Every call, transcribed, categorized, and analyzed automatically.',
    },
    {
      icon: BarChart3,
      title: 'Smart Insights',
      description: 'See sentiment, conversions, and CX metrics in real time.',
    },
    {
      icon: Plug,
      title: 'Effortless Integrations',
      description: 'Connect Twilio, SevenRooms, Salesforce, and more in seconds.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'End-to-end encryption, GDPR compliant, enterprise ready.',
    },
  ];

  return (
    <div className="min-h-dvh">
      {/* Ambient background effects - Movable glow covering entire landing page */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>


        {/* Center section glows */}
        <div
          className="absolute left-1/2 top-1/2 h-[70vw] w-[70vw] md:h-[700px] md:w-[700px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(247, 85, 20, 0.08) 0%, rgba(247, 85, 20, 0.05) 40%, transparent 100%)',
            animationDelay: '4s'
          }}
        />
        <div
          className="absolute right-1/3 top-2/3 h-[60vw] w-[60vw] md:h-[600px] md:w-[600px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 121, 23, 0.11) 0%, rgba(255, 121, 23, 0.07) 40%, transparent 100%)',
            animationDelay: '2s'
          }}
        />
        <div
          className="absolute left-1/3 top-1/2 h-[65vw] w-[65vw] md:h-[650px] md:w-[650px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 156, 26, 0.09) 0%, rgba(255, 156, 26, 0.05) 40%, transparent 100%)',
            animationDelay: '5s'
          }}
        />

        {/* Corner glows for complete coverage */}
        <div
          className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 121, 23, 0.08) 0%, rgba(255, 121, 23, 0.05) 40%, transparent 100%)',
            animationDelay: '6s'
          }}
        />
        <div
          className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(247, 85, 20, 0.08) 0%, rgba(247, 85, 20, 0.05) 40%, transparent 100%)',
            animationDelay: '2.2s'
          }}
        />
        <div
          className="absolute left-0 bottom-0 h-[500px] w-[500px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 156, 26, 0.08) 0%, rgba(255, 156, 26, 0.05) 40%, transparent 100%)',
            animationDelay: '5.5s'
          }}
        />
        <div
          className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full blur-3xl animate-movable-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 121, 23, 0.08) 0%, rgba(255, 121, 23, 0.05) 40%, transparent 100%)',
            animationDelay: '3.8s'
          }}
        />

        {/* Subtle white glows for depth and coverage */}
        <div className="absolute left-1/4 top-1/4 h-[40vw] w-[40vw] md:h-[400px] md:w-[400px] rounded-full bg-white/[0.02] blur-3xl animate-movable-glow" style={{ animationDelay: '5s' }} />
        <div className="absolute right-1/4 bottom-1/4 h-[35vw] w-[35vw] md:h-[350px] md:w-[350px] rounded-full bg-white/[0.015] blur-3xl animate-movable-glow" style={{ animationDelay: '6.5s' }} />
        <div className="absolute left-1/2 top-1/3 h-[45vw] w-[45vw] md:h-[450px] md:w-[450px] rounded-full bg-white/[0.018] blur-3xl animate-movable-glow" style={{ animationDelay: '7s' }} />
        <div className="absolute right-1/3 bottom-1/2 h-[40vw] w-[40vw] md:h-[400px] md:w-[400px] rounded-full bg-white/[0.015] blur-3xl animate-movable-glow" style={{ animationDelay: '4.2s' }} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CliniCall Logo" className="h-6 md:h-8 w-auto object-contain dark:invert-0 invert" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground mr-2">
                  <span>Welcome, {getUserFullName(user) || user?.email}</span>
                </div>
                <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push('/login')}>
                  Login
                </Button>
                <Button onClick={() => router.push('/login')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  {isAuthenticated ? (
                    <>
                      <div className="px-2 text-sm text-muted-foreground mb-2">
                        Welcome, {getUserFullName(user) || user?.email}
                      </div>
                      <Button onClick={() => router.push('/dashboard')} className="w-full justify-start">
                        Dashboard
                      </Button>
                      <Button variant="outline" onClick={handleLogout} className="w-full justify-start">
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" onClick={() => router.push('/login')} className="w-full justify-start">
                        Login
                      </Button>
                      <Button onClick={() => router.push('/login')} className="w-full justify-start">
                        Get Started
                      </Button>
                    </>
                  )}
                  <div className="border-t border-border mt-4 pt-4">
                    <div className="flex flex-col gap-2">
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1">Features</a>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1">Pricing</a>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1">Support</a>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-dvh items-center justify-center px-4 pt-16">
        {/* Very light orange glow in center */}

        <div className="container mx-auto max-w-6xl rounded-2xl py-20 relative z-10">
          <div className="text-center space-y-8 animate-fade-in py-20 rounded-2xl">

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="absolute h-[80vw] w-[80vw] md:h-[1000px] md:w-[1000px] rounded-full blur-3xl animate-movable-glow"
                style={{
                  background: 'radial-gradient(circle, rgba(247, 85, 20, 0.15) 0%, rgba(255, 121, 23, 0.12) 40%, rgba(255, 156, 26, 0.08) 30%, transparent 100%)'
                }}
              />
            </div>
            <div className="space-y-4 relative">
              {/* Moving glow effect behind text */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vw] md:w-[800px] md:h-[500px] rounded-full blur-3xl animate-text-glow-move pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(255, 121, 23, 0.6) 0%, rgba(255, 121, 23, 0.4) 40%, rgba(255, 121, 23, 0.2) 70%, transparent 100%)'
                }}
              />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight relative z-10">
                Intelligent Conversations.
                <br />
                <span>
                  Complete Control.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto relative z-10">
                CliniCall Voice Agents handle every call — from bookings to inquiries —
                with real-time insights, AI summaries, and actionable analytics.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-border"
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 text-primary-foreground" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-border"
                    onClick={() => router.push('/login')}
                  >
                    Login to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 text-primary-foreground" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base font-medium hover:bg-secondary hover:scale-105 transition-all"
                    onClick={() => router.push('/login')}
                  >
                    Request Demo
                  </Button>
                </>
              )}
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-foreground" />
              <span>Enterprise-grade security</span>
              <span className="text-border">•</span>
              <Check className="h-4 w-4 text-foreground" />
              <span>GDPR compliant</span>
              <span className="text-border">•</span>
              <Check className="h-4 w-4 text-foreground" />
              <span>99.9% uptime</span>
            </div>
          </div>
        </div>
      </section >

      {/* Feature Highlights */}
      < section className="relative py-24 px-4 bg-transparent" >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to manage voice interactions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful AI-driven features that transform how you handle calls
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-foreground group-hover:bg-accent transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section >

      {/* Visual Section - Dashboard Mockup */}
      < section className="relative py-24 px-4 overflow-hidden" >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Voice Data, Visualized
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful dashboards that make sense of every conversation
            </p>
          </div>

          {/* Dashboard mockup placeholder */}
          <div className="relative rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-1 shadow-2xl">
            <div className="rounded-xl bg-background/95 backdrop-blur-sm p-8">
              <div className="aspect-video rounded-lg border border-border flex items-center justify-center">
                <div className="text-center space-y-4 h-full w-full">
                  {/* <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary"> */}
                  {/* <BarChart3 className="h-8 w-8 text-foreground" /> */}
                  <img src="/assets/dashboard.jpeg" alt="Dashboard Mockup" className="h-full w-full object-contain" />
                  {/* </div> */}
                  <p className="text-muted-foreground">
                    Interactive dashboard preview
                  </p>
                </div>
              </div>

              {/* Mini stats overlay */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">1,247</div>
                  <div className="text-xs text-muted-foreground">Calls Today</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">94%</div>
                  <div className="text-xs text-muted-foreground">Positive Sentiment</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">68%</div>
                  <div className="text-xs text-muted-foreground">Conversion Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Testimonials */}
      < section className="relative py-16 px-4" >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by leading learning brands
            </h2>
          </div>

          {/* <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <p className="text-foreground mb-4 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {testimonial.author}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div> */}

          <CompanyLogos />
        </div>
      </section >

      {/* CTA Banner */}
      < section className="relative py-16 px-4" >
        <div className="container mx-auto max-w-4xl">
          {/* Glowing divider */}
          <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Experience AI-Driven Voice Automation?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join leading healthcare providers using CliniCall to transform their patient communications
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    onClick={() => router.push('/login')}
                  >
                    Login
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base font-medium hover:bg-secondary hover:scale-105 transition-all"
                    onClick={() => router.push('/login')}
                  >
                    Schedule Demo
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="relative border-t border-border bg-card/50 backdrop-blur-sm py-12 px-4" >
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left - Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {/* <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-lg font-semibold">CliniCall</span> */}
                <img src="/logo.png" alt="CliniCall Logo" className="h-6 md:h-8 w-auto object-contain dark:invert-0 invert" />
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                AI-powered voice automation for clinics and healthcare.
                <br />
                <span className="text-xs">by CliniCall </span>
              </p>
            </div>

            {/* Right - Links */}
            <div className="flex flex-col sm:flex-row gap-8 sm:justify-end">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="/login" className="hover:text-foreground transition-colors">
                      Login
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Pricing
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Support
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} CliniCall. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
