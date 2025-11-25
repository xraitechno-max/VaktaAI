import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  FileText,
  HelpCircle,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Shield,
  Sparkles,
  Zap,
  MessageSquare,
  Clock,
  Crown,
  Sun,
  Moon,
  X
} from "lucide-react";
import logoPath from "../../assets/logo.png";
import mentorAvatar from "@assets/generated_images/female_teacher_gradient_background.png";

interface AppLayoutProps {
  children: React.ReactNode;
}

const mainNavItems = [
  { 
    name: 'AI Mentor', 
    nameKey: 'nav.aiMentor',
    href: '/tutor', 
    icon: Brain, 
    image: mentorAvatar,
    gradient: 'from-orange-500 to-red-500',
    bgGlow: 'bg-orange-500/10',
    description: 'Personal tutor'
  },
  { 
    name: 'DocSathi', 
    nameKey: 'nav.docSathi',
    href: '/docsathi', 
    icon: FileText, 
    gradient: 'from-blue-500 to-cyan-500',
    bgGlow: 'bg-blue-500/10',
    description: 'Document chat'
  },
  { 
    name: 'Quiz', 
    nameKey: 'nav.quiz',
    href: '/quiz', 
    icon: HelpCircle, 
    gradient: 'from-purple-500 to-pink-500',
    bgGlow: 'bg-purple-500/10',
    description: 'Practice tests'
  },
  { 
    name: 'Study Plan', 
    nameKey: 'nav.studyPlan',
    href: '/study-plan', 
    icon: Calendar, 
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-500/10',
    description: 'Daily schedule'
  },
  { 
    name: 'Notes', 
    nameKey: 'nav.notes',
    href: '/notes', 
    icon: BookOpen, 
    gradient: 'from-green-500 to-emerald-500',
    bgGlow: 'bg-green-500/10',
    description: 'Smart notes'
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  // Close mobile menu on navigation
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Could not logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutMutation.mutate();
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  const isActive = (href: string) => {
    if (href === '/tutor') return location === '/' || location.startsWith('/tutor');
    return location.startsWith(href);
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U';

  // Sidebar content component (reused for desktop and mobile)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative p-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-sm" />
              <img 
                src={logoPath} 
                alt="Vakta AI" 
                className="relative w-10 h-10 object-contain flex-shrink-0"
              />
            </div>
            {(isMobile || !sidebarCollapsed) && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">VaktaAI</h1>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    Pro
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('sidebar.tagline') || 'Your Study Companion'}</p>
              </div>
            )}
          </div>
          {isMobile ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={closeMobileMenu}
              className="h-8 w-8 rounded-lg"
              data-testid="button-close-mobile-menu"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                const newState = !sidebarCollapsed;
                setSidebarCollapsed(newState);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('sidebarCollapsed', String(newState));
                }
              }}
              className="h-8 w-8 rounded-lg"
              data-testid="button-toggle-sidebar"
            >
              {sidebarCollapsed ? (
                <Menu className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {(isMobile || !sidebarCollapsed) && (
        <div className="relative px-3 py-3">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-xl p-3 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-foreground">{t('sidebar.quickStart') || 'Quick Start'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{t('sidebar.quickStartDesc') || 'Jump straight into learning'}</p>
            <Link href="/tutor?quick=true" onClick={isMobile ? closeMobileMenu : undefined}>
              <Button size="sm" className="w-full h-7 text-xs bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <MessageSquare className="w-3 h-3 mr-1.5" />
                {t('sidebar.startChat') || 'Start Chat'}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <nav className="relative flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {(isMobile || !sidebarCollapsed) && (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('sidebar.learning') || 'Learning'}</span>
          </div>
        )}
        
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link 
              key={item.name} 
              href={item.href}
              onClick={isMobile ? closeMobileMenu : undefined}
              data-testid={`nav-${item.href.replace('/', '')}`}
            >
              <div className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-primary/15 to-secondary/15 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}>
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-r-full" />
                )}
                
                {item.image ? (
                  <div className={`relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden ring-2 transition-all duration-200 ${
                    active ? 'ring-primary shadow-lg' : 'ring-muted-foreground/30'
                  }`}>
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    active 
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                      : `${item.bgGlow} group-hover:${item.bgGlow}`
                  }`}>
                    <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : ''}`} />
                  </div>
                )}
                
                {(isMobile || !sidebarCollapsed) && (
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{t(item.nameKey) || item.name}</span>
                    {active && (
                      <span className="text-[10px] text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                )}
                
                {(isMobile || !sidebarCollapsed) && active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {(isMobile || !sidebarCollapsed) && (
              <div className="flex items-center gap-2 px-3 py-2 mt-4">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Admin</span>
              </div>
            )}
            <Link href="/admin" onClick={isMobile ? closeMobileMenu : undefined} data-testid="nav-admin">
              <div className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.startsWith('/admin')
                  ? 'bg-gradient-to-r from-red-500/15 to-orange-500/15 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}>
                <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  location.startsWith('/admin')
                    ? 'bg-gradient-to-br from-red-500 to-orange-500 shadow-lg'
                    : 'bg-red-500/10'
                }`}>
                  <Shield className={`w-4 h-4 ${location.startsWith('/admin') ? 'text-white' : ''}`} />
                </div>
                {(isMobile || !sidebarCollapsed) && <span>Admin Panel</span>}
              </div>
            </Link>
          </>
        )}
      </nav>

      <div className="relative border-t border-border/50">
        {(isMobile || !sidebarCollapsed) && (
          <div className="px-3 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('sidebar.preferences') || 'Preferences'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleTheme}
                className="flex-1 h-8 justify-start gap-2 text-xs"
                data-testid="button-theme-toggle"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {isDark ? 'Light' : 'Dark'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                className="h-8 px-2 text-xs font-medium"
                data-testid="button-language-toggle"
              >
                {language === 'en' ? 'हिं' : 'EN'}
              </Button>
            </div>
            
            <Link href="/settings" onClick={isMobile ? closeMobileMenu : undefined}>
              <Button variant="ghost" size="sm" className="w-full h-8 justify-start gap-2 text-xs">
                <Settings className="w-3.5 h-3.5" />
                {t('nav.settings') || 'Settings'}
              </Button>
            </Link>
          </div>
        )}

        <div className="p-3">
          <div className={`flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-accent/50 to-accent/30 border border-border/50 ${(isMobile || !sidebarCollapsed) ? '' : 'justify-center'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-sm opacity-50" />
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
            </div>
            {(isMobile || !sidebarCollapsed) && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <div className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] text-muted-foreground">Free Plan</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-8 w-8 rounded-lg"
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between p-3 gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMobileMenuOpen(true)}
            className="h-9 w-9 rounded-lg"
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <img 
              src={logoPath} 
              alt="Vakta AI" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="font-bold text-base bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">VaktaAI</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg"
              data-testid="button-mobile-theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          onClick={closeMobileMenu}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside 
            className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-card to-card/95 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-72'} bg-gradient-to-b from-card to-card/95 border-r border-border/50 flex-col transition-all duration-300 ease-in-out relative`}>
        <SidebarContent isMobile={false} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
