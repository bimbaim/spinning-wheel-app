import React from 'react';

interface Prize {
  id: string;
  name: string;
  weight: number;
  quantity: number;
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
    
  // Filter out prizes with quantity = 0
  const availablePrizes = prizes.filter(p => p.quantity > 0);
  
  // --- KONSTANTA UKURAN ---
  const sizeMap = {
    small: 300,
    medium: 450,
    large: 600,
  };
  const wheelSize = sizeMap[size];
  const pointerSize = wheelSize * 0.05;
  const pointerHeight = wheelSize * 0.06;
  
  const numPrizes = availablePrizes.length;
  // Sudut per segmen (dalam derajat) - Semua segmen sama besar
  const segmentAngle = numPrizes > 0 ? 360 / numPrizes : 360;

  // State untuk mengontrol rotasi visual (derajat) - AKUMULATIF
  const [rotationDegrees, setRotationDegrees] = React.useState(0);
  
  // Ref untuk mendeteksi kapan animasi CSS selesai
  const wheelRef = React.useRef<HTMLDivElement>(null);
  const isTransitioningRef = React.useRef(false);

  // --- LOGIKA ANIMASI & PENENTUAN TARGET ---
  React.useEffect(() => {
    if (!isSpinning || !selectedPrize || isTransitioningRef.current) return;
    
    const targetIndex = availablePrizes.findIndex(p => p.id === selectedPrize.id);
    if (targetIndex === -1) {
      console.error('Selected prize not found in available prizes!');
      return;
    }
    
    const centerAngleFromStart = targetIndex * segmentAngle + segmentAngle / 2;
    const pointerAngle = 360; 
    let degreesToTarget = pointerAngle - centerAngleFromStart;
    
    degreesToTarget = degreesToTarget % 360; 
    if (degreesToTarget < 0) {
      degreesToTarget += 360; 
    }
    
    const extraRotations = Math.floor(Math.random() * 3) + 5; 
    const absoluteTargetRotation = (extraRotations * 360) + degreesToTarget;
    
    const currentNormalizedRotation = rotationDegrees % 360;
    const finalRotationDelta = (absoluteTargetRotation - currentNormalizedRotation) + 360; 
    
    isTransitioningRef.current = true;
    setRotationDegrees(prev => prev + finalRotationDelta);

  }, [isSpinning, selectedPrize, availablePrizes, segmentAngle, rotationDegrees]);

  // --- HANDLER PENYELESAIAN ANIMASI CSS ---
  const handleTransitionEnd = () => {
    if (isSpinning && selectedPrize) {
      isTransitioningRef.current = false;
      
      const normalizedRotation = rotationDegrees % 360;
      setRotationDegrees(normalizedRotation);

      if (onSpinComplete) {
        onSpinComplete();
      }
    }
  };

  // --- Render Kosong ---
  if (availablePrizes.length === 0) {
    return (
        <div 
            style={{ width: wheelSize, height: wheelSize }}
            className="rounded-full bg-slate-800 flex items-center justify-center text-white border-4 border-slate-700 shadow-xl"
        >
            Add Prizes
        </div>
    );
  }
  
  // --- RENDERING RODA UTAMA (MENGGUNAKAN CSS CONIC-GRADIENT) ---
  const conicGradient = availablePrizes.map((p, index) => {
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
        // Posisi tetap sama: Di atas roda, di tengah horizontal
        top: -pointerHeight / 2, 
        left: wheelSize / 2 - pointerSize,
        
        // Pembentukan Segitiga Dibalik: Menggunakan border-top
        borderLeft: `${pointerSize}px solid transparent`,
        borderRight: `${pointerSize}px solid transparent`,
        // **PERUBAHAN UTAMA:** Gunakan borderTop untuk membalik arah
        borderTop: `${pointerHeight}px solid #ff6b6b`,
        borderBottom: 'none', // Pastikan properti yang lama dinonaktifkan
        
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
            {/* Prize Labels - PENDENGKATAN BARU */}
            {availablePrizes.map((prize, index) => {
                // Sudut pusat segmen, diukur dari 0 (atas) ke kanan (searah jarum jam)
                const centerAngle = index * segmentAngle + (segmentAngle / 2);
                
                // Jarak radial teks dari pusat roda (Misalnya: 70% dari radius roda)
                const textDistance = wheelSize * 0.35; 
                // Lebar label agar dapat mengakomodasi teks panjang
                const labelWidth = wheelSize * 0.45; 
                
                return (
                    <div
                        key={prize.id}
                        style={{
                            // Posisikan label di tengah roda (sebelum transformasi)
                            top: '50%',
                            left: '50%',
                            // Atur lebar & ukuran font
                            width: labelWidth, 
                            fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
                            
                            // *** Rantai Transformasi yang Ditingkatkan ***
                            transform: `
                                /* 1. Putar seluruh sistem ke posisi segmen yang benar */
                                rotate(${centerAngle}deg) 
                                
                                /* 2. Geser label ke posisi radialnya */
                                translateY(${-textDistance}px) 

                                /* 3. Putar label kembali untuk meluruskan teks ke horizontal (atau 90 deg) */
                                /* Jika 0deg, teks akan sejajar dengan jari-jari (terbaca dari pusat ke luar) */
                                /* Jika 90deg, teks akan tegak lurus jari-jari (lebih umum) */
                                rotate(90deg)

                                /* 4. Geser label kembali 50% dari lebarnya untuk memusatkannya */
                                translateX(-50%) 
                            `,
                            // Atur pusat rotasi ke tengah roda (pusat elemen)
                            transformOrigin: '0 0',
                        }}
                        className={`
                            absolute text-white text-center font-bold 
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