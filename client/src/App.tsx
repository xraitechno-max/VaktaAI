import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { OverlayProvider } from "@/lib/useOverlay";
import { UnityAvatarProvider } from "@/contexts/UnityAvatarContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Pages
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Chat from "@/pages/Chat";
import Tutor from "@/pages/Tutor";
import DocSathiSources from "@/pages/DocSathiSources";
import DocSathiSession from "@/pages/DocSathiSession";
import Quiz from "@/pages/Quiz";
import QuizAttempt from "@/pages/QuizAttempt";
import StudyPlan from "@/pages/StudyPlan";
import Notes from "@/pages/Notes";
import NoteDetail from "@/pages/NoteDetail";
import Settings from "@/pages/Settings";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminTutorConfig from "@/pages/AdminTutorConfig";
import AdminUnityBuild from "@/pages/AdminUnityBuild";
import AdminVoiceSettings from "@/pages/AdminVoiceSettings";
import AdminAPIManagement from "@/pages/AdminAPIManagement";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Check if onboarding is needed (no subjects selected)
  const needsOnboarding = !user?.subjects || user.subjects.length === 0;

  // Onboarding flow
  if (needsOnboarding) {
    return (
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route component={Onboarding} />
      </Switch>
    );
  }

  // Authenticated users get the full app with layout + Unity Avatar preload
  return (
    <UnityAvatarProvider>
      <AppLayout>
        <Switch>
          <Route path="/" component={Tutor} />
          <Route path="/chat" component={Chat} />
          <Route path="/tutor" component={Tutor} />
          <Route path="/docsathi/:chatId" component={DocSathiSession} />
          <Route path="/docsathi" component={DocSathiSources} />
          {/* Legacy route redirects */}
          <Route path="/docchat/:chatId">{() => { window.location.href = window.location.href.replace('/docchat/', '/docsathi/'); return null; }}</Route>
          <Route path="/docchat">{() => { window.location.href = '/docsathi'; return null; }}</Route>
          <Route path="/quiz/:id" component={QuizAttempt} />
          <Route path="/quiz" component={Quiz} />
          <Route path="/study-plan" component={StudyPlan} />
          <Route path="/notes/:id" component={NoteDetail} />
          <Route path="/notes" component={Notes} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/tutor" component={AdminTutorConfig} />
          <Route path="/admin/unity" component={AdminUnityBuild} />
          <Route path="/admin/voice" component={AdminVoiceSettings} />
          <Route path="/admin/api" component={AdminAPIManagement} />
          <Route path="/admin/audit" component={AdminAuditLogs} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </UnityAvatarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <OverlayProvider>
          <Router />
          <Toaster />
        </OverlayProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
