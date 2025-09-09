import React, { useEffect } from "react";
import {
  lanzarConfeti,
  lanzarLluviaTriste,
  lanzarChispasRojas,
  lanzarEstrellas,
} from "./confettiEffects";
import { CaraNo, CaraFeliz, CaraUff } from "./Faces";

export type EffectType =
  | "confeti"
  | "lluvia"
  | "chispas"
  | "estrellas"
  | "caraNo"
  | "caraFeliz"
  | "caraUff";

interface EffectsManagerProps {
  effects: EffectType[]; // 👈 ahora acepta varios efectos
}

export default function EffectsManager({ effects }: EffectsManagerProps) {
  useEffect(() => {
    if (effects.includes("confeti")) lanzarConfeti();
    if (effects.includes("lluvia")) lanzarLluviaTriste();
    if (effects.includes("chispas")) lanzarChispasRojas();
    if (effects.includes("estrellas")) lanzarEstrellas();
  }, [effects]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      {effects.includes("caraNo") && <CaraNo />}
      {effects.includes("caraFeliz") && <CaraFeliz />}
      {effects.includes("caraUff") && <CaraUff />}
    </div>
  );
}
