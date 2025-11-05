import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LoginPage from "@/pages/LoginPage";
import InstitutionDashboard from "@/pages/InstitutionDashboard";
import EvaluatorDashboard from "@/pages/EvaluatorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ApplicationDetailPage from "@/pages/ApplicationDetailPage";
import MessagesPage from "@/pages/MessagesPage";
import SettingsPage from "@/pages/SettingsPage";
import EvaluationTrackerPage from "@/pages/EvaluationTrackerPage";
import NotFound from "@/pages/not-found";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

function Router() {
  const [location] = useLocation();
  const [userRole, setUserRole] = useState<"institution" | "evaluator" | "admin">("institution");
  const isLoginPage = location === "/" || location === "/login";

  const handleLogin = (role: string) => {
    setUserRole(role as "institution" | "evaluator" | "admin");
  };

  if (isLoginPage) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={userRole} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h2 className="text-lg font-medium">AICTE Setu</h2>
                <p className="text-xs text-muted-foreground">Digital Approval Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/dashboard" component={InstitutionDashboard} />
              <Route path="/applications" component={InstitutionDashboard} />
              <Route path="/evaluation-tracker" component={EvaluationTrackerPage} />
              <Route path="/application/:id" component={ApplicationDetailPage} />
              <Route path="/messages" component={MessagesPage} />
              <Route path="/settings" component={SettingsPage} />
              
              <Route path="/evaluator/dashboard" component={EvaluatorDashboard} />
              <Route path="/evaluator/applications" component={EvaluatorDashboard} />
              <Route path="/evaluator/tracker" component={EvaluationTrackerPage} />
              
              <Route path="/admin/dashboard" component={AdminDashboard} />
              <Route path="/admin/applications" component={InstitutionDashboard} />
              <Route path="/admin/tracker" component={EvaluationTrackerPage} />
              
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
