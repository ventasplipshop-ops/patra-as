import { useState, useCallback } from "react";
import { performAction } from "../actions/performAction";
import type { ActionName, ActionArgs, ActionResult } from "../actions/types";

export function useAction<K extends ActionName>(action: K) {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<unknown>(null);

  const trigger = useCallback(async (args: ActionArgs<K>) => {
    try {
      setLoading(true);
      setError(null);
      const res = await performAction(action, args);
      return res as ActionResult<K>;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [action]);

  return { trigger, loading, error };
}
