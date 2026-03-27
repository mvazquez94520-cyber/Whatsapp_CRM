import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import Contacts from "./pages/Contacts";
import FollowUps from "./pages/FollowUps";
import Templates from "./pages/Templates";
import Report from "./pages/Report";
import Connect from "./pages/Connect";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      )} />
      <Route path="/conversations" component={() => (
        <DashboardLayout>
          <Conversations />
        </DashboardLayout>
      )} />
      <Route path="/contacts" component={() => (
        <DashboardLayout>
          <Contacts />
        </DashboardLayout>
      )} />
      <Route path="/followups" component={() => (
        <DashboardLayout>
          <FollowUps />
        </DashboardLayout>
      )} />
      <Route path="/templates" component={() => (
        <DashboardLayout>
          <Templates />
        </DashboardLayout>
      )} />
      <Route path="/report" component={() => (
        <DashboardLayout>
          <Report />
        </DashboardLayout>
      )} />
      <Route path="/connect" component={() => (
        <DashboardLayout>
          <Connect />
        </DashboardLayout>
      )} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
