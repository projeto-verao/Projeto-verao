import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

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
import NotFound from "@/pages/NotFound";
import Logout from "@/pages/Logout";

// Componente para Proteção de Rotas e Redirecionamento Inteligente
function AuthGuard({ children, requireOnboarding = true }: { children: React.ReactNode, requireOnboarding?: boolean }) {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated) {
      navigate("/login");
    } else if (requireOnboarding && !profile?.onboardingCompleted) {
      // Se está logado mas não terminou o cadastro, vai para onboarding
      navigate("/onboarding");
    } else if (!requireOnboarding && profile?.onboardingCompleted) {
      // Se já terminou o cadastro e tenta acessar onboarding/welcome, vai para dashboard
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, profile, navigate, requireOnboarding]);

  if (loading) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
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
