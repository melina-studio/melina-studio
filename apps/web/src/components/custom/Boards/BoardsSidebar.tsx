"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Star,
  Clock,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  Sparkles,
  Receipt,
  Moon,
  Sun,
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
import { useTheme } from "next-themes";
import { useBoard } from "@/hooks/useBoard";

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

  const { theme, setTheme } = useTheme();
  const { createNewBoard, getActiveHref } = useBoard();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const settings = localStorage.getItem("settings");
    if (settings) {
      const settingsObj = JSON.parse(settings);
      settingsObj.theme = newTheme;
      localStorage.setItem("settings", JSON.stringify(settingsObj));
    }
  };

  const activeHref = getActiveHref();

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const handleNewBoard = async () => {
    const uuid = await createNewBoard();
    if (uuid) {
      router.push(`/playground/${uuid}`);
    }
  };

  const handleMelinaClick = () => {
    // TODO: Implement Melina chat panel opening
    console.log("Open Melina chat panel");
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        {/* Workspace / Account Section */}
        <div className="py-3">
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
                {/* <span className="size-4 mr-2" /> */}
                <Receipt className="size-4 mr-2" />
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
        <div className="space-y-1">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                variant="default"
                tooltip="Theme"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                suppressHydrationWarning
              >
                {mounted && theme === "dark" ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
                <span>Theme</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                <Sun className="size-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                <Moon className="size-4 mr-2" />
                Dark
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Melina */}
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
