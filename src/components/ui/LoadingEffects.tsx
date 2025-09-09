import React, { useState, useEffect, useRef } from 'react';
import { Heart, Zap, Circle, Triangle, Square } from 'lucide-react';

// Variant 1: Cursor Follower with Particles
const CursorParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleMouseMove = (e: MouseEvent) => {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 60,
          maxLife: 60,
          hue: Math.random() * 360
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;

        const alpha = particle.life / particle.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${particle.hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3 * alpha, 0, Math.PI * 2);
        ctx.fill();

        if (particle.life <= 0) {
          particlesRef.current.splice(index, 1);
        }
      });

      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-4xl font-bold animate-pulse">
          Cargando Magia...
        </div>
      </div>
    </div>
  );
};

// Variant 2: Wave Chaser
const WaveChaser: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 to-blue-900 overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-white opacity-30"
          style={{
            left: mousePos.x - 50 - i * 20,
            top: mousePos.y - 50 - i * 20,
            width: 100 + i * 40,
            height: 100 + i * 40,
            animationDelay: `${i * 0.1}s`,
            transition: 'all 0.3s ease-out'
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-3xl font-bold">
          Persiguiendo Ondas...
        </div>
      </div>
    </div>
  );
};

// Variant 3: Spiral Tracker
const SpiralTracker: React.FC = () => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 2);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
      <div 
        className="relative"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-white rounded-full"
            style={{
              left: `${Math.cos(i * 30 * Math.PI / 180) * (50 + i * 10)}px`,
              top: `${Math.sin(i * 30 * Math.PI / 180) * (50 + i * 10)}px`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-20 text-white text-2xl font-bold">
        Espiral Infinita
      </div>
    </div>
  );
};

