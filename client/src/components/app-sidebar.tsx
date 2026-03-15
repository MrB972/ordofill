import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  PenTool,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/formulaires", label: "Formulaires", icon: FileText },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/remplissage", label: "Nouveau Remplissage", icon: PenTool },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Sidebar data-testid="app-sidebar">
      <SidebarHeader className="p-4 sidebar-header-gradient">
        <Logo size={28} showText={true} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.href;
                const isHighlighted = item.href === "/remplissage";
                return (
                  <SidebarMenuItem key={item.href}>
                    {isHighlighted ? (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-${item.href.slice(1)}`}
                        className="bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 text-primary font-medium border border-primary/20"
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-${item.href.slice(1)}`}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/50">
        {user && (
          <div className="flex items-center gap-3" data-testid="sidebar-user">
            <Avatar className="size-8">
              <AvatarFallback className="avatar-gradient text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user.fullName}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
