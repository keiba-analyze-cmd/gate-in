import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-5 animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
