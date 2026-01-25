"use client";

import { cn } from "@/lib/utils";
import { Settings, Sparkles, Info, BarChart3, LineChart, Cpu, CreditCard, Mail } from "lucide-react";

export type SettingsSection =
  | "general"
  | "melina"
  | "usage"
  | "analytics"
  | "melina-mcp"
  | "billing"
  | "about"
  | "contact";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      {
        id: "general",
        label: "General",
        icon: <Settings className="h-4 w-4" />,
      },
      {
        id: "melina",
        label: "Melina",
        icon: <Sparkles className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        id: "usage",
        label: "Usage",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: <LineChart className="h-4 w-4" />,
      },
      {
        id: "billing",
        label: "Billing",
        icon: <CreditCard className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        id: "melina-mcp",
        label: "Melina MCP",
        icon: <Cpu className="h-4 w-4" />,
      },
    ],
  },
  {
    items: [
      {
        id: "about",
        label: "About",
        icon: <Info className="h-4 w-4" />,
      },
      {
        id: "contact",
        label: "Contact",
        icon: <Mail className="h-4 w-4" />,
      },
    ],
  },
];

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-full lg:w-48 shrink-0">
      {navGroups.map((group, groupIndex) => (
        <div key={groupIndex} className={cn(groupIndex > 0 && "mt-4")}>
          {group.title && (
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20 border-l-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
