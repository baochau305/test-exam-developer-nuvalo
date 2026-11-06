// JSDOM does not implement ResizeObserver, which Vuetify's layout components rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// Used by Vuetify overlays (v-menu, v-dialog) to position their content
globalThis.visualViewport ??= {
  width: 1024,
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  addEventListener() {},
  removeEventListener() {},
} as unknown as VisualViewport
