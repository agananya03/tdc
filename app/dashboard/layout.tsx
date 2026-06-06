'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { 
  Users, 
  Search, 
  FileText, 
  Settings, 
  Menu, 
  X, 
  LogOut, 
  Heart, 
  Bell 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, isHydrated } = useAuth();
  
  // Responsive sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Authenticate check
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Handle Logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Close sidebar on path change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // If auth is loading, show a beautiful warm loading page
  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Heart className="size-10 text-primary fill-primary/20 animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">Loading matchmaker portal...</span>
        </div>
      </div>
    );
  }

  // Sidebar navigation links
  const navLinks = [
    { name: 'My Clients', href: '/dashboard', icon: Users },
    { name: 'Search Pool', href: '/dashboard/pool', icon: Search },
    { name: 'Notes', href: '#', icon: FileText },
    { name: 'Settings', href: '#', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-xs z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border/80 flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-screen`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-border/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="size-4 text-primary fill-primary/20" />
            </div>
            <span className="font-serif font-bold text-lg text-foreground tracking-wide">TDC Portal</span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            // Highlight My Clients for dashboard home and client subpages
            const isActive = link.href === '#' ? false : (pathname === link.href || (link.href === '/dashboard' && pathname.startsWith('/dashboard/client/')));
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className={`size-4.5 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logged in user info & logout */}
        <div className="p-4 border-t border-border/80 bg-secondary/35">
          <div className="flex items-center gap-3 mb-4">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name}
                width={40}
                height={40}
                unoptimized
                className="w-10 h-10 rounded-full object-cover border border-border shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {user?.name ? user.name[0] : 'M'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-foreground truncate">{user?.name}</h4>
              <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-wider">{user?.role} Matchmaker</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive text-muted-foreground font-semibold rounded-xl text-xs transition-all"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground"
            >
              <Menu className="size-5" />
            </button>
            <h2 className="text-base font-bold text-foreground tracking-tight font-serif lg:text-lg">
              {pathname === '/dashboard' ? 'Matchmaker Dashboard' : navLinks.find(l => l.href === pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground relative transition-colors">
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>

            <div className="h-6 w-px bg-border/80 hidden sm:block" />

            {/* Desktop User display */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <span className="block text-xs font-bold text-foreground">{user?.name}</span>
                <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">TDC Team</span>
              </div>
              {user?.avatarUrl && (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  width={36}
                  height={36}
                  unoptimized
                  className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shadow-xs"
                />
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Pages Scroll Container */}
        <main className="flex-1 p-6 space-y-6">
          
          {/* Page content wrapper wrapped in transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