// Variant 4: Bubble Explosion
const BubbleExplosion: React.FC = () => {
  const [bubbles, setBubbles] = useState<Array<{x: number, y: number, id: number}>>([]);

  const handleClick = (e: React.MouseEvent) => {
    const newBubbles = [...Array(8)].map((_, i) => ({
      x: e.clientX,
      y: e.clientY,
      id: Date.now() + i
    }));
    setBubbles(prev => [...prev, ...newBubbles]);
    
    setTimeout(() => {
      setBubbles(prev => prev.filter(bubble => !newBubbles.includes(bubble)));
    }, 2000);
  };

  return (
    <div 
      className="relative w-full h-screen bg-gradient-to-bl from-cyan-400 to-blue-600 cursor-pointer"
      onClick={handleClick}
    >
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute w-8 h-8 bg-white bg-opacity-50 rounded-full animate-ping"
          style={{
            left: bubble.x - 16,
            top: bubble.y - 16,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-3xl font-bold mb-4">¡Haz Click!</div>
          <div className="text-lg">Explota Burbujas</div>
        </div>
      </div>
    </div>
  );
};

// Variant 5: Morphing Text
const MorphingText: React.FC = () => {
  const texts = ['CARGANDO', 'LOADING', 'CHARGEMENT', 'CARICAMENTO', '読み込み中'];
  const [currentText, setCurrentText] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentText(prev => (prev + 1) % texts.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      <div className="relative">
        <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 animate-pulse">
          {texts[currentText]}
        </div>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 400}px`,
              top: `${Math.random() * 100}px`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Variant 6: Concentric Circles
const ConcentricCircles: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-gradient-to-tr from-indigo-900 to-purple-900 flex items-center justify-center">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute border-4 border-white rounded-full animate-ping"
          style={{
            width: `${(i + 1) * 80}px`,
            height: `${(i + 1) * 80}px`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: '2s'
          }}
        />
      ))}
      <div className="relative z-10 text-white text-2xl font-bold">
        Ondas Expansivas
      </div>
    </div>
  );
};

// Variant 7: Bouncing Dots
const BouncingDots: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-green-400 to-teal-600 flex items-center justify-center">
      <div className="flex space-x-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 bg-white rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.8s'
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-20 text-white text-2xl font-bold">
        Pelotas Saltarinas
      </div>
    </div>
  );
};

// Variant 8: Matrix Rain
const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0';
      ctx.font = '15px monospace';

      drops.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 20, y * 20);

        if (y * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      });
    };

    const interval = setInterval(draw, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-green-400 text-3xl font-mono bg-black bg-opacity-50 p-4 rounded">
          MATRIX LOADING...
        </div>
      </div>
    </div>
  );
};

// Variant 9: Heart Beat
const HeartBeat: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-gradient-to-r from-rose-400 to-pink-600 flex items-center justify-center">
      <div className="relative">
        <Heart 
          size={120} 
          className="text-white animate-pulse" 
          style={{ animationDuration: '1s' }}
          fill="currentColor"
        />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 border-4 border-white rounded-full animate-ping opacity-30"
            style={{
              animationDelay: `${i * 0.3}s`,
              animationDuration: '2s'
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-20 text-white text-2xl font-bold">
        Latido del Corazón
      </div>
    </div>
  );
};

// Variant 10: Rain Effect
const RainEffect: React.FC = () => {
  const dropsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createDrop = () => {
      if (!dropsRef.current) return;
      
      const drop = document.createElement('div');
      drop.className = 'absolute w-1 h-16 bg-blue-300 opacity-70 animate-pulse';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDuration = `${0.5 + Math.random()}s`;
      drop.style.transform = 'translateY(-100px)';
      
      dropsRef.current.appendChild(drop);
      
      setTimeout(() => {
        drop.style.transform = 'translateY(100vh)';
      }, 10);
      
      setTimeout(() => {
        drop.remove();
      }, 2000);
    };

    const interval = setInterval(createDrop, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-gray-800 to-blue-900 overflow-hidden">
      <div ref={dropsRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-3xl font-bold bg-black bg-opacity-30 p-6 rounded-lg">
          Lluvia Digital
        </div>
      </div>
    </div>
  );
};

// Variant 11: Geometric Shapes
const GeometricShapes: React.FC = () => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 1);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-bl from-yellow-400 to-red-600 flex items-center justify-center">
      <div className="relative">
        {[Circle, Triangle, Square].map((Icon, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              transform: `rotate(${rotation + i * 120}deg) translateX(60px) rotate(${-rotation - i * 120}deg)`
            }}
          >
            <Icon size={40} className="text-white" />
          </div>
        ))}
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-red-500 rounded-full" />
        </div>
      </div>
      <div className="absolute bottom-20 text-white text-2xl font-bold">
        Formas Geométricas
      </div>
    </div>
  );
};

// Variant 12: Fire Effect
const FireEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];

    const createParticle = () => {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height - 50,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 5 - 2,
        life: 100,
        maxLife: 100
      });
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create new particles
      for (let i = 0; i < 3; i++) createParticle();

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;

        const life = particle.life / particle.maxLife;
        const hue = life > 0.5 ? 60 : 0; // Yellow to red
        ctx.globalAlpha = life;
        ctx.fillStyle = `hsl(${hue}, 100%, ${50 + life * 50}%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3 + life * 3, 0, Math.PI * 2);
        ctx.fill();

        if (particle.life <= 0) {
          particles.splice(index, 1);
        }
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-orange-400 text-3xl font-bold bg-black bg-opacity-50 p-4 rounded">
          🔥 Fuego Ardiente 🔥
        </div>
      </div>
    </div>
  );
};

// Variant 13: DNA Helix
const DNAHelix: React.FC = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => prev + 0.1);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-r from-teal-900 to-green-900 flex items-center justify-center">
      <div className="relative w-64 h-96">
        {[...Array(20)].map((_, i) => {
          const y = i * 20;
          const x1 = Math.sin(frame + i * 0.3) * 50;
          const x2 = Math.sin(frame + i * 0.3 + Math.PI) * 50;
          
          return (
            <div key={i} className="absolute" style={{ top: y }}>
              <div 
                className="w-4 h-4 bg-cyan-400 rounded-full absolute"
                style={{ left: 100 + x1 }}
              />
              <div 
                className="w-4 h-4 bg-green-400 rounded-full absolute"
                style={{ left: 100 + x2 }}
              />
              <div 
                className="h-px bg-white absolute top-2"
                style={{ 
                  left: Math.min(100 + x1, 100 + x2) + 8,
                  width: Math.abs(x2 - x1)
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-20 text-white text-2xl font-bold">
        Hélice de ADN
      </div>
    </div>
  );
};

// Variant 14: Galaxy Spiral
const GalaxySpiral: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let rotation = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 20, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 200; i++) {
        const angle = (i * 0.1) + rotation;
        const radius = i * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        ctx.globalAlpha = 1 - (i / 200);
        ctx.fillStyle = `hsl(${(i * 2) % 360}, 80%, 60%)`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      rotation += 0.01;
      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-purple-400 text-3xl font-bold bg-black bg-opacity-50 p-4 rounded">
          🌌 Galaxia Espiral 🌌
        </div>
      </div>
    </div>
  );
};

// Variant 15: Sound Waves
const SoundWaves: React.FC = () => {
  const [bars, setBars] = useState(Array(20).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100 + 20));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gradient-to-t from-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="flex items-end space-x-2">
        {bars.map((height, i) => (
          <div
            key={i}
            className="w-6 bg-gradient-to-t from-pink-500 to-cyan-400 rounded-t transition-all duration-100"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
      <div className="absolute bottom-20 text-white text-2xl font-bold flex items-center space-x-2">
        <Zap className="animate-pulse" />
        <span>Ondas Sonoras</span>
        <Zap className="animate-pulse" />
      </div>
    </div>
  );
};

export const loaderComponents = {
  CursorParticles,
  WaveChaser,
  SpiralTracker,
  BubbleExplosion,
  MorphingText,
  ConcentricCircles,
  BouncingDots,
  MatrixRain,
  HeartBeat,
  RainEffect,
  GeometricShapes,
  FireEffect,
  DNAHelix,
  GalaxySpiral,
  SoundWaves
};