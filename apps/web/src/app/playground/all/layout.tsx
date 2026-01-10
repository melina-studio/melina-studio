import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/custom/General/AppSidebar";

export default function AllPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 w-full overflow-auto">{children}</main>
    </SidebarProvider>
  );
}
