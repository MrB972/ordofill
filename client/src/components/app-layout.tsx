import { type ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { Moon, Sun } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { loadCalibrationFromSupabase } from "@/lib/calibration-store";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [location] = useLocation();
  const calibrationLoadedRef = useRef(false);

  // Load user's saved calibration from Supabase on first mount
  // This ensures the calibration is available for PDF generation on ALL pages,
  // not just when visiting the calibration page.
  useEffect(() => {
    if (user?.id && !calibrationLoadedRef.current) {
      calibrationLoadedRef.current = true;
      loadCalibrationFromSupabase(user.id).then((loaded) => {
        if (loaded) {
          console.log("[AppLayout] Calibration chargée depuis Supabase");
        }
      });
    }
  }, [user?.id]);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 border-b flex items-center gap-4 px-4 glass-strong"
            data-testid="app-header"
          >
            <SidebarTrigger data-testid="sidebar-toggle" />
            <div className="flex-1" />
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={toggleTheme}
                data-testid="theme-toggle"
              >
                {theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
              <Avatar className="size-8">
                <AvatarFallback className="avatar-gradient text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                {...pageTransition}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
