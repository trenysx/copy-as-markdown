document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("testCopy").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const text = container.textContent?.trim() || "";
          if (text) navigator.clipboard.writeText(text);
        }
      }
    });
  });
});

chrome.storage.sync.get(["shortcutEnabled"], result => {
  if (result.shortcutEnabled === false) {
    document.querySelector(".shortcuts div:last-child").style.display = "none";
  }
});