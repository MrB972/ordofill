import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import OnboardingPage from "@/pages/onboarding";
import DashboardPage from "@/pages/dashboard";
import FormulairesPage from "@/pages/formulaires";
import PatientsPage from "@/pages/patients";
import RemplissagePage from "@/pages/remplissage";
import HistoriquePage from "@/pages/historique";
import ParametresPage from "@/pages/parametres";
import FicheLaboPage from "@/pages/fiche-labo";
import CalibrationPage from "@/pages/calibration";
import FormBuilderPage from "@/pages/form-builder";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (!user.onboardingCompleted) {
    return <Redirect to="/onboarding" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/formulaires">
        <ProtectedRoute component={FormulairesPage} />
      </Route>
      <Route path="/patients">
        <ProtectedRoute component={PatientsPage} />
      </Route>
      <Route path="/remplissage">
        <ProtectedRoute component={RemplissagePage} />
      </Route>
      <Route path="/historique">
        <ProtectedRoute component={HistoriquePage} />
      </Route>
      <Route path="/parametres">
        <ProtectedRoute component={ParametresPage} />
      </Route>
      <Route path="/fiche-labo">
        <ProtectedRoute component={FicheLaboPage} />
      </Route>
      <Route path="/calibration">
        <ProtectedRoute component={CalibrationPage} />
      </Route>
      <Route path="/form-builder">
        <ProtectedRoute component={FormBuilderPage} />
      </Route>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
