import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dev from "./pages/Dev";
import { useSessionTracker } from "./hooks/useSessionTracker";
import { useEffect } from "react";
import AuthGate from "./components/AuthGate";
import { useDailyUsageTracker } from "./hooks/useDailyUsageTracker";
import { clearLegacyCustomWordKeys } from "./lib/cleanup/clearLegacyCustomWordKeys";
import { clearLegacyStreakKeys } from "./lib/cleanup/clearLegacyStreakKeys";
import { autoBackfillOnReload } from "@/lib/sync/autoBackfillOnReload";
import { bootstrapLearnedFromServerByKey } from "@/lib/progress/srsSyncByUserKey";
import { trackPageView } from "@/services/analyticsService";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    clearLegacyCustomWordKeys();
    clearLegacyStreakKeys();
    void autoBackfillOnReload();
  }, []);
  useEffect(() => {
    void bootstrapLearnedFromServerByKey();
  }, []);
  useSessionTracker();
  useDailyUsageTracker();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Helmet>
          <title>
            Lazy Vocabulary – Master English Vocabulary with Passive Learning
          </title>
          <meta
            name="description"
            content="Learn English vocabulary easily. Passive learning with audio, examples, and categorized words. Improve fluency by skimming and listening."
          />
          <link rel="canonical" href="https://your-domain.com/" />
        </Helmet>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnalyticsRouteTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            {process.env.NODE_ENV !== "production" && (
              <Route path="/dev" element={<Dev />} />
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <AuthGate />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const AnalyticsRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path, typeof document !== "undefined" ? document.title : undefined);
  }, [location]);

  return null;
};

export default App;

