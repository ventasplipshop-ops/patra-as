import { ACTIONS } from "./registry";
import type { ActionName, ActionArgs, ActionResult, ActionBaseResult } from "./types";

export async function performAction<A extends ActionName>(
  action: A,
  args?: ActionArgs<A>
): Promise<ActionResult<A>> {
  try {
    const handler = ACTIONS[action];
    if (!handler) {
      throw new Error(`Acción no registrada: ${action}`);
    }

    const result = (await handler(args as ActionArgs<A>)) as ActionResult<A> & ActionBaseResult;

    if (!result.ok) {
      console.error(`❌ Acción "${action}" falló:`, result);
    } else {
      console.log(`✅ Acción "${action}" ejecutada:`, result);
    }

    return result;
  } catch (error) {
    console.error(`❌ Error crítico ejecutando "${action}":`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido en acción",
    } as ActionResult<A>;
  }
}
