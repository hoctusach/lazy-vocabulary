import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import AppRouter from "@/lib/platform/AppRouter";
import { initNativeShell } from "@/lib/platform/nativeShell";
import { initBilling } from "@/services/billing/billingService";
import { Helmet } from "react-helmet";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dev from "./pages/Dev";
import VocabularyDetailPage from "./pages/vocabulary/VocabularyDetailPage";
import { useSessionTracker } from "./hooks/useSessionTracker";
import { useEffect } from "react";
import AuthGate from "./components/AuthGate";
import InstallPrompt from "./components/InstallPrompt";
import KokoroAutoDownload from "./components/KokoroAutoDownload";
import ProUpgradeSheet from "./components/pro/ProUpgradeSheet";
import { isProEnabled } from "./config/features";
import { useDailyUsageTracker } from "./hooks/useDailyUsageTracker";
import { clearLegacyCustomWordKeys } from "./lib/cleanup/clearLegacyCustomWordKeys";
import { clearLegacyStreakKeys } from "./lib/cleanup/clearLegacyStreakKeys";
import { autoBackfillOnReload } from "@/lib/sync/autoBackfillOnReload";
import { bootstrapLearnedFromServerByKey } from "@/lib/progress/srsSyncByUserKey";
import { trackPageView } from "@/services/analyticsService";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    void initNativeShell();
    if (isProEnabled()) void initBilling().catch(() => {});
  }, []);
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
            Lazy Vocabulary – Just 15 minutes a day with spaced repetition
          </title>
          <meta
            name="description"
            content="Just 15 minutes a day with spaced repetition to master English vocabulary."
          />
          <link rel="canonical" href="https://your-domain.com/" />
        </Helmet>
        <Toaster />
        <Sonner />
        <AppRouter>
          <AnalyticsRouteTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/vocabulary/:word" element={<VocabularyDetailPage />} />
            {process.env.NODE_ENV !== "production" && (
              <Route path="/dev" element={<Dev />} />
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppRouter>
        <AuthGate />
        <InstallPrompt />
        <KokoroAutoDownload />
        {isProEnabled() && <ProUpgradeSheet />}
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

