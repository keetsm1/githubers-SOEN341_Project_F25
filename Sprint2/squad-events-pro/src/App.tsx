import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SearchEvents from "./pages/SearchEvents";
import MyEvents from "./pages/MyEvents";
import CreateEvent from "./pages/CreateEvent";
import Friends from "./pages/Friends";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/admin/Dashboard";
import ApproveCompanies from "./pages/admin/ApproveCompanies";
import AllEvents from "./pages/admin/AllEvents";
import Stats from "./pages/admin/Stats";
import NotFound from "./pages/NotFound";
import SignUp from "./components/auth/SignUp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/search" element={<SearchEvents />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/approve-companies" element={<ApproveCompanies />} />
            <Route path="/all-events" element={<AllEvents />} />
            <Route path="/stats" element={<Stats />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
