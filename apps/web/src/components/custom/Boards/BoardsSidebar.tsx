"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutGrid,
  Star,
  Clock,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
};

const navItems: NavItem[] = [
  {
    title: "Boards",
    icon: LayoutGrid,
    href: "/playground/all",
  },
  {
    title: "Starred",
    icon: Star,
    href: "/playground/all?filter=starred",
  },
  {
    title: "Recent",
    icon: Clock,
    href: "/playground/all?filter=recent",
  },
];

export function BoardsSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active item based on pathname and query params
  const getActiveHref = () => {
    if (typeof window !== "undefined" && pathname === "/playground/all") {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get("filter");
      if (filter === "starred") return "/playground/all?filter=starred";
      if (filter === "recent") return "/playground/all?filter=recent";
      return "/playground/all";
    }
    return pathname || "/playground/all";
  };

  const activeHref = getActiveHref();

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const handleNewBoard = () => {
    // Dispatch custom event to trigger board creation
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("createNewBoard"));
    }
  };

  const handleMelinaClick = () => {
    // Dispatch custom event to open Melina chat
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("openMelinaChat"));
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        {/* Workspace / Account Section */}
        <div className="px-2 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
                <span className="truncate">Aryan Shaw</span>
                <ChevronDown className="ml-auto size-4 opacity-50" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>
                <Settings className="size-4 mr-2" />
                Workspace settings
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <span className="size-4 mr-2" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut className="size-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase text-muted-foreground px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeHref === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavClick(item.href)}
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "w-full justify-start",
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Create Action */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleNewBoard}
                  variant="default"
                  tooltip="New board"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-4" />
                  <span>New board</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Melina */}
        <div className="px-2 py-2">
          <SidebarMenuButton
            onClick={handleMelinaClick}
            variant="default"
            tooltip="Melina"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-4" />
            <span>Melina</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
