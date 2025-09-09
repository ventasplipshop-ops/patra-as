import React, { useEffect, useState } from "react";
import { loaderComponents } from "./components/ui/LoadingEffects";
import Shell from "./layout/Shell";

// 👉 componente que elige un loader random una sola vez
function RandomLoader() {
  const keys = Object.keys(loaderComponents) as (keyof typeof loaderComponents)[];
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const Component = loaderComponents[randomKey];
  return <Component />;
}

export default function App() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 10000); // 5 segundos
    return () => clearTimeout(timer);
  }, []);

  return showLoader ? <RandomLoader /> : <Shell />;
}
