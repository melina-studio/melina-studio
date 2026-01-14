import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/custom/General/AppSidebar";

export default function AllPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<div className="w-64 bg-muted/20" />}>
        <AppSidebar />
      </Suspense>
      <main className="flex-1 w-full overflow-auto">{children}</main>
    </SidebarProvider>
  );
}
