let currentTabId = null;
let currentDomain = null;
let usageLog = {};
let notificationShown = {};
let activateStartTime = Date.now();

let domainSamples = {};
let notifiedThresholds = {};
let lastNotifiedDomain = null;

const thresholds = [
  { minutes: 30, window: 45 },
  { minutes: 45, window: 60 },
  { minutes: 60, window: 75 },
  { minutes: 90, window: 120 },
];

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
      if (!domainSamples[domain]) domainSamples[domain] = [];

      domainSamples[domain].push({
        time: elapsed,
        timestamp: now,
      });
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
  const now = Date.now();

  for (const [domain, samples] of Object.entries(domainSamples)) {
    if (!notifiedThresholds[domain]) notifiedThresholds[domain] = [];

    for (const { minutes: threshold, window } of thresholds) {
      const windowStart = now - window * 60000;

      const recentSamples = samples.filter((s) => s.timestamp >= windowStart);
      const totalInWindow = recentSamples.reduce((sum, s) => sum + s.time, 0);
      const totalMinutes = totalInWindow / 60000;

      if (
        totalMinutes >= threshold &&
        !notifiedThresholds[domain].includes(threshold)
      ) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("assets/bell.png"),
          title: "Time limit reached",
          message: `You've spent ${threshold} minutes on ${domain} in the last ${window} minutes.`,
          priority: 2,
        });

        notifiedThresholds[domain].push(threshold);

        if (lastNotifiedDomain && lastNotifiedDomain !== domain) {
          notifiedThresholds[lastNotifiedDomain] = [];
        }

        lastNotifiedDomain = domain;
        break;
      }
    }
  }
}

setInterval(checkUsageLimits, 1 * 1000);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getUsageData") {
    sendResponse({ usageLog });
  } else if (message.type === "resetTracking") {
    usageLog = {};
    notificationShown = {};
    domainSamples = {};
    notifiedThresholds = {};
    lastNotifiedDomain = null;
    sendResponse({ success: true });
  }
});
