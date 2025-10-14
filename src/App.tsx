import { useState, useEffect } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { EventPage } from './components/EventPage';
import { EventResults } from './components/EventResults';
import { SlotSpinPage } from './components/SlotSpinPage';
import { supabase } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import './utils/setup-admin';

type AppView = 'login' | 'dashboard' | 'event' | 'results' | 'slot-spin';

interface Participant {
  id: string;
  name: string;
  chances: number;
  drawn: boolean;
}

interface Prize {
  id: string;
  name: string;
  weight: number; // Weight/probability (1-100)
  quantity: number; // Available quantity
}

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [accessToken, setAccessToken] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [spinResults, setSpinResults] = useState<Prize[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    // Check for demo mode in session storage
    const demoMode = sessionStorage.getItem('demo_mode');
    if (demoMode === 'true') {
      setIsDemoMode(true);
      setAccessToken('DEMO_MODE_TOKEN');
      setView('dashboard');
      return;
    }

    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setAccessToken(session.access_token);
      setIsDemoMode(false);
      setView('dashboard');
    }
  };

  const fetchPrizes = async () => {
    try {
      const res = await fetch(`${apiUrl}/prizes`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      setPrizes(data.prizes || []);
    } catch (error) {
      console.error('Error fetching prizes:', error);
    }
  };

  const handleLoginSuccess = (token: string, demoMode: boolean) => {
    setAccessToken(token);
    setIsDemoMode(demoMode);
    
    if (demoMode) {
      sessionStorage.setItem('demo_mode', 'true');
    } else {
      sessionStorage.removeItem('demo_mode');
    }
    
    setView('dashboard');
  };

  const handleLogout = async () => {
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem('demo_mode');
    setAccessToken('');
    setIsDemoMode(false);
    setView('login');
  };

  const handleViewEvent = async () => {
    await fetchPrizes();
    setView('event');
  };

  const handleViewResults = (participant: Participant, results: Prize[]) => {
    setCurrentParticipant(participant);
    setSpinResults(results);
    setView('results');
  };

  const handleContinueFromResults = () => {
    setCurrentParticipant(null);
    setSpinResults([]);
    setView('event');
  };

  const handleViewLogsFromResults = () => {
    setView('dashboard');
  };

  return (
    <div className="dark">
      {view === 'login' && <AdminLogin onLoginSuccess={handleLoginSuccess} />}
      
      {view === 'dashboard' && (
        <AdminDashboard
          accessToken={accessToken}
          isDemoMode={isDemoMode}
          onLogout={handleLogout}
          onViewEvent={handleViewEvent}
          onViewSlotSpin={() => setView('slot-spin')}
        />
      )}
      
      {view === 'event' && (
        <EventPage
          isDemoMode={isDemoMode}
          onBack={() => setView('dashboard')}
          onViewResults={handleViewResults}
        />
      )}
      
      {view === 'slot-spin' && (
        <SlotSpinPage
          isDemoMode={isDemoMode}
          onBack={() => setView('dashboard')}
        />
      )}
      
      {view === 'results' && currentParticipant && (
        <EventResults
          participant={currentParticipant}
          results={spinResults}
          prizes={prizes}
          isDemoMode={isDemoMode}
          onContinue={handleContinueFromResults}
          onViewLogs={handleViewLogsFromResults}
        />
      )}
    </div>
  );
}
