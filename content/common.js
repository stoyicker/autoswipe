/**
 * AutoSwipeEngine — shared auto-swipe logic used by all platform scripts.
 * Sends trusted key inputs via the background service worker + chrome.debugger.
 *
 * State: content script owns `running`. Popup queries via GET_STATUS.
 */
class AutoSwipeEngine {
  constructor(config) {
    this.config = config;
    this.running = false;
    this.timeout = null;
    this.minDelay = 1000;
    this.maxDelay = 3000;
    this.tickId = 0;

    this._initMessageListener();
    this._loadSettings();
    this._initUnloadListener();
    this._checkAutoResume();
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
    } catch {}
  }

  _initMessageListener() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      switch (msg.type) {
        case 'START_SWIPING':
          this.start();
          sendResponse({ ok: true });
          return false;
        case 'STOP_SWIPING':
          this.stop();
          sendResponse({ ok: true });
          return false;
        case 'GET_STATUS':
          sendResponse({ running: this.running, platform: this.config.platformId });
          return false;
        case 'SETTINGS_UPDATED':
          if (msg.settings) {
            if (msg.settings.minDelay) this.minDelay = msg.settings.minDelay;
            if (msg.settings.maxDelay) this.maxDelay = msg.settings.maxDelay;
          }
          sendResponse({ ok: true });
          return false;
        default:
          return false;
      }
    });
  }

  _initUnloadListener() {
    window.addEventListener('beforeunload', () => {
      if (this.running && !this._resumeAfterReload) this.stop();
    });
  }

  scheduleReload() {
    this._resumeAfterReload = true;
    sessionStorage.setItem('autoswipe_resume', this.config.platformId);
    window.location.reload();
  }

  _checkAutoResume() {
    const resume = sessionStorage.getItem('autoswipe_resume');
    if (resume === this.config.platformId) {
      sessionStorage.removeItem('autoswipe_resume');
      this.start();
    }
  }

  start() {
    if (this.running) return;
    console.log(`[AS:${this.config.platformId}] started`);
    this.running = true;
    this.tickId++;
    this._tick(this.tickId);
  }

  stop() {
    if (!this.running) return;
    console.log(`[AS:${this.config.platformId}] stopped`);
    this.running = false;
    this.tickId++;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this._isContextValid()) {
      chrome.runtime.sendMessage({ type: 'DETACH_DEBUGGER' }).catch(() => {});
    }
  }

  async _tick(myTickId) {
    if (myTickId !== this.tickId || !this.running) return;
    if (!this._isContextValid()) {
      this.stop();
      return;
    }

    try {
      await this._performSwipe(myTickId);
    } catch (e) {
      console.log('[AutoSwipe] _performSwipe error:', e.message);
    }

    if (!this.running || myTickId !== this.tickId) return;

    // Check right after swipe (with a brief pause for the UI to update)
    if (this.config.afterSwipe) {
      await new Promise((r) => setTimeout(r, 500));
      const result = await this.config.afterSwipe();
      if (result === false) {
        this.stop();
        if (this._isContextValid()) {
          chrome.runtime.sendMessage({ type: 'ENGINE_STOPPED' }).catch(() => {});
        }
        return;
      }
    }

    if (!this.running || myTickId !== this.tickId) return;

    const delay = this._randomDelay();
    this.timeout = setTimeout(() => this._tick(myTickId), delay);
  }

  async _performSwipe(myTickId) {
    if (this.config.beforeSwipe) {
      const result = await this.config.beforeSwipe();
      if (result === false) {
        this.stop();
        if (this._isContextValid()) {
          chrome.runtime.sendMessage({ type: 'ENGINE_STOPPED' }).catch(() => {});
        }
        return;
      }
      if (result === 'skip') return;
    }

    if (!this.running || myTickId !== this.tickId) return;

    if (this.config.focusSelector) {
      try {
        await chrome.runtime.sendMessage({ type: 'CLICK_ELEMENT', selector: this.config.focusSelector });
      } catch {}
    }

    const key = this.config.key || 'ArrowRight';
    console.log(`[AS:${this.config.platformId}] sending key: ${key}`);
    try {
      const result = await chrome.runtime.sendMessage({ type: 'SEND_KEY', key });
      console.log(`[AS:${this.config.platformId}] SEND_KEY result:`, result);
    } catch (e) {
      console.log(`[AS:${this.config.platformId}] SEND_KEY error:`, e.message);
    }
  }

  _randomDelay() {
    return this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
  }
}
