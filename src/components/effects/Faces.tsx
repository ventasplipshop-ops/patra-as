import { motion } from "framer-motion";

export function CaraNo() {
  return (
    <motion.div
      className="text-6xl select-none"
      animate={{ rotate: [-15, 15, -15, 15, 0] }}
      transition={{ duration: 1.5, repeat: 2 }}
    >
      😔
    </motion.div>
  );
}

export function CaraFeliz() {
  return (
    <motion.div
      className="text-6xl select-none"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: 2 }}
    >
      😃
    </motion.div>
  );
}


export function CaraUff() {
  return (
    <motion.div
      className="text-6xl select-none"
      animate={{ rotate: [-10, 10, -10, 0], scale: [1, 1.2, 1] }}
      transition={{ duration: 1.5 }}
    >
      😅
    </motion.div>
  );
}
