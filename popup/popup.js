const SITES = {
  tinder: { name: 'Tinder', icon: '\u{1F525}', pattern: 'tinder.com' },
  bumble: { name: 'Bumble', icon: '\u{1F41D}', pattern: 'bumble.com' },
  badoo:  { name: 'Badoo',  icon: '\u{1F49C}', pattern: 'badoo.com' },
  boo:    { name: 'Boo',    icon: '\u{1F47B}', pattern: 'boo.world' },
};

let currentPlatform = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Detect which site the active tab is on
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  for (const [id, site] of Object.entries(SITES)) {
    if (url.includes(site.pattern)) {
      currentPlatform = id;
      break;
    }
  }

  if (currentPlatform) {
    showActiveView(currentPlatform, tab.id);
  } else {
    document.getElementById('inactiveView').classList.remove('hidden');
  }
});

async function showActiveView(platformId, tabId) {
  const site = SITES[platformId];
  const view = document.getElementById('activeView');
  view.classList.remove('hidden');

  document.getElementById('siteIcon').textContent = site.icon;
  document.getElementById('siteName').textContent = site.name;

  // Load settings
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  if (state?.settings) {
    document.getElementById('minDelay').value = state.settings.minDelay;
    document.getElementById('maxDelay').value = state.settings.maxDelay;
    document.getElementById('minDelayVal').textContent =
      (state.settings.minDelay / 1000).toFixed(1) + 's';
    document.getElementById('maxDelayVal').textContent =
      (state.settings.maxDelay / 1000).toFixed(1) + 's';
  }

  // Get current status from content script
  try {
    const status = await chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' });
    if (status) {
      updateRunningUI(status.running);
    }
  } catch {
    // Content script not ready yet
  }

  // Start / Stop
  document.getElementById('toggleBtn').addEventListener('click', async () => {
    const btn = document.getElementById('toggleBtn');
    const isRunning = btn.dataset.running === 'true';
    const msgType = isRunning ? 'STOP_SWIPING' : 'START_SWIPING';

    try {
      await chrome.tabs.sendMessage(tabId, { type: msgType });
      // Ask the content script for actual state instead of assuming
      const status = await chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' });
      updateRunningUI(status?.running ?? !isRunning);
    } catch {
      // Content script not available
    }
  });

  // Sliders
  setupSlider('minDelay');
  setupSlider('maxDelay');

  // Listen for engine auto-stop (e.g. upsell popup detected)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ENGINE_STOPPED') {
      updateRunningUI(false);
    }
  });
}

function updateRunningUI(running) {
  const btn = document.getElementById('toggleBtn');
  const status = document.getElementById('siteStatus');
  if (!btn || !status) return;

  btn.dataset.running = String(running);
  btn.textContent = running ? 'Stop Swiping' : 'Start Swiping';
  btn.classList.toggle('active', running);
  status.textContent = running ? 'Running' : 'Idle';
  status.classList.toggle('running', running);
}

function setupSlider(id) {
  const slider = document.getElementById(id);
  const display = document.getElementById(id + 'Val');

  slider.addEventListener('input', () => {
    display.textContent = (slider.value / 1000).toFixed(1) + 's';
  });

  slider.addEventListener('change', () => {
    const minVal = parseInt(document.getElementById('minDelay').value);
    const maxVal = parseInt(document.getElementById('maxDelay').value);

    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: {
        minDelay: Math.min(minVal, maxVal),
        maxDelay: Math.max(minVal, maxVal),
      },
    });
  });
}
