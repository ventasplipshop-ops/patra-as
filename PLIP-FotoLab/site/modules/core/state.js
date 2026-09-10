(function initStateModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function createStore(initialState) {
    let state = { ...initialState };
    const listeners = new Set();

    return {
      get() {
        return state;
      },
      set(patch) {
        const nextPatch = typeof patch === "function" ? patch(state) : patch;
        state = { ...state, ...nextPatch };
        listeners.forEach((listener) => listener(state));
        return state;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  FotoLab.createStore = createStore;
})(window);
