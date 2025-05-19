document.addEventListener("DOMContentLoaded", () => {
  const usageList = document.getElementById("usageList");

  chrome.runtime.sendMessage({ type: "getUsageData" }, (response) => {
    const data = response.usageLog || {};
    const topSites = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .splice(0, 10);

    for (const [domain, ms] of topSites) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="domain">${domain}</span><span class="time">${formatTime(
        ms
      )}</span>`;
      usageList.appendChild(li);
    }
  });

  function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "resetTracking" }, () => {
    location.reload();
  });
});
