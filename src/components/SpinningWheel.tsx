import { useEffect, useRef, useState } from 'react';

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

export function SpinningWheel({ 
  prizes, 
  selectedPrize, 
  isSpinning, 
  onSpinComplete,
  size = 'large' 
}: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>();
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  useEffect(() => {
    if (size === 'small') {
      setDimensions({ width: 300, height: 300 });
    } else if (size === 'medium') {
      setDimensions({ width: 450, height: 450 });
    } else {
      setDimensions({ width: 600, height: 600 });
    }
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (prizes.length === 0) {
      // Draw empty state
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText('Tambahkan hadiah', centerX, centerY);
      return;
    }

    // Calculate total weight
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);

    // Draw segments
    let currentAngle = rotation;
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];

    const solidColors = [
      '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0'
    ];

    prizes.forEach((prize, index) => {
      const sliceAngle = (prize.weight / totalWeight) * Math.PI * 2;
      
      // Draw slice
      ctx.fillStyle = solidColors[index % solidColors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      const textAngle = currentAngle + sliceAngle / 2;
      const textRadius = radius * 0.7;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = size === 'small' ? '12px Inter, sans-serif' : size === 'medium' ? '14px Inter, sans-serif' : '16px Inter, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(prize.name, 0, 0);
      ctx.restore();

      currentAngle += sliceAngle;
    });

    // Draw outer ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw center circle
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Center circle inner gradient effect
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pointer/arrow at top
    const pointerSize = size === 'small' ? 18 : size === 'medium' ? 24 : 30;
    const pointerHeight = size === 'small' ? 20 : size === 'medium' ? 26 : 35;
    
    // Pointer shadow
    ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
    ctx.shadowBlur = 15;
    
    // Pointer gradient
    const pointerGradient = ctx.createLinearGradient(
      centerX, centerY - radius - 15,
      centerX, centerY - radius - 15 - pointerHeight
    );
    pointerGradient.addColorStop(0, '#ff6b6b');
    pointerGradient.addColorStop(1, '#feca57');
    ctx.fillStyle = pointerGradient;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 15);
    ctx.lineTo(centerX - pointerSize, centerY - radius - 15 - pointerHeight);
    ctx.lineTo(centerX + pointerSize, centerY - radius - 15 - pointerHeight);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

  }, [prizes, rotation, dimensions, size]);

  useEffect(() => {
    if (isSpinning && selectedPrize) {
      // Calculate target angle
      const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
      let targetAngle = 0;
      let currentWeight = 0;

      for (const prize of prizes) {
        if (prize.id === selectedPrize.id) {
          // Center of this prize segment
          targetAngle = (currentWeight + prize.weight / 2) / totalWeight * Math.PI * 2;
          break;
        }
        currentWeight += prize.weight;
      }

      // Add extra rotations for effect (5-7 full rotations)
      const extraRotations = (5 + Math.random() * 2) * Math.PI * 2;
      const finalAngle = extraRotations + (Math.PI * 2 - targetAngle);

      let startTime: number | null = null;
      const duration = 4000; // 4 seconds

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setRotation(rotation + finalAngle * easeOut);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setRotation(rotation + finalAngle);
          if (onSpinComplete) {
            setTimeout(onSpinComplete, 500);
          }
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isSpinning, selectedPrize]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="drop-shadow-2xl"
        style={{
          filter: isSpinning ? 'blur(2px)' : 'none',
          transition: 'filter 0.3s ease'
        }}
      />
    </div>
  );
}
