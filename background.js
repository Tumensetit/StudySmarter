let currentTabId = null;
let currentDomain = null;
let startTime = null;
let usageLog = {};
let notificationShown = {};

function checkUsageLimits() {
  const now = Date.now();

  for (const [domain, time] of Object.entries(usageLog)) {
    const minutes = time / 60000;

    if (minutes >= 1 && !notificationShown[domain]) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "bell.png",
        title: "Time limit reached",
        message: "You've spent 5 minutes in this site",
        priority: 2,
      });

      notificationShown[domain] = true;
    }
  }
}

setInterval(checkUsageLimits, 10 * 1000);

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getUsageData") {
    sendResponse({ usageLog });
  }
});
