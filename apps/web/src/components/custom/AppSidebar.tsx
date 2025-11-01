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

export function AppSidebar({ className }: { className?: string }) {
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
