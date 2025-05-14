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
        iconUrl: chrome.runtime.getURL("assets/bell.png"),
        title: "Time limit reached",
        message: `You've spent ${Math.round(minutes)} minutes on ${domain}.`,
        priority: 2,
      });

      notificationShown[domain] = true;
    }
  }
}

setInterval(checkUsageLimits, 1 * 1000);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getUsageData") {
    sendResponse({ usageLog });
  }
});
