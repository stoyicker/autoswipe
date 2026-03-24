/**
 * Background service worker — settings persistence, message routing,
 * and trusted key input via chrome.debugger.
 */

let state = {
  settings: {
    minDelay: 1000,
    maxDelay: 3000,
  },
};

// Track which tabs have debugger attached
const attachedTabs = new Set();

// Restore persisted settings on wake
chrome.storage.local.get(['settings'], (result) => {
  if (result.settings) state.settings = result.settings;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_STATE':
      sendResponse(state);
      break;

    case 'UPDATE_SETTINGS':
      state.settings = { ...state.settings, ...msg.settings };
      chrome.storage.local.set({ settings: state.settings });
      broadcastToContentScripts({ type: 'SETTINGS_UPDATED', settings: state.settings });
      sendResponse({ ok: true });
      break;

    case 'SEND_KEY':
      handleSendKey(msg, sender).then(
        (result) => sendResponse(result),
        (err) => sendResponse({ ok: false, error: err.message })
      );
      return true; // async response

    case 'DETACH_DEBUGGER':
      if (sender.tab?.id && attachedTabs.has(sender.tab.id)) {
        chrome.debugger.detach({ tabId: sender.tab.id }).catch(() => {});
        attachedTabs.delete(sender.tab.id);
      }
      sendResponse({ ok: true });
      break;
  }

  return true;
});

async function handleSendKey(msg, sender) {
  const tabId = sender.tab?.id;
  if (!tabId) return { ok: false, error: 'No tab' };

  const key = msg.key || 'ArrowRight';

  // Attach debugger if not already attached
  if (!attachedTabs.has(tabId)) {
    await chrome.debugger.attach({ tabId }, '1.3');
    attachedTabs.add(tabId);
    console.log(`[AutoSwipe] Debugger attached to tab ${tabId}`);
  }

  // Send trusted keydown + keyup via Chrome DevTools Protocol
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code: key,
    windowsVirtualKeyCode: key === 'ArrowRight' ? 39 : key === 'ArrowLeft' ? 37 : 0,
    nativeVirtualKeyCode: key === 'ArrowRight' ? 39 : key === 'ArrowLeft' ? 37 : 0,
  });

  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code: key,
    windowsVirtualKeyCode: key === 'ArrowRight' ? 39 : key === 'ArrowLeft' ? 37 : 0,
    nativeVirtualKeyCode: key === 'ArrowRight' ? 39 : key === 'ArrowLeft' ? 37 : 0,
  });

  console.log(`[AutoSwipe] Sent trusted ${key} to tab ${tabId}`);
  return { ok: true };
}

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId);
});

// Clean up when debugger detaches externally
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId) attachedTabs.delete(source.tabId);
});

async function broadcastToContentScripts(msg) {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        'https://tinder.com/*',
        'https://*.tinder.com/*',
        'https://bumble.com/*',
        'https://*.bumble.com/*',
        'https://badoo.com/*',
        'https://*.badoo.com/*',
        'https://boo.world/*',
        'https://*.boo.world/*',
      ],
    });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    }
  } catch {
    // Tabs not accessible
  }
}
