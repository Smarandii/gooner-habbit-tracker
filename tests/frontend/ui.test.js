import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock state.js
vi.mock('../../js/state.js', () => ({
  userProfile: {
    geminiApiKey: null,
  },
  habits: [],
  // Mock other exports from state.js if they are used by ui.js indirectly
}));

// Mock domElements from ui.js
// We need to mock the actual ui.js to control its internal domElements
// This is a bit tricky as we are testing functions from the module we are partially mocking.
// The functions themselves (showToast, etc.) will be the real ones unless we explicitly mock them here.

// Temporary placeholder for domElements that will be properly mocked inside tests or beforeEach
let mockDomElements;

vi.mock('../../js/ui.js', async (importOriginal) => {
  const originalModule = await importOriginal();
  return {
    ...originalModule, // Import all original functions
    // Overwrite domElements with our mock
    // This getter allows us to change mockDomElements dynamically in tests
    get domElements() {
      return mockDomElements;
    },
  };
});

// Now, import the functions to be tested AFTER the mocks are set up
import { showToast, promptForApiKeyModal, closeApiKeyModal } from '../../js/ui.js';


describe('js/ui.js', () => {
  beforeEach(() => {
    // Reset and re-initialize domElements for each test
    mockDomElements = {
      toastNotificationEl: { textContent: '', className: '', style: { backgroundColor: '' } },
      apiKeyModalEl: { style: { display: 'none' } },
      // Add other elements if ui.js functions interact with them
    };
    // Reset mocks if necessary, e.g., vi.clearAllMocks() if using spies on imported functions
  });

  afterEach(() => {
    vi.useRealTimers(); // Clean up timers if any were mocked with vi.useFakeTimers()
  });

  describe('showToast', () => {
    it('should add "show" class and set message to toast element', () => {
      showToast('Test message');
      expect(mockDomElements.toastNotificationEl.className).toContain('show');
      expect(mockDomElements.toastNotificationEl.textContent).toBe('Test message');
    });

    it('should set background color to green for "success" type', () => {
      showToast('Success!', 'success');
      expect(mockDomElements.toastNotificationEl.style.backgroundColor).toBe('green');
    });

    it('should set background color to red for "error" type', () => {
      showToast('An error occurred', 'error');
      expect(mockDomElements.toastNotificationEl.style.backgroundColor).toBe('red');
    });

    it('should set default background color for other types', () => {
      showToast('Info message', 'info');
      expect(mockDomElements.toastNotificationEl.style.backgroundColor).toBe('gray'); // Assuming gray is default
    });

    it('should remove "show" class after 3 seconds', () => {
      vi.useFakeTimers();
      showToast('Temporary message');
      expect(mockDomElements.toastNotificationEl.className).toContain('show');
      vi.advanceTimersByTime(3000);
      expect(mockDomElements.toastNotificationEl.className).not.toContain('show');
      vi.useRealTimers();
    });
  });

  describe('promptForApiKeyModal', () => {
    // Import userProfile directly to modify it for tests
    const state = vi.mocked(await import('../../js/state.js'));

    beforeEach(() => {
      // Reset API key before each test in this describe block
      state.userProfile.geminiApiKey = null;
      mockDomElements.apiKeyModalEl.style.display = 'none'; // Ensure modal is hidden initially
    });

    it('should display modal if API key is missing', ()_ => {
      promptForApiKeyModal();
      expect(mockDomElements.apiKeyModalEl.style.display).toBe('flex');
    });

    it('should display modal if forceShow is true, even with API key', () => {
      state.userProfile.geminiApiKey = 'test-api-key';
      promptForApiKeyModal(true);
      expect(mockDomElements.apiKeyModalEl.style.display).toBe('flex');
    });

    it('should NOT display modal if API key exists and forceShow is false', () => {
      state.userProfile.geminiApiKey = 'test-api-key';
      promptForApiKeyModal(false);
      expect(mockDomElements.apiKeyModalEl.style.display).toBe('none');
    });

    it('should NOT display modal if API key exists and forceShow is not provided (defaults to false)', () => {
      state.userProfile.geminiApiKey = 'test-api-key';
      promptForApiKeyModal();
      expect(mockDomElements.apiKeyModalEl.style.display).toBe('none');
    });
  });

  describe('closeApiKeyModal', () => {
    it('should set apiKeyModal display to "none"', () => {
      // First, show the modal to ensure the test is meaningful
      mockDomElements.apiKeyModalEl.style.display = 'flex';
      closeApiKeyModal();
      expect(mockDomElements.apiKeyModalEl.style.display).toBe('none');
    });
  });
});
