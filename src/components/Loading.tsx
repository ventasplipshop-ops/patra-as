import React from "react";
import { loaderComponents } from "./ui/LoadingEffects"; 
// tu archivo actual con todos los loaders juntos

// Función que devuelve un loader random
export function RandomLoader() {
  const keys = Object.keys(loaderComponents) as (keyof typeof loaderComponents)[];
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const Component = loaderComponents[randomKey];

  return <Component />;
}