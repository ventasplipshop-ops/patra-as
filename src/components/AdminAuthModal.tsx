import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminAuthModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

const handleConfirm = async () => {
    setLoading(true);
  // buscar usuarios tipo Admin
  const { data, error } = await supabase
    .from("users")
    .select("id, password")
    .eq("tipo_usuario", "admin")
    .limit(1)
    .single();

  if (error) {
    console.error("❌ Error buscando admin:", error.message);
    alert("Error al validar admin");
    return;
  }

  // ⚠️ acá estás comparando en plano (solo de ejemplo).
  // Lo ideal es que la contraseña esté hasheada (bcrypt).
  if (data && data.password === password) {
    onConfirm();
    setPassword("");

  } else {
    alert("❌ Contraseña incorrecta");
  }
  setLoading(false);
};

if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-semibold mb-3">🔐 Autorización requerida</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Ingresá la contraseña de un usuario administrador para registrar la consigna.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña admin"
          className="w-full border rounded px-3 py-2 text-sm mb-3"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
            {loading ? "Validando..." : "Confirmar"}
            </button>
        </div>
      </div>
    </div>
  );
}
