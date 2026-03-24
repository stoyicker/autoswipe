/**
 * AutoSwipeEngine — shared auto-swipe logic used by all platform scripts.
 * Sends trusted key inputs via the background service worker + chrome.debugger.
 */
class AutoSwipeEngine {
  constructor(config) {
    this.config = config; // { platformId, key, beforeSwipe? }
    this.running = false;
    this.timeout = null;
    this.minDelay = 1000;
    this.maxDelay = 3000;

    this._initMessageListener();
    this._loadSettings();
    console.log(`[AutoSwipe] ${config.platformId} content script loaded`);
  }

  _isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  async _loadSettings() {
    if (!this._isContextValid()) return;
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
          const settings = result.settings || {};
          if (settings.minDelay) this.minDelay = settings.minDelay;
          if (settings.maxDelay) this.maxDelay = settings.maxDelay;
          resolve();
        });
      });
    } catch {
      // Context invalidated
    }
  }

  _initMessageListener() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      switch (msg.type) {
        case 'START_SWIPING':
          this.start();
          sendResponse({ ok: true });
          break;
        case 'STOP_SWIPING':
          this.stop();
          sendResponse({ ok: true });
          break;
        case 'GET_STATUS':
          sendResponse({
            running: this.running,
            platform: this.config.platformId,
          });
          break;
        case 'SETTINGS_UPDATED':
          if (msg.settings) {
            if (msg.settings.minDelay) this.minDelay = msg.settings.minDelay;
            if (msg.settings.maxDelay) this.maxDelay = msg.settings.maxDelay;
          }
          sendResponse({ ok: true });
          break;
      }
      return true;
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._tick();
    console.log(`[AutoSwipe] ${this.config.platformId} started`);
  }

  stop() {
    this.running = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    // Detach debugger when stopping
    if (this._isContextValid()) {
      chrome.runtime.sendMessage({ type: 'DETACH_DEBUGGER' }).catch(() => {});
    }
    console.log(`[AutoSwipe] ${this.config.platformId} stopped`);
  }

  _tick() {
    if (!this.running) return;

    if (!this._isContextValid()) {
      this.stop();
      return;
    }

    this._performSwipe();

    const delay = this._randomDelay();
    this.timeout = setTimeout(() => this._tick(), delay);
  }

  async _performSwipe() {
    // Let platform script block the swipe
    if (this.config.beforeSwipe) {
      const result = this.config.beforeSwipe();
      if (result === false) {
        this.stop();
        // Notify popup so it updates the button
        if (this._isContextValid()) {
          chrome.runtime.sendMessage({ type: 'ENGINE_STOPPED' }).catch(() => {});
        }
        return;
      }
    }

    const key = this.config.key || 'ArrowRight';

    try {
      const result = await chrome.runtime.sendMessage({ type: 'SEND_KEY', key });
      if (result?.ok) {
        console.log(`[AutoSwipe] ${this.config.platformId} — sent ${key}`);
      } else {
        console.log(`[AutoSwipe] ${this.config.platformId} — key send failed:`, result?.error);
      }
    } catch (e) {
      console.log(`[AutoSwipe] ${this.config.platformId} — error:`, e.message);
    }
  }

  _randomDelay() {
    return this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
  }
}
