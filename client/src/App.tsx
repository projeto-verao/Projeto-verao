import { Switch, Route } from "wouter";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import IATrainer from "@/pages/IATrainer";
import Nutrition from "@/pages/Nutrition";
import Goals from "@/pages/Goals";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/trainer" component={IATrainer} />
          <Route path="/nutrition" component={Nutrition} />
          <Route path="/goals" component={Goals} />
          <Route path="/history" component={History} />
          <Route path="/profile" component={Profile} />
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
