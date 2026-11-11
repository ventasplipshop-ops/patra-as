import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Edit3, FileText, Plus, Search } from "lucide-react";
import PriceListModal from "../../components/PriceListModal";
import type { CatalogDraft, CatalogSummary } from "../../components/print/priceListTypes";
import { CatalogPersistenceUnavailableError, getCatalog, listCatalogs, saveCatalog } from "./catalogosApi";

const formatDate = (value: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export default function CatalogosView() {
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [current, setCurrent] = useState<CatalogDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [persistenceReady, setPersistenceReady] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true); setMessage("");
    try { setCatalogs(await listCatalogs()); setPersistenceReady(true); }
    catch (cause) {
      if (cause instanceof CatalogPersistenceUnavailableError) {
        setPersistenceReady(false); setCatalogs([]);
        setMessage("La persistencia de Catálogos está preparada, pero la migración de Supabase todavía requiere autorización.");
      } else setMessage(cause instanceof Error ? cause.message : "No se pudieron cargar los catálogos.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return term ? catalogs.filter((catalog) => catalog.name.toLocaleLowerCase("es").includes(term)) : catalogs;
  }, [catalogs, search]);

  const openCatalog = async (catalog: CatalogSummary) => {
    setBusyId(catalog.id); setMessage("");
    try {
      const hydrated = await getCatalog(catalog.id);
      if (hydrated.warnings.length) setMessage(`Revisá ${hydrated.warnings.length} producto(s) eliminado(s) o sin precio vigente antes de publicar.`);
      setCurrent(hydrated); setEditorOpen(true);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No se pudo abrir el catálogo."); }
    finally { setBusyId(""); }
  };

  const duplicate = async (catalog: CatalogSummary) => {
    setBusyId(catalog.id); setMessage("");
    try {
      const hydrated = await getCatalog(catalog.id);
      if (hydrated.warnings.length) throw new Error("No se puede duplicar hasta quitar o reemplazar los productos no disponibles.");
      await saveCatalog({ name:`${hydrated.name} (copia)`, status:"borrador", segment:hydrated.segment, products:hydrated.products, config:hydrated.config });
      setMessage("Catálogo duplicado como borrador."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No se pudo duplicar el catálogo."); }
    finally { setBusyId(""); }
  };

  const persist = async (draft: CatalogDraft) => {
    await saveCatalog(draft);
    setEditorOpen(false); setCurrent(null); setMessage("Catálogo guardado correctamente.");
    await refresh();
  };

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="text-fuchsia-600" /> Catálogos</h1><p className="text-sm text-gray-500">Listas comerciales reutilizables con precios vigentes del inventario.</p></div>
        <button type="button" onClick={() => { setCurrent(null); setEditorOpen(true); }} className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white"><Plus size={18} /> Crear catálogo</button>
      </header>

      {message && <div className={`rounded-lg border px-4 py-3 text-sm ${persistenceReady ? "border-blue-200 bg-blue-50 text-blue-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}>{message}</div>}

      <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar catálogo por nombre" className="w-full rounded-lg border py-2 pl-10 pr-3" /></div>

      <section className="min-h-0 flex-1 overflow-auto rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-900">
        {loading ? <p className="p-8 text-center text-gray-500">Cargando catálogos…</p> : filtered.length === 0 ? <div className="p-10 text-center"><FileText className="mx-auto mb-3 text-gray-300" size={42} /><p className="font-medium">{search ? "No hay coincidencias." : "Todavía no hay catálogos guardados."}</p><p className="mt-1 text-sm text-gray-500">Podés crear y generar uno aun mientras se autoriza la persistencia.</p></div> : <table className="w-full text-sm"><thead className="sticky top-0 bg-gray-50 text-left dark:bg-gray-800"><tr><th className="p-3">Nombre</th><th className="p-3">Rubro</th><th className="p-3">Última modificación</th><th className="p-3">Productos</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody>{filtered.map((catalog) => <tr key={catalog.id} className="border-t dark:border-gray-800"><td className="p-3 font-medium">{catalog.name}</td><td className="p-3 capitalize">{catalog.segment}</td><td className="p-3 text-gray-500">{formatDate(catalog.updatedAt)}</td><td className="p-3">{catalog.productCount}</td><td className="p-3"><span className="rounded-full bg-fuchsia-50 px-2 py-1 text-xs text-fuchsia-800">{catalog.status}</span></td><td className="p-3"><div className="flex justify-end gap-1"><button type="button" disabled={busyId === catalog.id} onClick={() => void openCatalog(catalog)} className="rounded p-2 hover:bg-gray-100 disabled:opacity-40" title="Abrir y editar"><Edit3 size={17} /></button><button type="button" disabled={busyId === catalog.id} onClick={() => void duplicate(catalog)} className="rounded p-2 hover:bg-gray-100 disabled:opacity-40" title="Duplicar"><Copy size={17} /></button><button type="button" disabled={busyId === catalog.id} onClick={() => void openCatalog(catalog)} className="rounded p-2 text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-40" title="Generar PDF"><Download size={17} /></button></div></td></tr>)}</tbody></table>}
      </section>

      <PriceListModal open={editorOpen} onClose={() => { setEditorOpen(false); setCurrent(null); }} initialCatalog={current} onSave={persistenceReady ? persist : undefined} />
    </div>
  );
}
