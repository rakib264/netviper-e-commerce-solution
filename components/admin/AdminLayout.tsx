'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import MuscariMartLogo from "@/lib/assets/images/muscarimart.jpg"
import {
  BarChart3,
  ChevronDown,
  Database,
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import NotificationBell from '@/components/notifications/NotificationBell';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Grouped for a clearer visual hierarchy. Order is preserved from the flat
// list; the section labels only break up the rail so it reads as a designed
// product rather than 17 identical rows.
const sidebarGroups = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', roles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { title: 'Products', icon: Package, href: '/admin/products', roles: ['admin', 'manager', 'staff'] },
      { title: 'Categories', icon: Tag, href: '/admin/categories', roles: ['admin', 'manager', 'staff'] },
      { title: 'Orders', icon: ShoppingBag, href: '/admin/orders', roles: ['admin', 'manager', 'staff'] },
      { title: 'Coupons', icon: FileText, href: '/admin/coupons', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { title: 'Marketing & Deals', icon: Megaphone, href: '/admin/marketing', roles: ['admin', 'manager'] },
      { title: 'Courier', icon: Truck, href: '/admin/courier', roles: ['admin', 'manager', 'staff'] },
      { title: 'Customers', icon: Users, href: '/admin/customers', roles: ['admin', 'manager'] },
      { title: 'Customer Feedback', icon: Star, href: '/admin/customer-feedback', roles: ['admin', 'manager'] },
      { title: 'Messaging', icon: MessageSquare, href: '/admin/messaging', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Content',
    items: [
      { title: 'Landing Management', icon: Layers, href: '/admin/landing-management', roles: ['admin', 'manager'] },
      { title: 'Customer Target', icon: BarChart3, href: '/admin/customer-trends', roles: ['admin', 'manager'] },
      { title: 'Blogs', icon: FileText, href: '/admin/blogs', roles: ['admin', 'manager'] },
      { title: 'Return & Exchange', icon: RefreshCw, href: '/admin/returns', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Admin Manager', icon: User, href: '/admin/admin-manager', roles: ['admin'] },
      { title: 'Audit Logs', icon: Database, href: '/admin/audit-logs', roles: ['admin'] },
      { title: 'Settings', icon: Settings, href: '/admin/settings', roles: ['admin'] },
    ],
  },
];

/** Deep forest green sampled from the logo artwork, so the logo sits on a
 * matching surface and its baked-in background disappears. */
const BRAND_LOGO_BG = '#1f3a2b';

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to true for desktop
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Handle responsive sidebar state
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768; // md breakpoint
      const tablet = width >= 768 && width < 1024; // lg breakpoint

      // console.log('Resize detected:', { width, mobile, tablet });

      setIsMobile(mobile);
      setIsTablet(tablet);

      if (mobile) {
        // Mobile: sidebar closed by default, use drawer
        setSidebarOpen(false);
        setMobileMenuOpen(false);
      } else if (tablet) {
        // Tablet: sidebar open by default, can be collapsed
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      } else {
        // Desktop: sidebar open by default, can be collapsed
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const role = session?.user?.role || '';
  const visibleGroups = sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  const isItemActive = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader size="lg" label={null} />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen bg-muted flex overflow-hidden">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{
            width: sidebarOpen ? 272 : 84,
          }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="fixed left-0 top-0 h-screen border-r border-border/70 bg-card/95 backdrop-blur-sm z-40 md:sticky md:z-auto md:translate-x-0 flex flex-col flex-shrink-0 overflow-hidden"
        >
          {/* Desktop/Tablet Sidebar Content */}
          <div className="flex h-[88px] flex-shrink-0 items-center border-b border-border/70 px-3 min-w-0">
            <AnimatePresence mode="wait">
              {sidebarOpen ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full min-w-0"
                >
                  <Link href="/" className="group block w-full min-w-0">
                    <div
                      className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/10 transition-all duration-200 group-hover:shadow-md group-hover:ring-black/20"
                      style={{ backgroundColor: BRAND_LOGO_BG }}
                    >
                      <Image
                        src={settings?.logo1 || MuscariMartLogo?.src}
                        alt={settings?.siteName || 'Muscari Mart'}
                        width={280}
                        height={72}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                        priority
                      />
                    </div>
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center w-full"
                >
                  <Link href="/" className="group flex items-center justify-center">
                    <div
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl p-1.5 shadow-sm ring-1 ring-black/10 transition-all duration-200 group-hover:shadow-md group-hover:ring-black/20"
                      style={{ backgroundColor: BRAND_LOGO_BG }}
                    >
                      <Image
                        src={settings?.logo1 || MuscariMartLogo?.src}
                        alt={settings?.siteName || 'Muscari Mart'}
                        width={40}
                        height={40}
                        className="h-full w-full object-contain"
                        priority
                      />
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop/Tablet Navigation */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
            <TooltipProvider>
              {visibleGroups.map((group, groupIndex) => (
                <div key={group.label} className={cn(groupIndex > 0 && 'mt-5')}>
                  {sidebarOpen ? (
                    <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                      {group.label}
                    </p>
                  ) : (
                    groupIndex > 0 && <div className="mx-auto mb-3 h-px w-6 bg-border/70" />
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = isItemActive(item.href);
                      const navItem = (
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            'group relative flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                            !sidebarOpen && 'justify-center px-0',
                          )}
                        >
                          {isActive && sidebarOpen && (
                            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <item.icon
                            size={19}
                            className={cn(
                              'shrink-0 transition-colors duration-200',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground',
                              !sidebarOpen && 'mx-auto',
                            )}
                          />
                          <AnimatePresence>
                            {sidebarOpen && (
                              <motion.span
                                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                                animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
                                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                                transition={{ duration: 0.2 }}
                                className="font-navigation whitespace-nowrap overflow-hidden"
                              >
                                {item.title}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );

                      return (
                        <Link key={item.href} href={item.href}>
                          {!sidebarOpen ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                              <TooltipContent side="right" className="ml-2">
                                <p>{item.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            navItem
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TooltipProvider>
          </nav>

          {/* Desktop/Tablet User Info */}
          <div className="flex-shrink-0 border-t border-border/70 bg-gradient-to-t from-muted/30 to-transparent p-3">
            {!sidebarOpen ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-muted/70 p-2.5 transition-all duration-200 hover:border-primary/20 hover:bg-muted">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback>
                        {session?.user?.name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <div>
                    <p className="font-title font-medium">{session?.user?.name}</p>
                    <p className="text-xs font-caption text-subtle-foreground capitalize">{session?.user?.role}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center space-x-3 rounded-xl border border-border/70 bg-muted/70 p-2.5 transition-all duration-200 hover:border-primary/20 hover:bg-muted">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <motion.div
                  initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-title font-medium text-foreground truncate">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs font-caption text-subtle-foreground capitalize truncate">
                    {session?.user?.role}
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </motion.aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <motion.aside
          initial={false}
          animate={{
            transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="fixed left-0 top-0 h-full w-[88vw] max-w-[360px] bg-card shadow-2xl z-[60] flex flex-col flex-shrink-0 overflow-y-auto"
        >
          {/* Mobile Sidebar Header */}
          <div className="flex h-[80px] items-center justify-between border-b border-border/70 px-4 min-w-0">
            <Link href="/" className="group block min-w-0 flex-1">
              <div
                className="flex h-12 w-40 items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: BRAND_LOGO_BG }}
              >
                <Image
                  src={settings?.logo1 || MuscariMartLogo?.src}
                  alt={settings?.siteName || 'Muscari Mart'}
                  width={220}
                  height={64}
                  className="h-full w-full object-cover object-center"
                  priority
                />
              </div>
            </Link>

            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-shrink-0 rounded-lg border border-border/60"
            >
              <X size={16} />
            </Button>
          </div>

                  {/* Mobile Navigation */}
          <nav className="px-3 py-4 flex-1 overflow-y-auto">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.label} className={cn(groupIndex > 0 && 'mt-5')}>
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full"
                      >
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            'group relative flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <item.icon
                            size={19}
                            className={cn(
                              'shrink-0 transition-colors duration-200',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground',
                            )}
                          />
                          <span className="ml-3 font-navigation whitespace-nowrap">
                            {item.title}
                          </span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile User Info */}
          <div className="border-t border-border/70 bg-gradient-to-t from-muted/30 to-transparent p-3">
            <div className="flex items-center space-x-3 rounded-xl border border-border/70 bg-muted/70 p-2.5">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>
                  {session?.user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-title font-medium text-foreground truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs font-caption text-subtle-foreground capitalize truncate">
                  {session?.user?.role}
                </p>
              </div>
            </div>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <div className={`
        flex-1 flex flex-col h-screen min-h-0 w-full min-w-0 overflow-hidden
        transition-all duration-300 ease-in-out
        ${!isMobile && !sidebarOpen ? 'ml-0' : ''}
      `}>
        {/* Top Navigation */}
        <header className="flex-shrink-0 bg-card border-b border-border px-3 sm:px-4 md:px-6 py-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // console.log('Mobile menu button clicked!');
                setMobileMenuOpen(true);
              }}
              className="md:hidden flex-shrink-0 z-10 relative"
            >
              <Menu size={20} className="text-foreground" />
            </Button>

            {/* Desktop/Tablet Sidebar Toggle */}
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden md:flex flex-shrink-0"
              >
                <Menu size={20} className="text-foreground" />
              </Button>
            )}

            <div className="relative flex-1 max-w-sm sm:max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" size={16} />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full text-sm font-paragraph"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus size={16} className="mr-2" />
                    Quick Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/products/new">
                      <Package size={16} className="mr-2" />
                      Add Product
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/categories">
                      <Tag size={16} className="mr-2" />
                      Add Category
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/coupons">
                      <FileText size={16} className="mr-2" />
                      Create Coupon
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/courier">
                      <Truck size={16} className="mr-2" />
                      Create Courier
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Notifications — live admin inbox */}
            <NotificationBell variant="admin" enabled={status === 'authenticated'} />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback>
                      {session?.user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="p-2 border-b">
                  <p className="font-title font-medium">{session?.user?.name}</p>
                  <p className="text-sm font-caption text-subtle-foreground">{session?.user?.email}</p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {session?.user?.role}
                  </Badge>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-6 w-full min-w-0">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
    </TooltipProvider>
  );
}
