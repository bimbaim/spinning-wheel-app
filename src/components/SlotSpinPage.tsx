"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, RefreshCw, Trophy, User, Target, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { demoAPI } from "../utils/demo-data";
import bgImage from "figma:asset/6ecaf3f4fab22c019dd59c960e42721b5304c182.png";
import confetti from "canvas-confetti";


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
  quantity: number;
}

interface SpinResult {
  id: string;
  participant: Participant;
  prize: Prize;
  timestamp: string;
}

interface SpinEvent {
  id: string;
  count: number;
  results: SpinResult[];
  timestamp: string;
}

interface SlotSpinPageProps {
  isDemoMode: boolean;
  onBack: () => void;
  accessToken: string;
}

type SpinMode = "random" | "pre-selected";

interface RawLog {
  id: string;
  participantId: string;
  participantName: string;
  prizeId: string;
  prizeName: string;
  mode: SpinMode;
  timestamp: string; // The key for grouping
  // Add other fields needed for SpinResult if missing, like full prize object
}

const groupLogsIntoEvents = (logs: RawLog[]): SpinEvent[] => {
  if (!logs || logs.length === 0) return [];

  // Sort by timestamp descending (newest first)
  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const eventsMap: Map<string, SpinEvent> = new Map();
  let eventCounter = 0;
  let lastTimestamp = 0;

  // Grouping by a simple time difference (e.g., logs within 5 seconds belong to the same event)
  const TIME_THRESHOLD_MS = 5000;

  for (const log of sortedLogs) {
    const logTime = new Date(log.timestamp).getTime();
    let eventKey = `event_${eventCounter}`;

    // If the current log is significantly older than the last one, start a new event group
    if (lastTimestamp > 0 && (lastTimestamp - logTime) > TIME_THRESHOLD_MS) {
      eventCounter++;
      eventKey = `event_${eventCounter}`;
    }
    lastTimestamp = logTime;

    // Convert raw log to SpinResult structure (you'll need to reconstruct the full objects)
    const spinResult: SpinResult = {
      id: log.id,
      timestamp: log.timestamp,
      // ⚠️ NOTE: The participant and prize objects here are simplified and might need
      // additional data lookup if the logs don't store ALL details (like chances/weight).
      participant: { id: log.participantId, name: log.participantName, chances: 1, drawn: true },
      prize: { id: log.prizeId, name: log.prizeName, weight: 1, quantity: 1 } // Simplified placeholder
    };

    if (eventsMap.has(eventKey)) {
      const event = eventsMap.get(eventKey)!;
      event.results.unshift(spinResult); // Add to the front for correct sequence
      event.count++;
    } else {
      eventsMap.set(eventKey, {
        id: eventKey,
        count: 1,
        timestamp: log.timestamp,
        results: [spinResult],
      });
    }
  }

  // Convert the map values (SpinEvent objects) into an array
  return Array.from(eventsMap.values());
};

