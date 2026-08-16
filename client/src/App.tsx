import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ManagementPage, { type ManagementView } from "./pages/ManagementPage";
import NotFound from "./pages/NotFound";
import PastoralWorkCenter from "./pages/PastoralWorkCenter";
import PeopleDirectory from "./pages/PeopleDirectory";
import EventRegistrationCenter from "./pages/EventRegistrationCenter";
import RolloutReadiness from "./pages/RolloutReadiness";
import DataImportTemplates from "./pages/DataImportTemplates";

function Screen({ view }: { view: ManagementView }) {
  return <DashboardLayout><ManagementPage view={view} /></DashboardLayout>;
}

function PastoralScreen() {
  return <DashboardLayout><PastoralWorkCenter /></DashboardLayout>;
}

function PeopleScreen() {
  return <DashboardLayout><PeopleDirectory /></DashboardLayout>;
}

function EventRegistrationScreen() {
  return <DashboardLayout><EventRegistrationCenter /></DashboardLayout>;
}

function RolloutReadinessScreen() {
  return <DashboardLayout><RolloutReadiness /></DashboardLayout>;
}

function DataImportTemplatesScreen() {
  return <DashboardLayout><DataImportTemplates /></DashboardLayout>;
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
    <Route path="/governance"><Screen view="governance" /></Route>
    <Route path="/pastoral-work"><PastoralScreen /></Route>
    <Route path="/people"><PeopleScreen /></Route>
    <Route path="/event-registration"><EventRegistrationScreen /></Route>
    <Route path="/rollout-readiness"><RolloutReadinessScreen /></Route>
    <Route path="/data-templates"><DataImportTemplatesScreen /></Route>
    <Route><NotFound /></Route>
  </Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
