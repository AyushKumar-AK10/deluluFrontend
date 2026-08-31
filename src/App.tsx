import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { CreateScreen } from '@/screens/CreateScreen';
import { ResumeScreen } from '@/screens/ResumeScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { Logo } from '@/components/Logo';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { screen, loading } = useAuth();

  if (loading && screen === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-900">
        <div className="mb-6 animate-pulse-soft"><Logo size="lg" /></div>
        <Loader2 className="h-5 w-5 text-ink-400 animate-spin" />
      </div>
    );
  }

  switch (screen) {
    case 'login': return <LoginScreen />;
    case 'home': return <HomeScreen />;
    case 'create': return <CreateScreen />;
    case 'resume': return <ResumeScreen />;
    case 'chat': return <ChatScreen />;
    default: return <LoginScreen />;
  }
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
