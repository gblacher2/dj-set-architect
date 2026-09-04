import '@testing-library/jest-dom';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;
if (typeof window.confirm !== 'function') {
  window.confirm = () => true;
} else {
  // Default window.confirm to return true in test environment unless overridden
  const originalConfirm = window.confirm;
  window.confirm = (message?: string) => {
    try {
      return originalConfirm(message);
    } catch {
      return true;
    }
  };
}
