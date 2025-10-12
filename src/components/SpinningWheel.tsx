import React from 'react';

interface Prize {
  id: string;
  name: string;
  weight: number;
}

interface SpinningWheelProps {
  prizes: Prize[];
  selectedPrize?: Prize | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
}

// Warna-warna solid untuk segmen roda
const solidColors = [
    '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0',
    '#ff6b6b', '#feca57', '#30cfd0', '#78ffd6', '#a1c4fd', '#c471ed'
];

export function SpinningWheel({ 
  prizes, 
  selectedPrize, 
  isSpinning, 
  onSpinComplete,
  size = 'large' 
}: SpinningWheelProps) {
    
  // --- KONSTANTA UKURAN ---
  const sizeMap = {
    small: 300,
    medium: 450,
    large: 600,
  };
  const wheelSize = sizeMap[size];
  const pointerSize = wheelSize * 0.05;
  const pointerHeight = wheelSize * 0.06;
  
  const numPrizes = prizes.length;
  // Sudut per segmen (dalam derajat) - Semua segmen sama besar
  const segmentAngle = 360 / numPrizes;

  // State untuk mengontrol rotasi visual (derajat) - AKUMULATIF
  const [rotationDegrees, setRotationDegrees] = React.useState(0);
  
  // Ref untuk mendeteksi kapan animasi CSS selesai
  const wheelRef = React.useRef<HTMLDivElement>(null);
  const isTransitioningRef = React.useRef(false);

  // --- LOGIKA ANIMASI & PENENTUAN TARGET ---
  React.useEffect(() => {
    // Pastikan kita hanya beroperasi saat sedang spin dan hadiah sudah dipilih
    if (!isSpinning || !selectedPrize || isTransitioningRef.current) return;
    
    const targetIndex = prizes.findIndex(p => p.id === selectedPrize.id);
    if (targetIndex === -1) return;

    // **********************************************
    // PERBAIKAN LOGIKA AKUMULASI ROTASI (DARI POSISI SEKARANG)
    // **********************************************
    
    // 1. Hitung Sudut Pusat Hadiah Target (dari Jam 12/Atas)
    // Indeks 0 dimulai di Jam 12 (0/360 derajat)
    const centerAngleFromStart = targetIndex * segmentAngle + segmentAngle / 2;
    
    // 2. Sudut Target Mutlak: Posisi Jam 12 (pointer)
    const pointerAngle = 360; 

    // 3. Hitung Sudut Target Relatif dari 0 Derajat:
    // degreesToTarget = (Pointer Angle - Center Angle)
    let degreesToTarget = pointerAngle - centerAngleFromStart;
    
    // Normalisasi: Pastikan sudut target berada dalam 0-360
    degreesToTarget = degreesToTarget % 360; 
    if (degreesToTarget < 0) {
      degreesToTarget += 360; 
    }
    
    // 4. Hitung Rotasi Target Mutlak Total
    const extraRotations = Math.floor(Math.random() * 3) + 5; // 5-7 putaran penuh
    const absoluteTargetRotation = (extraRotations * 360) + degreesToTarget;
    
    // 5. Hitung Rotasi Delta (Perbedaan) yang Dibutuhkan DARI POSISI SEKARANG
    
    // Posisi roda saat ini, dinormalisasi ke 0-360:
    const currentNormalizedRotation = rotationDegrees % 360;
    
    // Delta = (Target Mutlak) - (Posisi Normalisasi Sekarang)
    // Penambahan 360 memastikan delta selalu positif (roda berputar CW maju)
    const finalRotationDelta = (absoluteTargetRotation - currentNormalizedRotation) + 360; 
    
    // **********************************************

    isTransitioningRef.current = true;
    
    // Atur rotasi baru: Posisi saat ini + Delta
    setRotationDegrees(prev => prev + finalRotationDelta);

  }, [isSpinning, selectedPrize, prizes, segmentAngle, rotationDegrees]);

  // --- HANDLER PENYELESAIAN ANIMASI CSS ---
  const handleTransitionEnd = () => {
    if (isSpinning && selectedPrize) {
      isTransitioningRef.current = false;
      
      // Normalisasi nilai rotasi untuk menghindari angka besar
      const normalizedRotation = rotationDegrees % 360;
      setRotationDegrees(normalizedRotation);

      if (onSpinComplete) {
        onSpinComplete();
      }
    }
  };

  // --- Render Kosong ---
  if (prizes.length === 0) {
    return (
        <div 
            style={{ width: wheelSize, height: wheelSize }}
            className="rounded-full bg-slate-800 flex items-center justify-center text-white border-4 border-slate-700 shadow-xl"
        >
            Tambahkan Hadiah
        </div>
    );
  }
  
  // --- RENDERING RODA UTAMA (MENGGUNAKAN CSS CONIC-GRADIENT) ---
  const conicGradient = prizes.map((p, index) => {
      const start = index * segmentAngle;
      const end = (index + 1) * segmentAngle;
      const color = solidColors[index % solidColors.length];
      
      return `${color} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="relative inline-block">
        {/* Pointer/Arrow at Top (Posisi Jam 12) */}
        <div 
            style={{
                top: -pointerHeight / 2, 
                left: wheelSize / 2 - pointerSize,
                borderLeft: `${pointerSize}px solid transparent`,
                borderRight: `${pointerSize}px solid transparent`,
                borderBottom: `${pointerHeight}px solid #ff6b6b`,
                filter: 'drop-shadow(0 0 10px rgba(255, 107, 107, 0.8))'
            }}
            className="absolute z-20 w-0 h-0"
        ></div>

        {/* The Spinning Wheel */}
        <div
            ref={wheelRef}
            onTransitionEnd={handleTransitionEnd}
            style={{
                width: wheelSize,
                height: wheelSize,
                backgroundImage: `conic-gradient(${conicGradient})`,
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning && isTransitioningRef.current 
                    ? `transform 4s cubic-bezier(0.2, 0.8, 0.7, 1.0)`
                    : 'none',
            }}
            className={`
                relative rounded-full border-[10px] border-white shadow-[0_0_30px_rgba(255,255,255,0.5)] 
                ${isSpinning ? 'blur-[2px]' : ''} 
                transition-all duration-300
            `}
        >
            {/* Prize Labels */}
            {prizes.map((prize, index) => {
                // Sudut untuk teks (Pusat segmen dari posisi Jam 12)
                const angle = index * segmentAngle + (segmentAngle / 2);
                
                return (
                    <div
                        key={prize.id}
                        style={{
                            // Terapkan rotasi untuk memposisikan dan meluruskan teks
                            transform: `
                                rotate(${angle}deg) 
                                translate(0, ${-wheelSize * 0.4}px) 
                                rotate(90deg)
                            `,
                            width: wheelSize * 0.35, 
                            fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
                        }}
                        className={`
                            absolute top-1/2 left-1/2 origin-[0%_0%] 
                            -translate-x-1/2 text-white text-center font-bold 
                            p-1 pointer-events-none drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]
                        `}
                    >
                        {prize.name}
                    </div>
                );
            })}

            {/* Center Circle */}
            <div 
                style={{ width: wheelSize * 0.12, height: wheelSize * 0.12 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                    rounded-full bg-gradient-to-br from-purple-500 to-indigo-700 
                    border-4 border-white shadow-xl z-10"
            ></div>
        </div>
    </div>
  );
}