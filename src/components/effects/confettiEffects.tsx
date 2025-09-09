// src/components/effects/effects.ts
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

/**
 * 🎉 Efecto fiesta (ventas exitosas)
 */
export function lanzarConfeti() {
  const duration = 5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 250 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}

/**
 * 🌧️ Efecto lluvia triste (devoluciones)
 */
export function lanzarLluviaTriste() {
  const duration = 4 * 1000;
  const animationEnd = Date.now() + duration;

  const defaults = {
    spread: 70,
    startVelocity: 10,
    particleCount: 2,
    scalar: 1.2,
    colors: ["#5b5b5b", "#3a3a3a", "#1e3a8a"],
    ticks: 200,
    gravity: 1.5,
    shapes: ["circle"] as ("circle" | "square" | "star")[],
    zIndex: 2000,
  };

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    confetti({
      ...defaults,
      origin: { x: Math.random(), y: 0 }
    });
  }, 100);
}


/**
 * 🔥 Efecto alerta (errores graves, rechazo, caja mal cerrada)
 */
export function lanzarChispasRojas() {
  const duration = 2 * 1000;
  const end = Date.now() + duration;

  const defaults = {
    startVelocity: 45,
    spread: 90,
    ticks: 60,
    gravity: 1,
    colors: ["#ff0000", "#ff4d4d", "#990000"],
    zIndex: 2000,
  };

  const interval: any = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.5, y: 0.5 },
    });
  }, 200);
}

/**
 * 🌟 Efecto estrellas (logro desbloqueado, cliente VIP)
 */
export function lanzarEstrellas() {
  confetti({
    particleCount: 120,
    spread: 180,
    startVelocity: 40,
    ticks: 100,
    scalar: 1.5,
    shapes: ["star"],
    colors: ["#FFD700", "#FFFACD", "#FFA500"],
    origin: { x: 0.5, y: 0.5 },
    zIndex: 2000,
  });
}




export function lanzarHumo() {
  const duration = 2 * 1000;
  const end = Date.now() + duration;

  const defaults = {
    spread: 60,
    ticks: 80,
    gravity: -0.3, // humo hacia arriba
    scalar: 1.2,
    colors: ["#cccccc", "#999999", "#666666"],
    zIndex: 2000,
  };

  const interval: any = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    confetti({
      ...defaults,
      particleCount: 5,
      origin: { x: 0.5, y: 1 }, // desde abajo
    });
  }, 100);
}





export function lanzarChispazos() {
  confetti({
    particleCount: 80,
    spread: 120,
    startVelocity: 60,
    ticks: 50,
    gravity: 0,
    scalar: 0.8,
    colors: ["#00ffff", "#ffffff", "#00ffcc"],
    origin: { x: 0.5, y: 0.5 },
    zIndex: 2000,
  });
}

