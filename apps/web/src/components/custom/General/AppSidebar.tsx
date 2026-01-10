"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { BoardsSidebar } from "../Boards/BoardsSidebar";
import { usePathname } from "next/navigation";

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const isBoardsPage = pathname?.startsWith("/playground/all");

  // Use BoardsSidebar for boards page, default sidebar for others
  if (isBoardsPage) {
    return (
      <div className="relative">
        <BoardsSidebar />
      </div>
    );
  }

  return (
    <div className="relative">
      <Sidebar className={cn(className)}>
        <SidebarTrigger className="cursor-pointer absolute top-0 right-0" />

        <SidebarHeader />
        <SidebarContent>
          <ThemeToggle />
          <SidebarGroup />
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </div>
  );
}
