"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, RefreshCw, Trophy, User, Shuffle, Target } from "lucide-react";
import { Button } from "./ui/button";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { demoAPI } from "../utils/demo-data";
import bgImage from "figma:asset/6ecaf3f4fab22c019dd59c960e42721b5304c182.png";

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

interface SlotSpinPageProps {
  isDemoMode: boolean;
  onBack: () => void;
}

type SpinMode = "random" | "pre-selected";

export function SlotSpinPage({ isDemoMode, onBack }: SlotSpinPageProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [initialPrizes, setInitialPrizes] = useState<Prize[]>([]); // 🆕 snapshot of initial prizes
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [participantSlotPos, setParticipantSlotPos] = useState(0);
  const [prizeSlotPos, setPrizeSlotPos] = useState(0);
  const [spinCount, setSpinCount] = useState<"1" | "5" | "10">("1");
  const [currentSpinIndex, setCurrentSpinIndex] = useState(0);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);

  // New state for mode selection
  const [spinMode, setSpinMode] = useState<SpinMode>("random");
  const [preSelectedPrizeId, setPreSelectedPrizeId] = useState<string>("");

  const animationRef = useRef<number | null>(null);
  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;
  const itemHeight = 96; // h-24
  const containerHeight = 96;

  // Calculate max allowed spins based on pre-selected prize quantity
  const getMaxAllowedSpins = (): number => {
    if (spinMode !== "pre-selected" || !preSelectedPrizeId) {
      return 10; // Default for random mode
    }

    const selectedPrize = prizes.find((p) => p.id === preSelectedPrizeId);
    if (!selectedPrize) return 1;

    // Rule: If quantity < 10, max = quantity. If quantity >= 10, max = 10
    return Math.min(selectedPrize.quantity, 10);
  };

  // Get available spin count options based on mode and prize
  const getAvailableSpinOptions = (): Array<"1" | "5" | "10"> => {
    const maxAllowed = getMaxAllowedSpins();
    const allOptions: Array<"1" | "5" | "10"> = ["1", "5", "10"];

    return allOptions.filter((option) => {
      const count = parseInt(option);
      return count <= maxAllowed;
    });
  };

  // 🎵 Init sounds
  useEffect(() => {
    spinSound.current = new Audio("/sounds/spin.mp3");
    winSound.current = new Audio("/sounds/win.mp3");
    spinSound.current.volume = 0.4;
    winSound.current.volume = 0.7;
  }, []);

  // 🔁 Fetch data
  useEffect(() => {
    fetchData();
    return () => {
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Auto-adjust spin count when prize changes or mode changes
  useEffect(() => {
    const maxAllowed = getMaxAllowedSpins();
    const currentCount = parseInt(spinCount);

    if (currentCount > maxAllowed) {
      // Reset to max allowed if current selection exceeds limit
      if (maxAllowed >= 10) setSpinCount("10");
      else if (maxAllowed >= 5) setSpinCount("5");
      else setSpinCount("1");
    }
  }, [preSelectedPrizeId, spinMode, prizes]);

  // ⌨️ Keyboard support - Enter to spin
  // useEffect(() => {
  //   const handleKeyPress = (e: KeyboardEvent) => {
  //     if (e.key === "Enter" && !isSpinning && !showResult) {
  //       if (participants.length > 0 && prizes.length > 0) {
  //         // Check if pre-selected mode requires a prize selection
  //         if (spinMode === "pre-selected" && !preSelectedPrizeId) {
  //           return; // Don't spin if no prize is selected in pre-selected mode
  //         }
  //         handleStartMultiSpin();
  //       }
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyPress);
  //   return () => window.removeEventListener("keydown", handleKeyPress);
  // }, [isSpinning, showResult, participants, prizes, spinCount, spinMode, preSelectedPrizeId]);

  const fetchData = async () => {
    try {
      if (isDemoMode) {
        const participantsData = demoAPI.getParticipants();
        const prizesData = demoAPI.getPrizes();
        setParticipants(participantsData.filter((p: Participant) => !p.drawn));
        setPrizes(prizesData.filter((p: Prize) => p.quantity > 0));
      } else {
        const [participantsRes, prizesRes] = await Promise.all([
          fetch(`${apiUrl}/participants`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          }),
          fetch(`${apiUrl}/prizes`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          }),
        ]);

        const participantsData = await participantsRes.json();
        const prizesData = await prizesRes.json();

        setParticipants(
          (participantsData.participants || []).filter(
            (p: Participant) => !p.drawn
          )
        );
        setPrizes(
          (prizesData.prizes || []).filter((p: Prize) => p.quantity > 0)
        );
        // 🆕 Store initial prizes snapshot
        setInitialPrizes(
          (prizesData.prizes || []).filter((p: Prize) => p.quantity > 0)
        );
      }

      // 🟢 FIX: Reset the visual slot positions
      handleReset();

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // 🆕 Identify grand prizes (lowest quantity at start)
  const getGrandPrizes = (): Prize[] => {
    if (initialPrizes.length === 0) return [];
    const minQty = Math.min(...initialPrizes.map((p) => p.quantity));
    return initialPrizes.filter((p) => p.quantity === minQty);
  };


  const normalizeSlotPos = (pos: number, totalItems: number) => {
    if (totalItems === 0) return 0;
    return pos % totalItems;
  };

  // Select prize based on weight
  const selectPrizeByWeight = (): Prize | null => {
    const availablePrizes = prizes.filter((p) => p.quantity > 0);
    if (availablePrizes.length === 0) return null;

    const totalWeight = availablePrizes.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prize of availablePrizes) {
      random -= prize.weight;
      if (random <= 0) {
        return prize;
      }
    }
    return availablePrizes[0];
  };

  /**
 * 🎯 Bias prize selection:
 * - Participants with higher "chance" are more likely to get rarer (low-quantity) prizes.
 * - Identify main prize once at start (lowest quantity).
 */
  const selectPrizeByBias = (participant: any): Prize | null => {
    if (prizes.length === 0) return null;

    // Identify grand prize(s) = smallest quantity before spin
    const minQty = Math.min(...prizes.map((p) => p.quantity));
    const grandPrizes = prizes.filter((p) => p.quantity === minQty);

    // Bias factor: higher participant chance = higher chance for grand prize
    const highChance = participant.chance ?? 1;
    const totalChance = participants.reduce((sum, p) => sum + (p.chances ?? 1), 0);
    const grandPrizeWeight = highChance / totalChance;

    const roll = Math.random();
    if (roll < grandPrizeWeight && grandPrizes.length > 0) {
      return grandPrizes[Math.floor(Math.random() * grandPrizes.length)];
    }

    // Otherwise select normal prize by remaining quantity weights
    const totalWeight = prizes.reduce((sum, p) => sum + p.quantity, 0);
    let r = Math.random() * totalWeight;
    for (const p of prizes) {
      r -= p.quantity;
      if (r <= 0) return p;
    }
    return prizes[0];
  };

  // Get pre-selected prize
  const getPreSelectedPrize = (): Prize | null => {
    return prizes.find((p) => p.id === preSelectedPrizeId) || null;
  };

  // Update prize quantity
  const updatePrizeQuantity = async (prizeId: string, newQuantity: number) => {
    try {
      if (isDemoMode) {
        demoAPI.updatePrize(prizeId, { quantity: newQuantity });
      } else {
        await fetch(`${apiUrl}/prizes/${prizeId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quantity: newQuantity }),
        });
      }
    } catch (error) {
      console.error("Error updating prize quantity:", error);
    }
  };

  // Mark participant as drawn
  const markParticipantDrawn = async (participantId: string) => {
    try {
      if (isDemoMode) {
        demoAPI.updateParticipant(participantId, { drawn: true });
      } else {
        await fetch(`${apiUrl}/participants/${participantId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ drawn: true }),
        });
      }
    } catch (error) {
      console.error("Error marking participant as drawn:", error);
    }
  };

  // Save to history log
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
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logEntry),
        });
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  // const handleSingleSpin = () => {
  //   return new Promise<void>((resolve) => {
  //     if (animationRef.current !== null) {
  //       cancelAnimationFrame(animationRef.current);
  //       animationRef.current = null;
  //     }
  //     if (participants.length === 0 || prizes.length === 0) {
  //       resolve();
  //       return;
  //     }

  //     setShowResult(false);
  //     setSelectedParticipant(null);
  //     setSelectedPrize(null);

  //     // Select random participant
  //     const randomParticipantIndex = Math.floor(
  //       Math.random() * participants.length
  //     );
  //     const selectedPart = participants[randomParticipantIndex];

  //     // Select prize based on mode
  //     let selectedPrz: Prize | null = null;
  //     if (spinMode === "pre-selected") {
  //       selectedPrz = getPreSelectedPrize();
  //     } else {
  //       selectedPrz = selectPrizeByWeight();
  //     }

  //     if (!selectedPrz) {
  //       resolve();
  //       return;
  //     }

  //     const totalParticipants = participants.length;
  //     const totalPrizes = prizes.length;

  //     const normalizedPartStart = normalizeSlotPos(
  //       participantSlotPos,
  //       totalParticipants
  //     );
  //     const normalizedPrizeStart = normalizeSlotPos(prizeSlotPos, totalPrizes);

  //     const prizeIndex = prizes.findIndex((p) => p.id === selectedPrz.id);

  //     let startTime: number | null = null;
  //     const duration = 4000;
  //     const baseRotations = 6;

  //     const finalPartPosition =
  //       normalizedPartStart +
  //       baseRotations * totalParticipants +
  //       randomParticipantIndex;
  //     const finalPrizePosition =
  //       normalizedPrizeStart + baseRotations * totalPrizes + prizeIndex;

  //     const animate = (timestamp: number) => {
  //       if (!startTime) {
  //         startTime = timestamp;
  //         setIsSpinning(true);
  //         spinSound.current?.play().catch(() => {});
  //       }

  //       const elapsed = timestamp - startTime;
  //       const progress = Math.min(elapsed / duration, 1);
  //       const easeOut = 1 - Math.pow(1 - progress, 3);

  //       const currentPartPos =
  //         normalizedPartStart +
  //         easeOut * (finalPartPosition - normalizedPartStart);

  //       setParticipantSlotPos(currentPartPos);

  //       // Only animate prize slot in random mode
  //       if (spinMode === "random") {
  //         const currentPrizePos =
  //           normalizedPrizeStart +
  //           easeOut * (finalPrizePosition - normalizedPrizeStart);
  //         setPrizeSlotPos(currentPrizePos);
  //       }

  //       if (progress < 1) {
  //         animationRef.current = requestAnimationFrame(animate);
  //       } else {
  //         setParticipantSlotPos(finalPartPosition);
  //         if (spinMode === "random") {
  //           setPrizeSlotPos(finalPrizePosition);
  //         }
  //         setIsSpinning(false);
  //         setSelectedParticipant(selectedPart);
  //         setSelectedPrize(selectedPrz);
  //         animationRef.current = null;

  //         spinSound.current?.pause();
  //         winSound.current?.play().catch(() => {});

  //         // Update data
  //         updatePrizeQuantity(selectedPrz.id, selectedPrz.quantity - 1);
  //         markParticipantDrawn(selectedPart.id);
  //         saveToHistory(selectedPart, selectedPrz);

  //         // Add to history
  //         const newResult: SpinResult = {
  //           id: Date.now().toString() + Math.random(),
  //           participant: selectedPart,
  //           prize: selectedPrz,
  //           timestamp: new Date().toISOString(),
  //         };
  //         setSpinHistory((prev) => [newResult, ...prev]);

  //         // Remove from active lists (DISABLED for now)
  //         // supaya nama peserta tetap muncul sebelum reset manual
  //         /*
  //         setParticipants((prev) =>
  //           prev.filter((p) => p.id !== selectedPart.id)
  //         );
  //         setPrizes((prev) => {
  //           const updated = prev.map((p) =>
  //             p.id === selectedPrz.id ? { ...p, quantity: p.quantity - 1 } : p
  //           );
  //           return updated.filter((p) => p.quantity > 0);
  //         });
  //         */

  //         // Tampilkan hasil spin
  //         setTimeout(() => {
  //           setShowResult(true);
  //           resolve();
  //         }, 500);
  //       }
  //     };

  //     animationRef.current = requestAnimationFrame(animate);
  //   });
  // };

  const handleSingleSpin = () => {
    return new Promise<void>((resolve) => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (participants.length === 0 || prizes.length === 0) {
        resolve();
        return;
      }

      setShowResult(false);
      setSelectedParticipant(null);
      setSelectedPrize(null);

      // 🎯 Select random participant (weighted by their chance value)
      const totalChance = participants.reduce((sum, p) => sum + (p.chances ?? 1), 0);
      let rand = Math.random() * totalChance;
      let selectedPart = participants[0];
      for (const p of participants) {
        rand -= p.chances ?? 1;
        if (rand <= 0) {
          selectedPart = p;
          break;
        }
      }

      // 🏆 Select prize based on participant chance
      let selectedPrz: Prize | null = null;
      if (spinMode === "pre-selected") {
        selectedPrz = getPreSelectedPrize();
      } else {
        selectedPrz = selectPrizeByBias(selectedPart);
      }

      if (!selectedPrz) {
        resolve();
        return;
      }

      const totalParticipants = participants.length;
      const totalPrizes = prizes.length;

      const normalizedPartStart = normalizeSlotPos(
        participantSlotPos,
        totalParticipants
      );
      const normalizedPrizeStart = normalizeSlotPos(prizeSlotPos, totalPrizes);

      const prizeIndex = prizes.findIndex((p) => p.id === selectedPrz.id);

      let startTime: number | null = null;
      const duration = 4000;
      const baseRotations = 6;

      const finalPartPosition =
        normalizedPartStart +
        baseRotations * totalParticipants +
        participants.indexOf(selectedPart);
      const finalPrizePosition =
        normalizedPrizeStart + baseRotations * totalPrizes + prizeIndex;

      const animate = (timestamp: number) => {
        if (!startTime) {
          startTime = timestamp;
          setIsSpinning(true);
          spinSound.current?.play().catch(() => { });
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentPartPos =
          normalizedPartStart +
          easeOut * (finalPartPosition - normalizedPartStart);

        setParticipantSlotPos(currentPartPos);

        if (spinMode === "random") {
          const currentPrizePos =
            normalizedPrizeStart +
            easeOut * (finalPrizePosition - normalizedPrizeStart);
          setPrizeSlotPos(currentPrizePos);
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setParticipantSlotPos(finalPartPosition);
          if (spinMode === "random") setPrizeSlotPos(finalPrizePosition);
          setIsSpinning(false);
          animationRef.current = null;

          spinSound.current?.pause();
          winSound.current?.play().catch(() => { });

          setSelectedParticipant(selectedPart);
          setSelectedPrize(selectedPrz);

          // Update data
          updatePrizeQuantity(selectedPrz.id, selectedPrz.quantity - 1);
          markParticipantDrawn(selectedPart.id);
          saveToHistory(selectedPart, selectedPrz);

          // Add to history
          const newResult: SpinResult = {
            id: Date.now().toString() + Math.random(),
            participant: selectedPart,
            prize: selectedPrz,
            timestamp: new Date().toISOString(),
          };
          setSpinHistory((prev) => [newResult, ...prev]);

          // 🟢 Keep participants visible — no reset yet
          setTimeout(() => {
            setShowResult(true);
            resolve();
          }, 500);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    });
  };

  const handleStartMultiSpin = async () => {
    const count = parseInt(spinCount);
    setCurrentSpinIndex(0);

    for (let i = 0; i < count; i++) {
      if (participants.length === 0 || prizes.length === 0) break;

      // Check if pre-selected prize still has quantity
      if (spinMode === "pre-selected") {
        const currentPrize = getPreSelectedPrize();
        if (!currentPrize || currentPrize.quantity <= 0) break;
      }

      setCurrentSpinIndex(i + 1);
      await handleSingleSpin();
      if (i < count - 1) {
        // Wait before next spin
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setShowResult(false);
      }
    }

    setCurrentSpinIndex(0);
  };

  const handleReset = () => {
    setParticipantSlotPos(0);
    setPrizeSlotPos(0);
    setShowResult(false);
    setSelectedParticipant(null);
    setSelectedPrize(null);

    // 🧹 Sekarang baru hapus participant & update prize saat reset dilakukan
    if (selectedParticipant && selectedPrize) {
      setParticipants((prev) =>
        prev.filter((p) => p.id !== selectedParticipant.id)
      );

      setPrizes((prev) => {
        const updated = prev.map((p) =>
          p.id === selectedPrize.id
            ? { ...p, quantity: p.quantity - 1 }
            : p
        );
        return updated.filter((p) => p.quantity > 0);
      });
    }
  };

// ⌨️ Keyboard support - Enter to spin / reset
  useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      // ENTER pressed while spinning — do nothing
      if (isSpinning) return;

      // If result is showing, pressing Enter triggers Spin Again
      if (showResult) {
        handleReset();
        return;
      }

      // If ready to spin
      if (participants.length > 0 && prizes.length > 0) {
        // Prevent spin if pre-selected mode without prize
        if (spinMode === "pre-selected" && !preSelectedPrizeId) {
          return;
        }
        handleStartMultiSpin();
      }
    }
  };

  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, [
  isSpinning,
  showResult,
  participants,
  prizes,
  spinMode,
  preSelectedPrizeId,
  handleStartMultiSpin,
  handleReset,
]);



  // Slot transforms
  const participantTotalRepeated =
    participants.length > 0 ? participants.length * 3 : 1;
  const prizeTotalRepeated = prizes.length > 0 ? prizes.length * 3 : 1;

  const participantOffset =
    (participantSlotPos % participantTotalRepeated) * itemHeight;
  const prizeOffset = (prizeSlotPos % prizeTotalRepeated) * itemHeight;

  const participantTransform = {
    transform: `translateY(calc(-${participantOffset}px + ${containerHeight / 2
      }px - ${itemHeight / 2}px))`,
    transition: isSpinning ? "none" : "transform 0.3s ease-out",
  };

  const prizeTransform = {
    transform: `translateY(calc(-${prizeOffset}px + ${containerHeight / 2}px - ${itemHeight / 2
      }px))`,
    transition: isSpinning ? "none" : "transform 0.3s ease-out",
  };

  // Get pre-selected prize object for display
  const preSelectedPrizeObj = prizes.find((p) => p.id === preSelectedPrizeId);

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
            Random Participant & Prize Selection
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="ghost"
          className="text-white hover:text-white hover:bg-white/20 border border-white/30"
          disabled={isSpinning}
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh List
        </Button>
      </div>

      <div className="relative z-10 flex gap-6 p-8 min-h-[calc(100vh-120px)]">
        {/* LEFT SIDE - SLOT MACHINES */}
        <div className="flex-1 flex flex-col items-center justify-start mt-4">
          {/* MODE SELECTOR */}
          <div className="mb-6 bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20 w-full max-w-4xl">
            <p className="text-white text-center mb-3">Spin Mode</p>
            <div className="flex gap-4 items-center justify-center">
              <Button
                onClick={() => {
                  setSpinMode("random");
                  setPreSelectedPrizeId("");
                }}
                disabled={isSpinning}
                className={`flex items-center gap-2 px-6 py-6 text-lg ${spinMode === "random"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 ring-2 ring-white"
                    : "bg-slate-700 hover:bg-slate-600"
                  }`}
              >
                <Shuffle className="w-5 h-5" />
                Random Draw (Participant + Prize)
              </Button>
              <Button
                onClick={() => setSpinMode("pre-selected")}
                disabled={isSpinning}
                className={`flex items-center gap-2 px-6 py-6 text-lg ${spinMode === "pre-selected"
                    ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 ring-2 ring-white"
                    : "bg-slate-700 hover:bg-slate-600"
                  }`}
              >
                <Target className="w-5 h-5" />
                Pre-selected Prize Mode
              </Button>
            </div>

            {/* Pre-selected prize selector */}
            {spinMode === "pre-selected" && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <label className="text-white">Select Prize:</label>
                  <Select value={preSelectedPrizeId} onValueChange={setPreSelectedPrizeId} disabled={isSpinning}>
                    <SelectTrigger className="w-80 bg-slate-800 text-white border-slate-600">
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
                  <p className="text-center text-yellow-300 text-xs">
                    💡 Max spin count is limited to {getMaxAllowedSpins()}x based on available quantity
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SPIN COUNT SELECTOR */}
          <div className="mb-6 bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white text-center mb-3">Select Spin Count</p>
            {spinMode === "pre-selected" && preSelectedPrizeId && (
              <p className="text-cyan-300 text-xs text-center mb-2">
                Max {getMaxAllowedSpins()} spins (based on prize quantity)
              </p>
            )}
            <ToggleGroup
              type="single"
              value={spinCount}
              onValueChange={(value: "1" | "5" | "10" | undefined) => {
                if (value) setSpinCount(value);
              }}
              className="gap-2"
              disabled={isSpinning}
            >
              <ToggleGroupItem
                value="1"
                disabled={!getAvailableSpinOptions().includes("1")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white data-[state=on]:bg-gradient-to-r data-[state=on]:from-purple-500 data-[state=on]:to-blue-500 data-[state=on]:ring-2 data-[state=on]:ring-white disabled:opacity-30 disabled:cursor-not-allowed px-8 py-3"
              >
                1x Spin
              </ToggleGroupItem>
              <ToggleGroupItem
                value="5"
                disabled={!getAvailableSpinOptions().includes("5")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white data-[state=on]:bg-gradient-to-r data-[state=on]:from-purple-500 data-[state=on]:to-blue-500 data-[state=on]:ring-2 data-[state=on]:ring-white disabled:opacity-30 disabled:cursor-not-allowed px-8 py-3"
              >
                5x Spin
              </ToggleGroupItem>
              <ToggleGroupItem
                value="10"
                disabled={!getAvailableSpinOptions().includes("10")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white data-[state=on]:bg-gradient-to-r data-[state=on]:from-purple-500 data-[state=on]:to-blue-500 data-[state=on]:ring-2 data-[state=on]:ring-white disabled:opacity-30 disabled:cursor-not-allowed px-8 py-3"
              >
                10x Spin
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-white/60 text-xs text-center mt-2">
              Press <kbd className="px-2 py-1 bg-white/20 rounded">Enter</kbd>{" "}
              to start
            </p>
          </div>

          {/* DUAL/SINGLE SLOT MACHINES */}
          <div className="flex gap-6 mb-8">
            {/* PARTICIPANT SLOT */}
            <div className="bg-black/10 backdrop-blur-sm rounded-[3rem] p-3">
              <div className="bg-gradient-to-b from-blue-600 via-blue-500 to-blue-600 rounded-2xl p-8 shadow-2xl border-4 border-blue-700">
                <div className="bg-slate-900 rounded-xl p-6 shadow-inner">
                  <div className="flex items-center justify-center mb-4 gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <h3 className="text-blue-400 text-center">Participant</h3>
                  </div>
                  <div className="relative w-80 h-24 bg-white rounded-xl overflow-hidden shadow-xl border-4 border-slate-800">
                    <div className="absolute inset-0 flex flex-col">
                      <div className="absolute w-full" style={participantTransform}>
                        {participants.length > 0 ? (
                          participants
                            .concat(participants)
                            .concat(participants)
                            .map((p, idx) => (
                              <div
                                key={`${p.id}-${idx}`}
                                className="h-24 flex items-center justify-center px-4 border-b border-slate-200 bg-white/30 backdrop-blur-sm"
                              >
                                <span className="text-2xl font-bold truncate max-w-full text-center text-black">
                                  {p.name}
                                </span>
                              </div>
                            ))
                        ) : (
                          <div className="h-24 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                            <span className="text-2xl font-bold text-slate-400">
                              No participants
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 border-y-4 border-blue-500 pointer-events-none"></div>
                  </div>
                  <div className="text-center text-blue-300 text-sm mt-4">
                    {participants.length} remaining
                  </div>
                </div>
              </div>
            </div>

            {/* PRIZE SLOT OR FIXED DISPLAY */}
            <div className="bg-black/10 backdrop-blur-sm rounded-[3rem] p-3">
              <div className="bg-gradient-to-b from-yellow-600 via-yellow-500 to-yellow-600 rounded-2xl p-8 shadow-2xl border-4 border-yellow-700">
                <div className="bg-slate-900 rounded-xl p-6 shadow-inner">
                  <div className="flex items-center justify-center mb-4 gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-yellow-400 text-center">
                      {spinMode === "pre-selected" ? "Selected Prize" : "Prize"}
                    </h3>
                  </div>

                  {spinMode === "random" ? (
                    // Random mode - spinning slot
                    <>
                      <div className="relative w-80 h-24 bg-white rounded-xl overflow-hidden shadow-xl border-4 border-slate-800">
                        <div className="absolute inset-0 flex flex-col">
                          <div className="absolute w-full" style={prizeTransform}>
                            {prizes.length > 0 ? (
                              prizes
                                .concat(prizes)
                                .concat(prizes)
                                .map((p, idx) => (
                                  <div
                                    key={`${p.id}-${idx}`}
                                    className="h-24 flex items-center justify-center px-4 border-b border-slate-200 bg-white/30 backdrop-blur-sm"
                                  >
                                    <span className="text-2xl font-bold truncate max-w-full text-center text-black">
                                      {p.name}
                                    </span>
                                  </div>
                                ))
                            ) : (
                              <div className="h-24 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                                <span className="text-2xl font-bold text-slate-400">
                                  No prizes
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 border-y-4 border-yellow-500 pointer-events-none"></div>
                      </div>
                      <div className="text-center text-yellow-300 text-sm mt-4">
                        {prizes.length} available
                      </div>
                    </>
                  ) : (
                    // Pre-selected mode - fixed display
                    <>
                      <div className="relative w-80 h-24 bg-white rounded-xl overflow-hidden shadow-xl border-4 border-slate-800 flex items-center justify-center">
                        {preSelectedPrizeObj ? (
                          <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-sm w-full h-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-center text-black px-4">
                              {preSelectedPrizeObj.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl text-slate-400">
                            Select prize above
                          </span>
                        )}
                      </div>
                      <div className="text-center text-yellow-300 text-sm mt-4">
                        {preSelectedPrizeObj
                          ? `Qty: ${preSelectedPrizeObj.quantity}`
                          : "No prize selected"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BUTTONS */}
         <div className="flex gap-4 mb-8" style={{ visibility: "hidden", position: "absolute" }}>
            {!showResult && (
              <Button
                onClick={handleStartMultiSpin}
                disabled={
                  isSpinning ||
                  participants.length === 0 ||
                  prizes.length === 0 ||
                  (spinMode === "pre-selected" && !preSelectedPrizeId)
                }
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-2xl shadow-green-500/50 px-16 py-8 text-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSpinning ? (
                  <>
                    <RefreshCw className="w-8 h-8 mr-3 animate-spin" />
                    SPINNING {currentSpinIndex > 0 ? `${currentSpinIndex}/${spinCount}` : "..."}
                  </>
                ) : (
                  <>
                    <Play className="w-8 h-8 mr-3" />
                    START SPIN ({spinCount}x)
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

          {/* RESULT OVERLAY */}
          {showResult && selectedParticipant && selectedPrize && (
            <div className="animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="relative bg-gradient-to-r from-green-500/10 to-teal-500/10 backdrop-blur-lg rounded-3xl border-4 border-green-500/80 px-16 py-10 shadow-2xl">
                  <div className="text-center">
                    <p className="text-green-300 mb-3 tracking-wider uppercase text-lg">
                      🎉 Winner 🎉
                    </p>
                    <div className="flex items-center justify-center gap-8 mb-4">
                      <div>
                        <p className="text-blue-300 text-sm mb-1">Participant</p>
                        <h2 className="text-white text-4xl font-bold drop-shadow-lg">
                          {selectedParticipant.name}
                        </h2>
                      </div>
                      <div className="text-white text-4xl">→</div>
                      <div>
                        <p className="text-yellow-300 text-sm mb-1">Prize</p>
                        <h2 className="text-white text-4xl font-bold drop-shadow-lg">
                          {selectedPrize.name}
                        </h2>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                      Mode: {spinMode === "pre-selected" ? "Pre-selected Prize" : "Random Draw"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE - HISTORY */}
        <div className="w-96 bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden flex flex-col max-h-[calc(100vh-180px)]">
          <h2 className="text-white text-xl mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Spin History
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {spinHistory.length === 0 ? (
              <p className="text-white/50 text-center py-8">No spins yet</p>
            ) : (
              spinHistory.map((result) => (
                <div
                  key={result.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-blue-400" />
                        <p className="text-white font-medium">
                          {result.participant.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <p className="text-yellow-300 text-sm">
                          {result.prize.name}
                        </p>
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
  );
}
