import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingComplete } from "@/hooks/useFirebaseAuth";
import { useEffect, useRef } from "react";
import { firestoreService, ReminderConfig } from "@/hooks/useFirebaseFirestore";
import { useRecurringReminders } from "@/hooks/useLocalNotifications";

import Home from "@/pages/Home";
import FirebaseLogin from "@/pages/FirebaseLogin";
import Welcome from "@/pages/Welcome";
import Onboarding from "@/pages/Onboarding";
import Processing from "@/pages/Processing";
import Dashboard from "@/pages/Dashboard";
import IATrainer from "@/pages/IATrainer";
import Nutrition from "@/pages/Nutrition";
import Goals from "@/pages/Goals";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Reminders from "@/pages/Reminders";
import NotFound from "@/pages/NotFound";
import Logout from "@/pages/Logout";

// ─── Componente para Proteção de Rotas e Redirecionamento Inteligente ─────────
function AuthGuard({ children, requireOnboarding = true }: { children: React.ReactNode, requireOnboarding?: boolean }) {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated) {
      navigate("/login");
    } else if (requireOnboarding && !isOnboardingComplete(profile)) {
      // Se está logado mas não terminou o cadastro, vai para onboarding
      navigate("/onboarding");
    } else if (!requireOnboarding && isOnboardingComplete(profile)) {
      // Se já terminou o cadastro e tenta acessar onboarding/welcome, vai para dashboard
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, profile, navigate, requireOnboarding]);

  if (loading) return null;
  return <>{children}</>;
}

// ─── Reagendamento Global de Lembretes ───────────────────────────────────────
// CORREÇÃO BUG 3: rescheduleOnAppOpen era chamado apenas na tela /reminders.
// Se o usuário abrisse Dashboard, Treinos, IA ou qualquer outra tela, os
// lembretes não eram reagendados após o Service Worker ser encerrado pelo Android.
//
// Este componente garante que o reagendamento ocorra sempre que o usuário
// estiver autenticado, independentemente de qual tela está aberta.
// Também registra o listener global de NOTIFICATION_DELIVERED, resolvendo
// o BUG 5 (apenas a tela Lembretes recebia o evento e reagendava).
function GlobalReminderScheduler() {
  const { user, isAuthenticated } = useAuth();
  const { scheduleNextReminder, rescheduleOnAppOpen } = useRecurringReminders();
  const hasScheduledRef = useRef(false);

  // Reagendar ao autenticar — uma vez por sessão, qualquer que seja a tela inicial
  useEffect(() => {
    if (!isAuthenticated || !user || hasScheduledRef.current) return;
    if (!('serviceWorker' in navigator)) return;

    hasScheduledRef.current = true;

    firestoreService.getReminderConfigs(user.uid)
      .then((reminders: ReminderConfig[]) => {
        const active = reminders.filter((r) => r.enabled);
        if (active.length === 0) return Promise.resolve(0);
        return rescheduleOnAppOpen(active);
      })
      .then((count) => {
        if (typeof count === 'number' && count > 0) {
          console.log(`[GlobalScheduler] ${count} lembrete(s) reagendado(s) ao abrir o app`);
        }
      })
      .catch((err) => {
        console.warn('[GlobalScheduler] Erro ao reagendar lembretes na abertura:', err);
        // Permite nova tentativa se houver erro (ex: SW ainda não pronto)
        hasScheduledRef.current = false;
      });
  }, [isAuthenticated, user, rescheduleOnAppOpen]);

  // Resetar guard ao fazer logout — permite reagendamento no próximo login
  useEffect(() => {
    if (!isAuthenticated) {
      hasScheduledRef.current = false;
    }
  }, [isAuthenticated]);

  // Listener global de NOTIFICATION_DELIVERED — reagenda após cada disparo.
  // CORREÇÃO BUG 5: antes, este listener existia apenas em Reminders.tsx,
  // então lembretes once_a_day só eram reagendados se o usuário estivesse
  // nessa tela quando a notificação disparasse.
  useEffect(() => {
    if (!isAuthenticated || !user || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'NOTIFICATION_DELIVERED') return;
      const reminderId: string | undefined = event.data.reminderId;
      if (!reminderId) return;

      // Buscar o lembrete no Firestore para garantir dados atualizados
      firestoreService.getReminderConfigs(user.uid)
        .then((reminders: ReminderConfig[]) => {
          const reminder = reminders.find((r) => r.id === reminderId);
          if (reminder && reminder.enabled) {
            console.log(`[GlobalScheduler] Reagendando "${reminder.title}" após disparo`);
            return scheduleNextReminder(reminder);
          }
        })
        .catch((err) => {
          console.warn('[GlobalScheduler] Erro ao reagendar após disparo:', err);
        });
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [isAuthenticated, user, scheduleNextReminder]);

  // Componente invisível — apenas lógica, sem elementos renderizados
  return null;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        {/* Reagendamento global: ativo independente da rota atual */}
        <GlobalReminderScheduler />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={FirebaseLogin} />
          <Route path="/logout" component={Logout} />
          
          {/* Rotas que exigem estar logado mas NÃO ter completado o onboarding ainda */}
          <Route path="/welcome">
            <AuthGuard requireOnboarding={false}><Welcome /></AuthGuard>
          </Route>
          <Route path="/onboarding">
            <AuthGuard requireOnboarding={false}><Onboarding /></AuthGuard>
          </Route>

          {/* Rotas que exigem estar logado E ter completatedo o onboarding */}
          <Route path="/dashboard">
            <AuthGuard><Dashboard /></AuthGuard>
          </Route>
          <Route path="/trainer">
            <AuthGuard><IATrainer /></AuthGuard>
          </Route>
          <Route path="/nutrition">
            <AuthGuard><Nutrition /></AuthGuard>
          </Route>
          <Route path="/goals">
            <AuthGuard><Goals /></AuthGuard>
          </Route>
          <Route path="/history">
            <AuthGuard><History /></AuthGuard>
          </Route>
          <Route path="/profile">
            <AuthGuard><Profile /></AuthGuard>
          </Route>
          <Route path="/reminders">
            <AuthGuard><Reminders /></AuthGuard>
          </Route>
          
          <Route path="/processing" component={Processing} />
          <Route component={NotFound} />
        </Switch>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "white",
              color: "#111",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "14px",
            },
          }}
        />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
