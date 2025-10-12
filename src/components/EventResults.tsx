import { useState } from 'react';
import { Trophy, ArrowRight, FileText } from 'lucide-react';
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

interface EventResultsProps {
  participant: Participant;
  results: Prize[];
  prizes: Prize[];
  isDemoMode: boolean;
  onContinue: () => void;
  onViewLogs: () => void;
}

export function EventResults({ participant, results, prizes, isDemoMode, onContinue, onViewLogs }: EventResultsProps) {
  const [saving, setSaving] = useState(false);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (isDemoMode) {
        demoAPI.completeSession(participant.id, results);
      } else {
        await fetch(`${apiUrl}/event/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: participant.id,
            results: results
          })
        });
      }

      onContinue();
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Wheel Display */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8">
                <h2 className="text-white text-center mb-6">Roda Hadiah</h2>
                <SpinningWheel
                  prizes={prizes}
                  isSpinning={false}
                  size="medium"
                />
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="flex flex-col justify-center">
              <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                  <h1 className="text-white mb-2">Hasil Undian</h1>
                  <p className="text-slate-400">untuk {participant.name}</p>
                </div>

                {/* Results List */}
                <div className="space-y-3 mb-8">
                  <h3 className="text-white mb-4">Hadiah yang Diperoleh:</h3>
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-xl border border-purple-500/30 px-6 py-4 transform transition-all hover:scale-105"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-400 text-sm">Spin {idx + 1}</p>
                          <p className="text-white">{result.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleContinue}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/30 py-6"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    {saving ? 'Menyimpan...' : 'Lanjutkan ke Peserta Berikutnya'}
                  </Button>

                  <Button
                    onClick={onViewLogs}
                    variant="outline"
                    className="w-full bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white py-6"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Lihat Log Event Lengkap
                  </Button>
                </div>
              </div>

              {/* Summary Card */}
              <div className="mt-6 bg-gradient-to-r from-green-500/10 to-teal-500/10 backdrop-blur-xl rounded-xl border border-green-500/30 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total Hadiah Diperoleh</p>
                    <p className="text-white">{results.length} Hadiah</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
