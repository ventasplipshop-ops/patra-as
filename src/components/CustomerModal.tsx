// src/components/ClienteModal.tsx
import React, { useState, useEffect } from "react";
import { performAction } from "../actions/performAction";
import { useAuth } from "../context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (id: number) => void;
}

export default function ClienteModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<"natural" | "juridico">("natural");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    nombre: "",
    apellido: "",
    razon_social: "",
    dni: "",
    cuit: "",
    telefono: "",
    direccion: "",
  });

  /** Generar email automáticamente */
  useEffect(() => {
    if (!open) return; // 👈 condicionamos dentro del hook

    if (tipo === "natural" && form.nombre && form.apellido) {
      const auto = `${form.nombre}.${form.apellido}@correo.com`
        .toLowerCase()
        .replace(/\s+/g, "");
      setForm((prev) => ({ ...prev, email: prev.email || auto }));
    }

    if (tipo === "juridico" && form.razon_social) {
      const auto = `${form.razon_social}@correo.com`
        .toLowerCase()
        .replace(/\s+/g, "");
      setForm((prev) => ({ ...prev, email: prev.email || auto }));
    }
  }, [form.nombre, form.apellido, form.razon_social, tipo, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.email) {
      alert("⚠️ El email es obligatorio");
      return;
    }

    setLoading(true);
    const res = await performAction("saveCustomer", {
      tipo,
      ...form,
      created_by: String(user?.id),
    });
    setLoading(false);

    if (res.ok) {
      alert("✅ Cliente registrado correctamente");
      onSuccess?.(res.id);
      onClose();
      setForm({
        email: "",
        nombre: "",
        apellido: "",
        razon_social: "",
        dni: "",
        cuit: "",
        telefono: "",
        direccion: "",
      }); // limpiar formulario al cerrar
    } else {
      alert(res.error || "❌ Error al registrar cliente");
    }
  };

  if (!open) return null; // 👈 ahora al final, después de los hooks

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-[500px]">
        <h2 className="text-xl font-bold mb-4">➕ Registrar Cliente</h2>

        {/* Tipo */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "natural" | "juridico")}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="natural">Natural</option>
            <option value="juridico">Jurídico</option>
          </select>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-2 gap-3">
          {tipo === "natural" && (
            <>
              <div>
                <label className="text-sm">Nombre</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">Apellido</label>
                <input
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">DNI</label>
                <input
                  name="dni"
                  value={form.dni}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </>
          )}

          {tipo === "juridico" && (
            <>
              <div className="col-span-2">
                <label className="text-sm">Razón Social</label>
                <input
                  name="razon_social"
                  value={form.razon_social}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm">CUIT</label>
                <input
                  name="cuit"
                  value={form.cuit}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Email generado */}
        <div className="mt-3">
          <label className="text-sm">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <p className="text-xs text-gray-500">
            Se genera automáticamente, pero podés editarlo si el cliente da otro.
          </p>
        </div>

        {/* Teléfono y Dirección */}
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-sm">Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-sm">Dirección</label>
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "⏳ Guardando..." : "Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
