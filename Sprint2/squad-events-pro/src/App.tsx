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
import OrgSignUp from "./components/auth/OrgSignUp";
import EventDetails from "./pages/EventDetails";
import ApproveEvents from "./pages/admin/ApproveEvents";

// NEW: edit page route
import EditEvent from "./pages/EditEvent";
import MyTickets from "./pages/MyTickets";

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
                        {/* Support both /signup and /SignUp (case differences in existing links) */}
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/SignUp" element={<SignUp />} />
                        {/* Organization signup, also support legacy /OrgSignUp link */}
                        <Route path="/organization-signup" element={<OrgSignUp />} />
                        <Route path="/OrgSignUp" element={<OrgSignUp />} />

                        <Route path="/search" element={<SearchEvents />} />
                        <Route path="/my-events" element={<MyEvents />} />
                        <Route path="/my-tickets" element={<MyTickets />} />
                        <Route path="/create-event" element={<CreateEvent />} />

                        {/* NEW: editing pending events */}
                        <Route path="/events/:id/edit" element={<EditEvent />} />

                        <Route path="/friends" element={<Friends />} />
                        <Route path="/analytics" element={<Analytics />} />

                        {/* Admin */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/approve-companies" element={<ApproveCompanies />} />
                        <Route path="/approve-events" element={<ApproveEvents />} />
                        <Route path="/all-events" element={<AllEvents />} />
                        <Route path="/stats" element={<Stats />} />
                        <Route path="/events/:id" element={<EventDetails />} />

                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
