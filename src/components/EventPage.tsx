import { useState, useEffect } from 'react';
import { ArrowLeft, User, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { SpinningWheel } from './SpinningWheel';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { demoAPI } from '../utils/demo-data';

interface Participant {
  id: string;
  name: string;
  chances: number;
  drawn: boolean;
}

interface Prize {
  id: string;
  name: string;
  weight: number;
}

interface EventPageProps {
  isDemoMode: boolean;
  onBack: () => void;
  onViewResults: (participant: Participant, results: Prize[]) => void;
}

export function EventPage({ isDemoMode, onBack, onViewResults }: EventPageProps) {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [spinResults, setSpinResults] = useState<Prize[]>([]);
  const [currentSpin, setCurrentSpin] = useState(0);
  const [stage, setStage] = useState<'waiting' | 'ready' | 'spinning' | 'result'>('waiting');

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    try {
      if (isDemoMode) {
        setPrizes(demoAPI.getPrizes());
      } else {
        const res = await fetch(`${apiUrl}/prizes`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` }
        });
        const data = await res.json();
        setPrizes(data.prizes || []);
      }
    } catch (error) {
      console.error('Error fetching prizes:', error);
    }
  };

  const handleCallNextParticipant = async () => {
    try {
      if (isDemoMode) {
        const participant = demoAPI.getNextParticipant();
        if (participant) {
          setCurrentParticipant(participant);
          setSpinResults([]);
          setCurrentSpin(0);
          setStage('ready');
        } else {
          alert('Tidak ada peserta yang tersisa!');
        }
      } else {
        const res = await fetch(`${apiUrl}/event/next-participant`);
        const data = await res.json();
        
        if (data.participant) {
          setCurrentParticipant(data.participant);
          setSpinResults([]);
          setCurrentSpin(0);
          setStage('ready');
        } else {
          alert('Tidak ada peserta yang tersisa!');
        }
      }
    } catch (error) {
      console.error('Error calling next participant:', error);
    }
  };

  const handleSpin = async () => {
    if (!currentParticipant) return;

    setIsSpinning(true);
    setStage('spinning');

    try {
      let prize;
      if (isDemoMode) {
        prize = demoAPI.spinWheel();
        setSelectedPrize(prize);
      } else {
        const res = await fetch(`${apiUrl}/event/spin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: currentParticipant.id })
        });
        const data = await res.json();
        
        prize = data.prize;
        setSelectedPrize(prize);
      }
    } catch (error) {
      console.error('Error spinning:', error);
      setIsSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    if (!selectedPrize) return;

    // Tambahkan hadiah yang sudah dipilih (selectedPrize) ke hasil
    const newResults = [...spinResults, selectedPrize];
    setSpinResults(newResults);
    setCurrentSpin(currentSpin + 1);
    setIsSpinning(false);
    setStage('result');
    // PENTING: Jangan reset selectedPrize di sini, biarkan state-nya menahan hasil spin terakhir
    // Reset akan dilakukan saat handleContinueSpin dipanggil atau sesi selesai.

    if (currentSpin + 1 >= (currentParticipant?.chances || 1)) {
      // Semua spin selesai
      setTimeout(() => {
        if (currentParticipant) {
          if (isDemoMode) {
            demoAPI.completeSession(currentParticipant.id, newResults);
          }
          onViewResults(currentParticipant, newResults);
        }
      }, 2000);
    }
  };

  const handleContinueSpin = () => {
    setSelectedPrize(null); // Reset selectedPrize agar spin berikutnya bisa memilih yang baru
    setStage('ready');
  };

  const finalPrizeName = spinResults[spinResults.length - 1]?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 flex items-center justify-between border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Kembali ke Dashboard
        </Button>
        <div className="text-center">
          <h1 className="text-white">Event Spinning Wheel</h1>
          <p className="text-slate-400 text-sm">Mode Operasi - Layar Penuh</p>
        </div>
        <div className="w-40"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-8">
        {/* Current Participant Display */}
        {currentParticipant && (
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl border border-purple-500/50 px-12 py-6 shadow-2xl">
              <div className="flex items-center gap-4 justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-spin-slow">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-1 tracking-wider">PESERTA SAAT INI</p>
                  <h2 className="text-white mb-1">{currentParticipant.name}</h2>
                  <p className="text-purple-400">
                    {currentParticipant.chances}x Spin | Spin ke-{currentSpin + 1}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spinning Wheel */}
        <div className="mb-8">
          <SpinningWheel
            prizes={prizes}
            selectedPrize={selectedPrize}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
            size="large"
          />
        </div>

        {/* Result Display */}
        {stage === 'result' && finalPrizeName && (
          <div className="mb-8 relative animate-bounce">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur-2xl opacity-60"></div>
            <div className="relative bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl rounded-2xl border-2 border-yellow-500/50 px-16 py-10 shadow-2xl">
              <div className="text-center">
                <div className="mb-4 relative">
                  <Sparkles className="w-16 h-16 text-yellow-400 mx-auto animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-yellow-400/20 rounded-full animate-ping"></div>
                  </div>
                </div>
                <p className="text-yellow-300 mb-3 tracking-wider uppercase">🎉 Selamat! Anda Mendapat 🎉</p>
                <h1 className="text-white mb-2 animate-pulse">{finalPrizeName}</h1>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-4">
          {stage === 'waiting' && (
            <Button
              onClick={handleCallNextParticipant}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-2xl shadow-purple-500/50 px-12 py-6 text-xl transition-all duration-300 hover:scale-105"
            >
              <User className="w-6 h-6 mr-3" />
              PANGGIL PESERTA BERIKUTNYA
            </Button>
          )}

          {stage === 'ready' && (
            <Button
              onClick={handleSpin}
              disabled={isSpinning || prizes.length === 0}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-2xl shadow-green-500/50 px-12 py-6 text-xl transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="w-6 h-6 mr-3" />
              SPIN HADIAH ({currentSpin + 1}/{currentParticipant?.chances})
            </Button>
          )}

          {stage === 'result' && currentSpin < (currentParticipant?.chances || 1) && (
            <Button
              onClick={handleContinueSpin}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-2xl shadow-blue-500/50 px-12 py-6 text-xl transition-all duration-300 hover:scale-105"
            >
              LANJUT SPIN BERIKUTNYA
            </Button>
          )}
        </div>

        {/* Spin Progress */}
        {currentParticipant && spinResults.length > 0 && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700 p-6 min-w-96">
            <h3 className="text-white mb-4 text-center">Hasil Spin</h3>
            <div className="space-y-2">
              {spinResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-3"
                >
                  <span className="text-purple-400">Spin {idx + 1}:</span>
                  <span className="text-white">{result.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}