import '@testing-library/jest-dom/vitest';

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = StubResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = StubIntersectionObserver;
}

if (globalThis.Element && !globalThis.Element.prototype.getAnimations) {
  globalThis.Element.prototype.getAnimations = () => [];
}
