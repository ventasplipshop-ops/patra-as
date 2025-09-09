import { useState } from "react";
import type { EffectType } from "./EffectsManager";

export  function useEffects() {
  const [effects, setEffects] = useState<EffectType[]>([]);

  const triggerEffect = (effect: EffectType, duration = 2000) => {
    setEffects((prev) => [...prev, effect]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((e) => e !== effect));
    }, duration);
  };

  return { effects, triggerEffect };
}
