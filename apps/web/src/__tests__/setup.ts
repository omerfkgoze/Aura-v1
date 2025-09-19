import '@testing-library/jest-dom';

// Mock window.matchMedia for responsive hook tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Next.js router for tests that need it
const mockRouter = {
  push: () => {},
  replace: () => {},
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  isReady: true,
};

// Vitest globals
declare global {
  // eslint-disable-next-line no-var
  var vi: any;
}

// Vitest global mock
if (typeof vi !== 'undefined') {
  vi.mock('next/router', () => ({
    useRouter: () => mockRouter,
  }));
}
