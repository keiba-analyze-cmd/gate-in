import Header from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import WelcomeModal from "@/components/onboarding/WelcomeModal";
import BottomNavWrapper from "@/components/layout/BottomNavWrapper";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import MainLayoutClient from "./MainLayoutClient";
import ScrollToTop from "@/components/ScrollToTop";
import PushNotificationPrompt from "@/components/push/PushNotificationPrompt";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <ThemeProvider>
      <MainLayoutClient>
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-5 animate-fade-in">
          <ToastProvider><ScrollToTop /><WelcomeModal />{children}</ToastProvider>
        </main>
        <Footer />
        <BottomNavWrapper />
        {user && <PushNotificationPrompt userId={user.id} />}
      </MainLayoutClient>
    </ThemeProvider>
  );
}
