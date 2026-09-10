import { useEffect, useState } from "react";

const API_URL = "https://edwin.edabso.com";

interface Lead {
  id: string;
  title: string;
  contact_name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export default function CreateOrderButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  async function loadLeads() {
    try {
      setLeadsLoading(true);

      const token = localStorage.getItem("api_token");

      const res = await fetch(`${API_URL}/api/crm/board`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "error cargando clientes");
        return;
      }

      const foundLeads: Lead[] = [];

      data?.pipelines?.forEach((pipeline: any) => {
        pipeline?.stages?.forEach((stage: any) => {
          stage?.leads?.forEach((lead: any) => {
            foundLeads.push({
              id: lead.id,
              title: lead.title,
              contact_name: lead.contact_name,
              address: lead.address,
              email: lead.email,
              phone:
                lead.contacts?.find((c: any) => c.type === "phone")?.value || "",
            });
          });
        });
      });

      setLeads(foundLeads);

      if (foundLeads.length > 0) {
        setSelectedLeadId(foundLeads[0].id);
      }
    } catch (err) {
      console.error(err);
      alert("error cargando clientes");
    } finally {
      setLeadsLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setGeneratedUrl("");
      loadLeads();
    }
  }, [open]);

  async function createOrderLink() {
    if (!selectedLeadId) {
      alert("selecciona un cliente");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("api_token");

      const res = await fetch(`${API_URL}/api/orders/public/create-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lead_id: selectedLeadId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "error");
        return;
      }

      setGeneratedUrl(data.url);
    } catch (err) {
      console.error(err);
      alert("error");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(generatedUrl);
    alert("link copiado");
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Crear pedido
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[500px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Crear pedido</h2>

            {leadsLoading && (
              <p className="text-sm text-gray-500">Cargando clientes...</p>
            )}

            {!leadsLoading && leads.length === 0 && (
              <p className="text-sm text-red-500">
                No hay clientes cargados.
              </p>
            )}

            {leads.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Cliente</p>

                <select
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    setGeneratedUrl("");
                  }}
                  className="border rounded w-full px-3 py-2"
                >
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.contact_name || lead.title}
                    </option>
                  ))}
                </select>

                {selectedLead && (
                  <div className="mt-3 text-sm bg-gray-50 border rounded p-3">
                    <p className="font-semibold">
                      {selectedLead.contact_name || selectedLead.title}
                    </p>

                    {selectedLead.phone && (
                      <p className="text-gray-600">Tel: {selectedLead.phone}</p>
                    )}

                    {selectedLead.address && (
                      <p className="text-gray-600">
                        Dirección: {selectedLead.address}
                      </p>
                    )}

                    {selectedLead.email && (
                      <p className="text-gray-600">
                        Email: {selectedLead.email}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!generatedUrl && (
              <button
                onClick={createOrderLink}
                disabled={loading || leads.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
              >
                {loading ? "Generando..." : "Crear link"}
              </button>
            )}

            {generatedUrl && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Link generado
                  </p>

                  <div className="border p-3 rounded break-all text-sm">
                    {generatedUrl}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="bg-black text-white px-4 py-2 rounded flex-1"
                  >
                    Copiar
                  </button>

                  <a
                    href={generatedUrl}
                    target="_blank"
                    className="bg-green-600 text-white px-4 py-2 rounded flex-1 text-center"
                  >
                    Abrir
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setOpen(false);
                setGeneratedUrl("");
              }}
              className="mt-4 text-sm text-gray-500"
            >
              cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}