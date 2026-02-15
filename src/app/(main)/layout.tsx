import Header from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import WelcomeModal from "@/components/onboarding/WelcomeModal";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import MainLayoutClient from "./MainLayoutClient";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MainLayoutClient>
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-5 animate-fade-in">
          <ToastProvider><WelcomeModal />{children}</ToastProvider>
        </main>
        <Footer />
        <BottomNav />
      </MainLayoutClient>
    </ThemeProvider>
  );
}
