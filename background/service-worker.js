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
      return false;

    case 'UPDATE_SETTINGS':
      state.settings = { ...state.settings, ...msg.settings };
      chrome.storage.local.set({ settings: state.settings });
      broadcastToContentScripts({ type: 'SETTINGS_UPDATED', settings: state.settings });
      sendResponse({ ok: true });
      return false;

    case 'SEND_KEY':
      handleSendKey(msg, sender).then(
        (result) => sendResponse(result),
        (err) => sendResponse({ ok: false, error: err.message })
      );
      return true;

    case 'SEND_CLICK':
      handleSendClick(msg, sender).then(
        (result) => sendResponse(result),
        (err) => sendResponse({ ok: false, error: err.message })
      );
      return true;

    case 'CLICK_ELEMENT':
      handleClickElement(msg, sender).then(
        (result) => sendResponse(result),
        (err) => sendResponse({ ok: false, error: err.message })
      );
      return true;

    case 'DETACH_DEBUGGER':
      if (sender.tab?.id && attachedTabs.has(sender.tab.id)) {
        chrome.debugger.detach({ tabId: sender.tab.id }).catch(() => {});
        attachedTabs.delete(sender.tab.id);
      }
      sendResponse({ ok: true });
      return false;

    default:
      // Don't claim ownership of messages we don't handle (like ENGINE_STOPPED)
      // so they can reach other listeners (popup)
      return false;
  }
});

async function handleSendKey(msg, sender) {
  const tabId = sender.tab?.id;
  if (!tabId) return { ok: false, error: 'No tab' };

  const key = msg.key || 'ArrowRight';

  // Attach debugger if not already attached
  if (!attachedTabs.has(tabId)) {
    await chrome.debugger.attach({ tabId }, '1.3');
    attachedTabs.add(tabId);
  }

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

  return { ok: true };
}

async function handleSendClick(msg, sender) {
  const tabId = sender.tab?.id;
  if (!tabId) return { ok: false, error: 'No tab' };

  const { x, y } = msg;

  // Attach debugger if not already attached
  if (!attachedTabs.has(tabId)) {
    await chrome.debugger.attach({ tabId }, '1.3');
    attachedTabs.add(tabId);
  }

  // Send trusted mouse click via Chrome DevTools Protocol
  // Fire-and-forget all events with delays — some sites cause CDP commands to hang
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
  });

  chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });

  await new Promise((r) => setTimeout(r, 50));

  chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });

  return { ok: true };
}

async function handleClickElement(msg, sender) {
  const tabId = sender.tab?.id;
  if (!tabId) return { ok: false, error: 'No tab' };

  const { selector } = msg;

  if (!attachedTabs.has(tabId)) {
    await chrome.debugger.attach({ tabId }, '1.3');
    attachedTabs.add(tabId);
  }

  // Find the element and focus it via CDP
  const { root } = await chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument');
  const { nodeId } = await chrome.debugger.sendCommand({ tabId }, 'DOM.querySelector', {
    nodeId: root.nodeId,
    selector,
  });

  if (!nodeId) return { ok: false, error: 'Element not found' };

  // Get element coordinates from CDP and click them
  const { model } = await chrome.debugger.sendCommand({ tabId }, 'DOM.getBoxModel', { nodeId });
  const x = Math.round((model.content[0] + model.content[2] + model.content[4] + model.content[6]) / 4);
  const y = Math.round((model.content[1] + model.content[3] + model.content[5] + model.content[7]) / 4);

  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved', x, y,
  });

  chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1,
  });

  await new Promise((r) => setTimeout(r, 50));

  chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1,
  });

  return { ok: true };
}

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId);
});

// Clean up when debugger detaches externally (user clicked cancel on the banner)
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId) {
    attachedTabs.delete(source.tabId);
    chrome.tabs.sendMessage(source.tabId, { type: 'STOP_SWIPING' }).catch(() => {});
  }
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
