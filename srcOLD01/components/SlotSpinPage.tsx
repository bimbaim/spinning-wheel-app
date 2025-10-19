"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { demoAPI } from "../utils/demo-data";
import bgImage from "figma:asset/6ecaf3f4fab22c019dd59c960e42721b5304c182.png";

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
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [slotPos, setSlotPos] = useState(0);

  const animationRef = useRef<number | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const finalSlotPositionRef = useRef<number>(0);

  // 🔊 Audio Refs
  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  // 📏 Slot size untuk 1 baris
  const itemHeight = 96; // h-24
  const containerHeight = 96; // satu baris saja!

  // 🎵 Init sounds
  useEffect(() => {
    spinSound.current = new Audio("/sounds/spin.mp3");
    winSound.current = new Audio("/sounds/win.mp3");
    spinSound.current.volume = 0.4;
    winSound.current.volume = 0.7;
  }, []);

  // 🔁 Fetch data
  useEffect(() => {
    fetchParticipants();
    return () => {
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const fetchParticipants = async () => {
    try {
      if (isDemoMode) {
        const data = demoAPI.getParticipants();
        setParticipants(data.filter((p: Participant) => !p.drawn));
      } else {
        const res = await fetch(`${apiUrl}/participants`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const data = await res.json();
        setParticipants(
          (data.participants || []).filter((p: Participant) => !p.drawn)
        );
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  // Normalize pos agar tidak drift
  const normalizeSlotPos = (pos: number, totalItems: number) => {
    if (totalItems === 0) return 0;
    return pos % totalItems;
  };

  const handleSpin = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (participants.length === 0 || isSpinning) return;

    setShowResult(false);
    setSelectedParticipant(null);

    const totalItems = participants.length;
    const normalizedStart = normalizeSlotPos(slotPos, totalItems);
    const randomIndex = Math.floor(Math.random() * totalItems);
    selectedIndexRef.current = randomIndex;
    const selected = participants[randomIndex];

    let startTime: number | null = null;
    const duration = 4000;
    const baseRotations = 6;
    const finalSlotPosition =
      normalizedStart + baseRotations * totalItems + randomIndex;
    finalSlotPositionRef.current = finalSlotPosition;

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
        setIsSpinning(true);
        spinSound.current?.play().catch(() => {});
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentPos =
        normalizedStart + easeOut * (finalSlotPosition - normalizedStart);
      setSlotPos(currentPos);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSlotPos(finalSlotPosition);
        setIsSpinning(false);
        setSelectedParticipant(selected);
        animationRef.current = null;

        spinSound.current?.pause();
        winSound.current?.play().catch(() => {});
        setTimeout(() => setShowResult(true), 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleReset = () => {
    setSlotPos(0);
    setShowResult(false);
    setSelectedParticipant(null);

    if (selectedParticipant) {
      setParticipants((prev) =>
        prev.filter((p) => p.id !== selectedParticipant.id)
      );
    }
  };

  // 🔄 Slot transform
  const totalRepeatedItems = participants.length > 0 ? participants.length * 3 : 1;
  const finalOffset = (slotPos % totalRepeatedItems) * itemHeight;
  const slotTransformStyle = {
    transform: `translateY(calc(-${finalOffset}px + ${
      containerHeight / 2
    }px - ${itemHeight / 2}px))`,
    transition: isSpinning ? "none" : "transform 0.3s ease-out",
  };

  // ===============================
  // 🎨 UI
  // ===============================
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/40"></div>

      {/* HEADER */}
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
          <h1 className="text-white text-3xl drop-shadow-lg">
            Participant Slot Spin
          </h1>
          <p className="text-white/80 text-sm mt-1">
            Random Participant Selection
          </p>
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

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-[calc(100vh-120px)] p-8 mt-28">
        
        {/* SLOT BOX - Dengan wrapper transparan */}
        <div className="mb-12 bg-black/10 backdrop-blur-sm rounded-[4rem] p-4"> 
          <div className="bg-gradient-to-b from-yellow-600 via-yellow-500 to-yellow-600 rounded-3xl p-12 shadow-2xl border-8 border-yellow-700">
            <div className="bg-slate-900 rounded-2xl p-8 shadow-inner">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-96 h-24 bg-white rounded-xl overflow-hidden shadow-xl border-4 border-slate-800">
                  <div className="absolute inset-0 flex flex-col">
                    <div className="absolute w-full" style={slotTransformStyle}>
                      {participants.length > 0 ? (
                        participants
                          .concat(participants)
                          .concat(participants)
                          .map((p, idx) => (
                            <div
                              key={`${p.id}-${idx}`}
                              // WARNA SLOT DIUBAH MENJADI TRANSPARAN
                              className="h-24 flex items-center justify-center px-6 border-b border-slate-200 bg-white/30 backdrop-blur-sm"
                            >
                              <span className="text-3xl font-bold truncate max-w-full text-center text-black">
                                {p.name}
                              </span>
                            </div>
                          ))
                      ) : (
                        <div className="h-24 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                          <span className="text-3xl font-bold text-slate-400">
                            No participants
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Marker tengah */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 border-y-4 border-red-500 pointer-events-none"></div>
                </div>
              </div>

              <div className="text-center text-yellow-400 mb-2">
                {participants.length} participant
                {participants.length !== 1 ? "s" : ""} remaining
              </div>
              {selectedParticipant && showResult && (
                <div className="text-center text-green-400 text-sm">
                  ✓ <b>{selectedParticipant.name}</b> ready for next spin
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BUTTONS */}
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

        {/* RESULT OVERLAY - DIBUAT LEBIH TRANSPARAN */}
        {showResult && selectedParticipant && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="relative">
              {/* <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl blur-2xl opacity-60 animate-pulse"></div> */}
              <div className="relative bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-lg rounded-3xl border-4 border-yellow-500/80 px-20 py-12 shadow-2xl">
                <div className="text-center">
                  <p className="text-yellow-300 mb-4 tracking-wider uppercase text-xl">
                    🎉 Selected Participant 🎉
                  </p>
                  <h1 className="text-white mb-2 animate-pulse text-6xl font-bold drop-shadow-lg">
                    {selectedParticipant.name}
                  </h1>
                  {/* <p className="text-yellow-200 text-lg mt-4">
                    {selectedParticipant.chances} spin
                    {selectedParticipant.chances > 1 ? "s" : ""} available
                  </p> */}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}