import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ManagementPage, { type ManagementView } from "./pages/ManagementPage";
import NotFound from "./pages/NotFound";

function Screen({ view }: { view: ManagementView }) {
  return <DashboardLayout><ManagementPage view={view} /></DashboardLayout>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors /><Switch>
    <Route path="/"><Screen view="dashboard" /></Route>
    <Route path="/missionaries"><Screen view="missionaries" /></Route>
    <Route path="/prayers"><Screen view="prayers" /></Route>
    <Route path="/groups"><Screen view="groups" /></Route>
    <Route path="/activities"><Screen view="activities" /></Route>
    <Route path="/announcements"><Screen view="announcements" /></Route>
    <Route path="/permissions"><Screen view="permissions" /></Route>
    <Route><NotFound /></Route>
  </Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
