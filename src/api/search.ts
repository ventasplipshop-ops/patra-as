// src/api/search.ts
import { supabase } from "../lib/supabase";

export type SearchField = string; // ej: "sku", "nombre", "caracteristicas->>marca"

export interface SearchResource {
  table: string;
  fields: SearchField[];
  select?: string;
  where?: Record<string, string | number | boolean | null>;
  gt?:    Partial<Record<string, number | string>>;
  gte?:   Partial<Record<string, number | string>>;
  lt?:    Partial<Record<string, number | string>>;
  lte?:   Partial<Record<string, number | string>>;
  neq?:   Partial<Record<string, number | string | boolean | null>>;
  like?:  Partial<Record<string, string>>;   // "foo%"
  ilike?: Partial<Record<string, string>>;   // "%foo%"
  limit?: number;
  tag?: string;
}


export interface SearchOptions {
  mode?: "or" | "and";
  caseInsensitive?: boolean;
  limitPerResource?: number;
  orderBy?: { column: string; ascending?: boolean }; // para ordenar resultados
}

export interface SearchResult<T = Record<string, any>> {
  table: string;
  tag?: string;
  rows: T[];
  error?: string;
}


function sanitizeIlike(input: string) {
  return input.replace(/[%]/g, "").trim();
}

function buildOrIlike(fields: string[], q: string) {
  const val = sanitizeIlike(q);
  return fields.map((f) => `${f}.ilike.%${val}%`).join(",");
}

export async function searchMulti(
  query: string,
  resources: SearchResource[],
  opts: SearchOptions = {}
): Promise<SearchResult[]> {
  const q = query.trim();
  const results: SearchResult[] = [];
  if (!q) {
    for (const res of resources) {
      const select = res.select ?? "*";
      const limit = res.limit ?? opts.limitPerResource ?? 10;

      let req = supabase.from(res.table).select(select).limit(limit);

      const { data, error } = await req;
      results.push({ table: res.table, tag: res.tag, rows: data ?? [], error: error?.message });
    }
    return results;
  }

  for (const res of resources) {
    const select = res.select ?? "*";
    const limit = res.limit ?? opts.limitPerResource ?? 10;

    let req = supabase.from(res.table).select(select).limit(limit);

    // =========== filtros de igualdad ===========
    if (res.where) {
      for (const [k, v] of Object.entries(res.where)) {
        req = req.eq(k, v as any);
      }
    }

    // =========== operadores extendidos ===========
    const applyOps = <T extends Record<string, any>>(
      obj: T | undefined,
      fn: (col: string, val: any) => typeof req
    ) => {
      if (!obj) return;
      for (const [k, v] of Object.entries(obj)) {
        req = fn(k, v);
      }
    };

    applyOps(res.gt,    (c, v) => req.gt(c, v));
    applyOps(res.gte,   (c, v) => req.gte(c, v));
    applyOps(res.lt,    (c, v) => req.lt(c, v));
    applyOps(res.lte,   (c, v) => req.lte(c, v));
    applyOps(res.neq,   (c, v) => req.neq(c, v));
    applyOps(res.like,  (c, v) => req.like(c, String(v)));
    applyOps(res.ilike, (c, v) => req.ilike(c, String(v)));

    // =========== búsqueda OR en múltiples campos ===========
    if (res.fields && res.fields.length > 0) {
      const orExpr = buildOrIlike(res.fields, q);
      req = req.or(orExpr);
    }

    const { data, error } = await req;
    if (error) {
      results.push({ table: res.table, tag: res.tag, rows: [], error: error.message });
    } else {
      results.push({ table: res.table, tag: res.tag, rows: data ?? [] });
    }
  }

  return results;
}
