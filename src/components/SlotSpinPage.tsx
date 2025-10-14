import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { demoAPI } from '../utils/demo-data';
import bgImage from 'figma:asset/6ecaf3f4fab22c019dd59c960e42721b5304c182.png';

interface Participant {
  id: string;
  name: string;
  chances: number;
  drawn: boolean;
}

interface SlotSpinPageProps {
  isDemoMode: boolean;
  onBack: () => void;
}

export function SlotSpinPage({ isDemoMode, onBack }: SlotSpinPageProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Slot position for animation (single slot)
  const [slotPos, setSlotPos] = useState(0);
  
  const animationRef = useRef<number>();
  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      if (isDemoMode) {
        const data = demoAPI.getParticipants();
        setParticipants(data.filter((p: Participant) => !p.drawn));
      } else {
        const res = await fetch(`${apiUrl}/participants`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` }
        });
        const data = await res.json();
        setParticipants((data.participants || []).filter((p: Participant) => !p.drawn));
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleSpin = () => {
    if (participants.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    setShowResult(false);
    setSelectedParticipant(null);
    
    // Select random participant
    const randomIndex = Math.floor(Math.random() * participants.length);
    const selected = participants[randomIndex];
    
    console.log('🎰 Selected participant:', selected.name, 'at index:', randomIndex);
    
    // Animate slot
    let startTime: number | null = null;
    const duration = 4000; // 4 seconds
    const spinsPerSecond = 8; // Speed of scrolling
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Calculate base rotations
      const totalRotations = 5; // Number of full cycles through all names
      const baseDistance = totalRotations * participants.length;
      
      if (progress < 0.95) {
        // Fast spinning phase
        const currentDistance = easeOut * (baseDistance + randomIndex);
        setSlotPos(currentDistance);
      } else {
        // Final slow down to exact position
        const slowProgress = (progress - 0.95) / 0.05;
        const slowEase = 1 - Math.pow(1 - slowProgress, 2);
        const finalDistance = baseDistance + randomIndex;
        setSlotPos(finalDistance + slowEase * 0.3);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - stop exactly at selected index
        setSlotPos(baseDistance + randomIndex);
        setIsSpinning(false);
        setSelectedParticipant(selected);
        
        // Remove selected participant from the list
        const updatedParticipants = participants.filter(p => p.id !== selected.id);
        setParticipants(updatedParticipants);
        
        // Show result after a short delay
        setTimeout(() => {
          setShowResult(true);
        }, 500);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleReset = () => {
    setShowResult(false);
    setSelectedParticipant(null);
    setSlotPos(0);
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Header */}
      <div className="relative z-10 p-6 flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-white hover:text-white hover:bg-white/20 border border-white/30"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>
        <div className="text-center">
          <h1 className="text-white text-3xl drop-shadow-lg">Participant Slot Spin</h1>
          <p className="text-white/80 text-sm mt-1">Random Participant Selection</p>
        </div>
        <Button
          onClick={fetchParticipants}
          variant="ghost"
          className="text-white hover:text-white hover:bg-white/20 border border-white/30"
          disabled={isSpinning}
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh List
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-8">
        
        {/* Slot Machine - Single Slot */}
        <div className="mb-12">
          <div className="bg-gradient-to-b from-yellow-600 via-yellow-500 to-yellow-600 rounded-3xl p-12 shadow-2xl border-8 border-yellow-700">
            <div className="bg-slate-900 rounded-2xl p-8 shadow-inner">
              {/* Single Slot Display */}
              <div className="flex flex-col items-center mb-6">
                {/* Single Slot */}
                <div className="relative w-96 h-80 bg-white rounded-xl overflow-hidden shadow-xl border-4 border-slate-800">
                  <div className="absolute inset-0 flex flex-col">
                    <div 
                      className="absolute w-full"
                      style={{
                        transform: `translateY(calc(50% - ${(slotPos % (participants.length * 3)) * (100 / 3)}%))`,
                        transition: isSpinning ? 'none' : 'transform 0.3s ease-out'
                      }}
                    >
                      {/* Repeat participants 3 times for seamless scrolling */}
                      {participants.concat(participants).concat(participants).map((p, idx) => (
                        <div
                          key={`slot-${idx}`}
                          className="h-24 flex items-center justify-center px-6 border-b-2 border-slate-200"
                        >
                          <span className="text-3xl font-bold text-slate-800 truncate max-w-full text-center">
                            {p.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Selection indicator - Red border in the middle */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 border-y-4 border-red-500 pointer-events-none"></div>
                  
                  {/* Top gradient overlay for fade effect */}
                  <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
                  {/* Bottom gradient overlay for fade effect */}
                  <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Info Text */}
              <div className="text-center text-yellow-400 mb-2">
                {participants.length} participant{participants.length !== 1 ? 's' : ''} remaining
              </div>
              {selectedParticipant && showResult && (
                <div className="text-center text-green-400 text-sm">
                  ✓ {selectedParticipant.name} has been removed from the list
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 mb-8">
          {!showResult && (
            <Button
              onClick={handleSpin}
              disabled={isSpinning || participants.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-2xl shadow-green-500/50 px-16 py-8 text-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-8 h-8 mr-3 animate-spin" />
                  SPINNING...
                </>
              ) : (
                <>
                  <Play className="w-8 h-8 mr-3" />
                  START SPIN
                </>
              )}
            </Button>
          )}
          
          {showResult && (
            <Button
              onClick={handleReset}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl shadow-blue-500/50 px-16 py-8 text-2xl transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className="w-8 h-8 mr-3" />
              SPIN AGAIN
            </Button>
          )}
        </div>

        {/* Result Display */}
        {showResult && selectedParticipant && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-yellow-500/30 to-orange-500/30 backdrop-blur-xl rounded-3xl border-4 border-yellow-500/80 px-20 py-12 shadow-2xl">
                <div className="text-center">
                  <p className="text-yellow-300 mb-4 tracking-wider uppercase text-xl">🎉 Selected Participant 🎉</p>
                  <h1 className="text-white mb-2 animate-pulse text-6xl font-bold drop-shadow-lg">
                    {selectedParticipant.name}
                  </h1>
                  <p className="text-yellow-200 text-lg mt-4">
                    {selectedParticipant.chances} spin{selectedParticipant.chances > 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {participants.length === 0 && !isSpinning && (
          <div className="text-center bg-slate-900/80 backdrop-blur-sm rounded-2xl px-12 py-8 border-2 border-slate-700">
            <p className="text-white text-xl">No participants available</p>
            <p className="text-slate-400 mt-2">Please add participants in the dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}
