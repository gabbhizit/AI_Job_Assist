import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#f7f8fc" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {/* Mobile top bar + slide-in sidebar */}
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-12 md:pt-0">{children}</main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
