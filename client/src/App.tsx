import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import type { ManagementView } from "./pages/ManagementPage";
import NotFound from "./pages/NotFound";

const ManagementPage = lazy(() => import("./pages/ManagementPage"));
const PastoralWorkCenter = lazy(() => import("./pages/PastoralWorkCenter"));
const PeopleDirectory = lazy(() => import("./pages/PeopleDirectory"));
const EventRegistrationCenter = lazy(() => import("./pages/EventRegistrationCenter"));
const RolloutReadiness = lazy(() => import("./pages/RolloutReadiness"));
const DataImportTemplates = lazy(() => import("./pages/DataImportTemplates"));
const GroupSecurityReview = lazy(() => import("./pages/GroupSecurityReview"));

function RouteLoader() {
  return <div className="grid min-h-[55vh] place-items-center text-sm text-[#718077]">正在載入管理工作區…</div>;
}

function Screen({ view }: { view: ManagementView }) {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><ManagementPage view={view} /></Suspense></DashboardLayout>;
}

function PastoralScreen() {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><PastoralWorkCenter /></Suspense></DashboardLayout>;
}

function PeopleScreen() {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><PeopleDirectory /></Suspense></DashboardLayout>;
}

function EventRegistrationScreen() {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><EventRegistrationCenter /></Suspense></DashboardLayout>;
}

function RolloutReadinessScreen() {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><RolloutReadiness /></Suspense></DashboardLayout>;
}

function DataImportTemplatesScreen() {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><DataImportTemplates /></Suspense></DashboardLayout>;
}

function GroupSecurityReviewScreen() {
  return <DashboardLayout><Suspense fallback={<RouteLoader />}><GroupSecurityReview /></Suspense></DashboardLayout>;
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
    <Route path="/group-security"><GroupSecurityReviewScreen /></Route>
    <Route><NotFound /></Route>
  </Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
