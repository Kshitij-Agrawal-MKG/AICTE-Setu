import {
  FileText,
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  BarChart3,
  ClipboardCheck,
  CheckCircle2
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";

interface AppSidebarProps {
  userRole: "institution" | "evaluator" | "admin";
}

const menuItems = {
  institution: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Applications", url: "/applications", icon: FileText },
    { title: "Evaluation Tracker", url: "/evaluation-tracker", icon: CheckCircle2 },
    { title: "Messages", url: "/messages", icon: MessageSquare },
  ],
  evaluator: [
    { title: "Dashboard", url: "/evaluator/dashboard", icon: LayoutDashboard },
    { title: "Assigned Applications", url: "/evaluator/applications", icon: ClipboardCheck },
    { title: "Evaluation Tracker", url: "/evaluator/tracker", icon: CheckCircle2 },
    { title: "Messages", url: "/evaluator/messages", icon: MessageSquare },
  ],
  admin: [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "All Applications", url: "/admin/applications", icon: FileText },
    { title: "Evaluation Tracker", url: "/admin/tracker", icon: CheckCircle2 },
    { title: "User Management", url: "/admin/users", icon: Users },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    { title: "Messages", url: "/admin/messages", icon: MessageSquare },
  ],
};

export default function AppSidebar({ userRole }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const items = menuItems[userRole];

  return (
    <Sidebar data-testid="app-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider px-4 py-3">
            {userRole === "institution" && "Institution Portal"}
            {userRole === "evaluator" && "Evaluator Portal"}
            {userRole === "admin" && "Admin Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    onClick={() => {
                      console.log('Navigate to:', item.url);
                      setLocation(item.url);
                    }}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => console.log('Settings clicked')}
                  data-testid="nav-settings"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => console.log('Logout clicked')}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
