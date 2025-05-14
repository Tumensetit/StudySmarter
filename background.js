let currentTabId = null;
let currentDomain = null;
let startTime = null;
let usageLog = {};
let notificationShown = {};
let activateStartTime = Date.now();

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      callback(tabs[0]);
    }
  });
}

setInterval(() => {
  getActiveTab((tab) => {
    if (!tab.url || !tab.id) {
      return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname;

    const now = Date.now();

    if (tab.id === currentTabId && domain === currentDomain) {
      const elapsed = now - activateStartTime;
      usageLog[domain] = (usageLog[domain] || 0) + elapsed;
      activateStartTime = now;
    } else {
      if (currentDomain) {
        const elapsed = now - activateStartTime;
        usageLog[currentDomain] = (usageLog[currentDomain] || 0) + elapsed;
      }

      currentDomain = domain;
      currentTabId = tab.id;
      activateStartTime = now;
    }
  });
}, 1000);

function checkUsageLimits() {
  for (const [domain, time] of Object.entries(usageLog)) {
    const minutes = time / 60000;

    if (minutes >= 30 && !notificationShown[domain]) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "bell.png",
        title: "Time limit reached",
        message: `You've spent ${Math.round(minutes)} minutes on ${domain}.`,
        priority: 2,
      });

      notificationShown[domain] = true;
    }
  }
}

setInterval(checkUsageLimits, 1 * 1000);

/*

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

function switchToTab(tab) {
  const now = Date.now();

  if (currentDomain && startTime) {
    const duration = now - startTime;
    usageLog[currentDomain] = (usageLog[currentDomain] || 0) + duration;
    console.log(`Spent ${duration / 1000}s on ${currentDomain}`);
  }

  currentDomain = getDomain(tab.url);
  startTime = now;
  currentTabId = tab.id;
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  switchToTab(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    switchToTab(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    switchToTab({ url: "", id: null });
  } else {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) switchToTab(tab);
  }
});

*/

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getUsageData") {
    sendResponse({ usageLog });
  }
});
