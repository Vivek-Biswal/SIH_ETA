import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileBottomNavigation } from '@/components/layout/MobileBottomNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-canvas-bg)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--color-canvas-bg)] pb-24 md:pb-6">
          {children}
        </main>
        <MobileBottomNavigation />
      </div>
    </div>
  );
}