export function SlotSpinPage({ isDemoMode, onBack, accessToken }: SlotSpinPageProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [initialPrizes, setInitialPrizes] = useState<Prize[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [participantSlotPos, setParticipantSlotPos] = useState(0);
  const [prizeSlotPos, setPrizeSlotPos] = useState(0);
  const [spinCount, setSpinCount] = useState<"1" | "5" | "10">("1");
  const [currentSpinIndex, setCurrentSpinIndex] = useState(0);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);

  // New states for layout
  const [currentPart, setCurrentPart] = useState(1);
  const [slideDirection, setSlideDirection] = useState("left");
  const [spinEvents, setSpinEvents] = useState<SpinEvent[]>([]);
  const [activeEventTab, setActiveEventTab] = useState(0);
  const [roulettes, setRoulettes] = useState<any[]>([]);

  // Default to pre-selected mode
  const [spinMode, setSpinMode] = useState<SpinMode>("pre-selected");
  const [preSelectedPrizeId, setPreSelectedPrizeId] = useState<string>("");

  const animationRef = useRef<number | null>(null);
  const animationRefs = useRef<(number | null)[]>([]);
  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;
  const itemHeight = 96;
  const containerHeight = 96;

  const getMaxAllowedSpins = (): number => {
    if (spinMode !== "pre-selected" || !preSelectedPrizeId) {
      return 10;
    }

    const selectedPrize = prizes.find((p) => p.id === preSelectedPrizeId);
    if (!selectedPrize) return 1;

    return Math.min(selectedPrize.quantity, 10);
  };

  const getAvailableSpinOptions = (): Array<"1" | "5" | "10"> => {
    const maxAllowed = getMaxAllowedSpins();
    const allOptions: Array<"1" | "5" | "10"> = ["1", "5", "10"];

    return allOptions.filter((option) => {
      const count = parseInt(option);
      return count <= maxAllowed;
    });
  };

  useEffect(() => {
    spinSound.current = new Audio("/sounds/gun.mp3");
    winSound.current = new Audio("/sounds/win.mp3");
    spinSound.current.volume = 0.4;
    winSound.current.volume = 0.7;
  }, []);


  useEffect(() => {
    fetchData();
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const maxAllowed = getMaxAllowedSpins();
    const currentCount = parseInt(spinCount);

    if (currentCount > maxAllowed) {
      if (maxAllowed >= 10) setSpinCount("10");
      else if (maxAllowed >= 5) setSpinCount("5");
      else setSpinCount("1");
    }
  }, [preSelectedPrizeId, spinMode, prizes]);

  const fetchData = async () => {
    try {
      if (isDemoMode) {
        const participantsData = demoAPI.getParticipants();
        const prizesData = demoAPI.getPrizes();
        setParticipants(participantsData.filter((p: Participant) => !p.drawn));
        setPrizes(prizesData.filter((p: Prize) => p.quantity > 0));
        setInitialPrizes(prizesData.filter((p: Prize) => p.quantity > 0));
      } else {
        const [participantsRes, prizesRes, logsRes] = await Promise.all([
          fetch(`${apiUrl}/participants`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${apiUrl}/prizes`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${apiUrl}/slot-spin/logs`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);

        const participantsData = await participantsRes.json();
        const prizesData = await prizesRes.json();
        const logsData = await logsRes.json();

        const events = groupLogsIntoEvents(logsData.logs || []); // Use helper function
        setSpinEvents(events);

        setParticipants(
          (participantsData.participants || []).filter(
            (p: Participant) => !p.drawn
          )
        );
        setPrizes(
          (prizesData.prizes || []).filter((p: Prize) => p.quantity > 0)
        );
        setInitialPrizes(
          (prizesData.prizes || []).filter((p: Prize) => p.quantity > 0)
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const normalizeSlotPos = (pos: number, totalItems: number) => {
    if (totalItems === 0) return 0;
    return pos % totalItems;
  };

  const getPreSelectedPrize = (): Prize | null => {
    return prizes.find((p) => p.id === preSelectedPrizeId) || null;
  };

  const updatePrizeQuantity = async (prizeId: string, newQuantity: number) => {
    try {
      if (isDemoMode) {
        demoAPI.updatePrize(prizeId, { quantity: newQuantity });
      } else {
        await fetch(`${apiUrl}/prizes/${prizeId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quantity: newQuantity }),
        });
      }
    } catch (error) {
      console.error("Error updating prize quantity:", error);
    }
  };

  const markParticipantDrawn = async (participantId: string) => {
    try {
      if (isDemoMode) {
        demoAPI.updateParticipant(participantId, { drawn: true });
      } else {
        await fetch(`${apiUrl}/participants/${participantId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ drawn: true }),
        });
      }
    } catch (error) {
      console.error("Error marking participant as drawn:", error);
    }
  };

  const saveToHistory = async (participant: Participant, prize: Prize) => {
    try {
      const logEntry = {
        id: Date.now().toString() + Math.random(),
        participantId: participant.id,
        participantName: participant.name,
        prizeId: prize.id,
        prizeName: prize.name,
        mode: spinMode,
        timestamp: new Date().toISOString(),
      };

      if (isDemoMode) {
        demoAPI.saveSlotSpinLog(logEntry);
      } else {
        await fetch(`${apiUrl}/slot-spin/save`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logEntry),
        });
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPart === 1 && e.key === "Enter") {
        e.preventDefault();
        if (preSelectedPrizeId && spinCount && parseInt(spinCount) > 0) {
          goToPart2();
        } else {
          alert("Prize or spin count not set yet");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPart, preSelectedPrizeId, spinCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      // === PART 1: Tekan Enter untuk mulai ke Part 2 ===
      if (currentPart === 1) {
        if (preSelectedPrizeId && spinCount && parseInt(spinCount) > 0) {
          goToPart2();
        } else {
          console.warn("Prize or spin count not set yet");
        }
        return;
      }

      // === PART 2: Tekan Enter untuk spin / kembali ===
      if (currentPart === 2) {
        if (isSpinning) return; // ⛔ abaikan jika spin masih berjalan

        // Jika belum ada spin yang dilakukan -> mulai spin
        if (!roulettes.every(r => r.showResult)) {
          handleMultiSpin(); // ✅ pakai nama fungsi yang benar
          return;
        }

        // Kalau semua sudah tampil (spin selesai & showResult true)
        // Tekan Enter lagi -> kembali ke Part 1
        if (roulettes.every(r => r.showResult)) {
          goToPart1(); // 🔙 balik ke pengaturan
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPart, preSelectedPrizeId, spinCount, isSpinning, roulettes]);



  const goToPart2 = () => {
    if (!preSelectedPrizeId) {
      alert("Please select a prize first!");
      return;
    }

    if (!spinCount || parseInt(spinCount) <= 0) {
      alert("Please enter a valid spin count!");
      return;
    }

    setCurrentPart(2);

    const count = parseInt(spinCount);
    const initialRoulettes = [];
    for (let i = 0; i < count; i++) {
      initialRoulettes.push({
        id: `roulette-${i}`,
        participantSlotPos: 0,
        selectedParticipant: null,
        selectedPrize: null,
        showResult: false,
        snapshotParticipants: [...participants] as Participant[], // ✅ beri tipe
      });
    }
    setRoulettes(initialRoulettes);
  };


  const goToPart1 = () => {
    setCurrentPart(1);
    setRoulettes([]);
  };

  const [bulletHoles, setBulletHoles] = useState<
    { id: number; x: number; y: number; rotation: number; size: number }[]
  >([]);



  function triggerFlashingEffect() {
    const overlay = document.getElementById("flash-overlay");
    if (!overlay) return;

    const maxFlashes = 12; // number of flashes
    let flashes = 0;

    const flashInterval = setInterval(() => {
      // alternate between visible and transparent
      overlay.style.opacity = flashes % 2 === 0 ? "1" : "0";
      flashes++;

      if (flashes >= maxFlashes * 2) {
        clearInterval(flashInterval);
        overlay.style.opacity = "0";
      }
    }, 100); // flash speed (ms)
  }

  function addBulletHolesBurst(count = 3) {
    const newHoles = Array.from({ length: count }).map(() => ({
      id: Date.now() + Math.random(),
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      rotation: Math.random() * 360,
      size: 40 + Math.random() * 80, // 40–60px
    }));

    setBulletHoles((prev) => [...prev, ...newHoles]);

    // Optional fade-out after 2–3s
    setTimeout(() => {
      setBulletHoles((prev) =>
        prev.filter((hole) => !newHoles.some((h) => h.id === hole.id))
      );
    }, 2500);
  }


  const handleMultiSpin = async () => {
    if (participants.length === 0 || prizes.length === 0 || !preSelectedPrizeId) return;

    const count = parseInt(spinCount);
    const eventResults: SpinResult[] = [];

    setIsSpinning(true);
    spinSound.current?.play().catch(() => { });
    setTimeout(() => {
      triggerFlashingEffect();
    }, 50);
    // burst every few milliseconds while spinning
    const holeInterval = setInterval(() => {
      addBulletHolesBurst(10); // 2–3 new holes each tick
    }, 150);

    setTimeout(() => clearInterval(holeInterval), 1000); // stop after 1s or when spin ends

    const totalParticipants = participants.length;
    const duration = 4000;
    const baseRotations = 6;

    // 🔥 Gunakan array sementara agar tidak duplikat
    let availableParticipants = [...participants];

    const animations = roulettes.map((roulette: any, index: number) => {
      return new Promise<{ participant: Participant; prize: Prize } | null>((resolve) => {
        if (availableParticipants.length === 0) {
          resolve(null);
          return;
        }

        // Hitung total peluang
        const totalChance = availableParticipants.reduce((sum, p) => sum + (p.chances ?? 1), 0);
        let rand = Math.random() * totalChance;
        let selectedPart = availableParticipants[0];
        for (const p of availableParticipants) {
          rand -= p.chances ?? 1;
          if (rand <= 0) {
            selectedPart = p;
            break;
          }
        }

        // 🧹 Hapus dari pool agar tidak terpilih lagi
        availableParticipants = availableParticipants.filter(p => p.id !== selectedPart.id);

        const selectedPrz = prizes.find((p) => p.id === preSelectedPrizeId);
        if (!selectedPrz) {
          resolve(null);
          return;
        }

        const normalizedPartStart = normalizeSlotPos(0, totalParticipants);
        const finalPartPosition = normalizedPartStart + baseRotations * totalParticipants + participants.indexOf(selectedPart);

        let startTime: number | null = null;
        const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentPartPos = normalizedPartStart + easeOut * (finalPartPosition - normalizedPartStart);

          setRoulettes((prev) =>
            prev.map((r, i) =>
              i === index ? { ...r, participantSlotPos: currentPartPos } : r
            )
          );

          if (progress < 1) {
            animationRefs.current[index] = requestAnimationFrame(animate);
          } else {
            setRoulettes((prev) =>
              prev.map((r, i) =>
                i === index
                  ? {
                    ...r,
                    participantSlotPos: finalPartPosition,
                    selectedParticipant: selectedPart,
                    selectedPrize: selectedPrz,
                    showResult: true,
                  }
                  : r
              )
            );
            resolve({ participant: selectedPart, prize: selectedPrz });
          }
        };

        animationRefs.current[index] = requestAnimationFrame(animate);
      });
    });

    const results = await Promise.all(animations);

    spinSound.current?.pause();
    if (spinSound.current) spinSound.current.currentTime = 0;
    winSound.current?.play().catch(() => { });

    // 🎉 Confetti burst per pemenang
    results.forEach((result, index) => {
      if (result) {
        // Delay tiap spin biar berurutan
        setTimeout(() => {
          // Loop untuk membuat beberapa ledakan confetti sekaligus
          for (let i = 0; i < 3; i++) {
            confetti({
              particleCount: 80 + Math.random() * 60, // banyak partikel acak
              angle: 60 + Math.random() * 60, // sudut acak kiri-kanan
              spread: 60 + Math.random() * 20, // sebaran acak
              origin: { x: Math.random(), y: Math.random() * 0.6 + 0.2 }, // posisi acak di layar
              colors: ["#ff0", "#f0f", "#0ff", "#0f0", "#fff", "#f90", "#09f"],
              scalar: 0.8 + Math.random() * 1.2, // ukuran acak
              decay: 0.85,      // lebih cepat hilang
              ticks: 150,       // lebih sedikit frame → lebih cepat
              gravity: 0.8,     // jatuh lebih cepat
            });
          }
        }, index * 400); // delay tiap roulette
      }
    });



    results.forEach((result) => {
      if (result) {
        const newResult: SpinResult = {
          id: Date.now().toString() + Math.random(),
          participant: result.participant,
          prize: result.prize,
          timestamp: new Date().toISOString(),
        };
        eventResults.push(newResult);

        // updatePrizeQuantity(result.prize.id, result.prize.quantity - 1);

        const prizeSpinCounts: Record<string, number> = {};
        results.forEach(result => {
          if (result) {
            prizeSpinCounts[result.prize.id] = (prizeSpinCounts[result.prize.id] || 0) + 1;
          }
        });

        // Update quantity sekali per prize
        for (const prizeId in prizeSpinCounts) {
          const qtyToDeduct = prizeSpinCounts[prizeId];
          const prize = prizes.find(p => p.id === prizeId);
          if (prize) {
            updatePrizeQuantity(prizeId, prize.quantity - qtyToDeduct);
          }
        }

        markParticipantDrawn(result.participant.id);
        saveToHistory(result.participant, result.prize);

        setPrizes((prev) =>
          prev.map((p) =>
            p.id === result.prize.id ? { ...p, quantity: p.quantity - 1 } : p
          ).filter((p) => p.quantity > 0)
        );

        setParticipants((prev) =>
          prev.filter((p) => p.id !== result.participant.id)
        );
      }
    });

    const newEvent: SpinEvent = {
      id: Date.now().toString(),
      count: count,
      results: eventResults,
      timestamp: new Date().toISOString(),
    };

    setSpinEvents((prev) => [newEvent, ...prev]);
    setSpinHistory((prev) => [...eventResults, ...prev]);
    setActiveEventTab(0);
    setIsSpinning(false);

    // setTimeout(() => {
    //   goToPart1();
    // }, 2000);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (currentPart === 2 && !isSpinning && roulettes.length > 0) {
          handleMultiSpin();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentPart, isSpinning, participants, prizes, preSelectedPrizeId, spinCount, roulettes]);

  // const participantTotalRepeated = participants.length > 0 ? participants.length * 3 : 1;

  const getTransform = (slotPos: number, snapshotLength: number) => {
    const participantTotalRepeated = snapshotLength > 0 ? snapshotLength * 3 : 1;
    const participantOffset = (slotPos % participantTotalRepeated) * itemHeight;
    return {
      transform: `translateY(calc(-${participantOffset}px + ${containerHeight / 2}px - ${itemHeight / 2}px))`,
      transition: isSpinning ? "none" : "transform 0.3s ease-out",
    };
  };


  const preSelectedPrizeObj = prizes.find((p) => p.id === preSelectedPrizeId);


  return (

    <>

      <div
        className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay hitam transparan biar teks tetap terbaca */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Part 1 - Settings */}
        {currentPart === 1 && (
          <div className="absolute inset-0 z-20 animate-in fade-in slide-in-from-right duration-700">
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
                <h1 className="text-white text-3xl drop-shadow-lg">Slot Spin Settings</h1>
                <p className="text-white/80 text-sm mt-1">Configure your spin event</p>
              </div>

              {/* Placeholder untuk menjaga layout agar tetap seimbang */}
              <div className="w-[150px]" />
            </div>

            <div className="relative z-10 flex gap-6 p-8 h-[calc(100vh-120px)]">
              <div className="flex-[0.4] flex flex-col items-center justify-start">
                <div className="mb-6 bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 w-full max-w-4xl">
                  <p className="text-white text-center mb-4 text-lg">Select Prize</p>
                  <div className="flex items-center justify-center gap-3">
                    <Select value={preSelectedPrizeId} onValueChange={setPreSelectedPrizeId} disabled={isSpinning}>
                      <SelectTrigger className="w-96 bg-slate-800 text-white border-slate-600 px-4 py-3 rounded-lg">
                        <SelectValue placeholder="Choose a prize..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-white border-slate-600">
                        {prizes.map((prize) => (
                          <SelectItem key={prize.id} value={prize.id} className="hover:bg-slate-700">
                            {prize.name} (Qty: {prize.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {preSelectedPrizeId && (
                    <p className="text-center text-yellow-300 text-sm mt-3">
                      💡 Max spin count: {getMaxAllowedSpins()}x
                    </p>
                  )}
                </div>

                <div className="mb-8 bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <p className="text-white text-center mb-4 text-lg">Select Spin Count</p>
                  <ToggleGroup
                    type="single"
                    value={spinCount}
                    onValueChange={(value: "1" | "5" | "10" | undefined) => {
                      if (value) setSpinCount(value);
                    }}
                    className="gap-2"
                    disabled={isSpinning}
                  >
                    {["1", "5", "10"].map((option) => (
                      <ToggleGroupItem
                        key={option}
                        value={option as "1" | "5" | "10"}
                        disabled={!getAvailableSpinOptions().includes(option as "1" | "5" | "10")}
                        className="px-8 py-4 text-lg rounded-lg font-semibold transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white data-[state=on]:from-purple-500 data-[state=on]:to-blue-500 data-[state=on]:ring-2 data-[state=on]:ring-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {option}x Spin
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <Button
                  onClick={goToPart2}
                  disabled={!preSelectedPrizeId || isSpinning}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-2xl shadow-green-500/50 px-16 py-8 text-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Let's Spin! <ArrowRight className="w-8 h-8 ml-3" />
                </Button>
              </div>

              <div className="flex-[0.6] flex flex-col max-h-[calc(100vh-180px)] bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden w-full">
                <h2 className="text-white text-xl mb-4 flex items-center gap-2 w-full">
                  <Trophy className="w-5 h-5" />
                  <span className="truncate">Spin History</span>
                </h2>

                {spinEvents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 w-full">
                    {spinEvents.map((event, index) => (
                      <button
                        key={event.id}
                        onClick={() => setActiveEventTab(index)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${activeEventTab === index
                          ? "bg-purple-500 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                      >
                        Event {spinEvents.length - index} ({event.count}x)
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 w-full">
                  {spinEvents.length === 0 ? (
                    <p className="text-white/50 text-center py-8">No spins yet</p>
                  ) : (
                    spinEvents[activeEventTab]?.results.map((result) => (
                      <div
                        key={result.id}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors w-full"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-blue-400" />
                              <p className="text-white font-medium">{result.participant.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              <p className="text-yellow-300 text-sm">{result.prize.name}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-white/40 text-xs">
                          {new Date(result.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Part 2 - Spin Roulettes */}
{currentPart === 2 && (
  <div className="absolute inset-0 z-20 animate-in fade-in slide-in-from-left duration-700 flex flex-col">
    {/* 🔦 Flash overlay */}
    {isSpinning && (
      <div
        id="flash-overlay"
        className="fixed inset-0 z-[999] opacity-0 pointer-events-none transition-opacity duration-50"
        style={{
          backgroundColor: "rgba(240, 255, 255, 0.5)",
          mixBlendMode: "screen",
        }}
      ></div>
    )}

    {/* 💥 Bullet holes */}
    {bulletHoles.map((hole) => (
      <img
        key={hole.id}
        src="/effects/bullet-hole.png"
        alt="bullet hole"
        className="fixed z-[1000] pointer-events-none select-none"
        style={{
          top: hole.y - hole.size / 2,
          left: hole.x - hole.size / 2,
          width: `${hole.size}px`,
          height: `${hole.size}px`,
          opacity: 0.95,
          transform: `rotate(${hole.rotation}deg)`,
          transition: "opacity 0.3s ease",
        }}
      />
    ))}

    {/* 🎛 Header */}
    <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
      <Button
        onClick={goToPart1}
        variant="ghost"
        className="text-white hover:text-white hover:bg-white/20 border border-white/30"
        disabled={isSpinning}
      >
        <ChevronLeft className="w-5 h-5 mr-2" />
        Back to Settings
      </Button>

      <div className="text-center flex-1">
        <h1 className="text-white text-2xl sm:text-3xl drop-shadow-lg">Spin Time!</h1>

        {/* 💻 Only show "Press Enter" hint on desktop */}
        <p className="text-white/80 text-sm mt-1 hidden lg:block">
          Press <kbd className="px-2 py-1 bg-white/20 rounded">Enter</kbd> to start
        </p>

        {preSelectedPrizeObj && (
          <div className="mt-2 inline-flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-yellow-500/50">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 font-medium">Prize: {preSelectedPrizeObj.name}</span>
            <span className="text-yellow-400 text-sm">(Qty: {preSelectedPrizeObj.quantity})</span>
          </div>
        )}
      </div>

      <div className="w-12 sm:w-40"></div>
    </div>

    {/* 🌀 Roulette grid */}
    <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-3 sm:p-8 overflow-hidden">
      <div
        className="
          grid gap-6 sm:gap-8 p-4 w-full max-w-[1600px]
          justify-items-center items-start
        "
        style={{
          gridTemplateColumns:
            roulettes.length <= 2
              ? "repeat(2, minmax(0, 1fr))"
              : roulettes.length <= 3
                ? "repeat(3, minmax(0, 1fr))"
                : roulettes.length <= 4
                  ? "repeat(2, minmax(0, 1fr))"
                  : roulettes.length <= 6
                    ? "repeat(3, minmax(0, 1fr))"
                    : "repeat(5, minmax(0, 1fr))",
          gridTemplateRows:
            roulettes.length > 4
              ? "repeat(auto-fit, minmax(0, 1fr))"
              : "repeat(1, 1fr)",
        }}
      >
        {roulettes.map((roulette: any, index: number) => (
          <div key={roulette.id} className="flex flex-col items-center w-full max-w-[280px] sm:max-w-none">
            <div className="bg-black/10 backdrop-blur-sm rounded-[2rem] p-3 w-full">
              <div className="bg-gradient-to-b from-blue-600 via-blue-500 to-blue-600 rounded-2xl p-4 sm:p-6 shadow-2xl border-4 border-blue-700">
                <div className="bg-slate-900 rounded-xl p-4 shadow-inner">
                  <div className="flex items-center justify-center mb-3 gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <h3 className="text-blue-400 text-center text-sm">#{index + 1}</h3>
                  </div>

                  <div className="relative w-52 sm:w-64 h-20 sm:h-24 bg-white rounded-xl overflow-hidden shadow-xl border-4 border-slate-800">
                    <div className="absolute inset-0 flex flex-col">
                      <div
                        className="absolute w-full"
                        style={getTransform(
                          roulette.participantSlotPos,
                          roulette.snapshotParticipants.length
                        )}
                      >
                        {roulette.snapshotParticipants.length > 0 ? (
                          roulette.snapshotParticipants
                            .concat(roulette.snapshotParticipants)
                            .concat(roulette.snapshotParticipants)
                            .map((p: Participant, idx: number) => (
                              <div
                                key={`${p.id}-${idx}`}
                                className="h-20 sm:h-24 flex items-center justify-center px-4 border-b border-slate-200 bg-white/30 backdrop-blur-sm"
                              >
                                <span className="text-lg sm:text-xl font-bold truncate max-w-full text-center text-black">
                                  {p.name}
                                </span>
                              </div>
                            ))
                        ) : (
                          <div className="h-20 sm:h-24 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                            <span className="text-lg sm:text-xl font-bold text-slate-400">
                              No participants
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 sm:h-24 border-y-4 border-blue-500 pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </div>

            {roulette.showResult && roulette.selectedParticipant && (
              <div className="mt-3 sm:mt-4 bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-lg rounded-xl border-2 border-green-500/80 px-3 py-2 sm:px-4 sm:py-3 animate-in fade-in zoom-in duration-500">
                <p className="text-green-300 text-xs text-center mb-1">🎉 Winner</p>
                <p className="text-white text-sm sm:text-base font-bold text-center">
                  {roulette.selectedParticipant.name}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 📱 Spin Button only for mobile & tablet */}
      <div className="mt-8 block lg:hidden">
        <Button
          onClick={() => {
            if (!isSpinning && roulettes.length > 0) handleMultiSpin();
          }}
          disabled={isSpinning}
          className={`px-10 py-4 rounded-2xl font-bold text-white text-lg shadow-xl transition-all duration-300 ${
            isSpinning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 active:scale-95"
          }`}
        >
          🎯 Spin
        </Button>
      </div>
    </div>
  </div>
)}


      </div>
    </>
  );
}