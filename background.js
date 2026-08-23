chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-as-markdown",
    title: "Copy as Markdown",
    contexts: ["all"],
    documentUrlPatterns: ["<all_urls>"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "copy-as-markdown") return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyElementAsMarkdown
  });
});

function copyElementAsMarkdown() {
  const selection = window.getSelection();
  let targetEl = null;

  if (selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    targetEl = range.commonAncestorContainer;
    if (targetEl.nodeType === Node.TEXT_NODE) targetEl = targetEl.parentElement;
  } else {
    const elements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    targetEl = elements.find(el => el !== document.body && el !== document.documentElement) || document.body;
  }

  if (!targetEl) return;

  const markdown = elementToMarkdown(targetEl);
  navigator.clipboard.writeText(markdown).then(() => {
    showToast("Copied as Markdown!");
  }).catch(() => {
    fallbackCopy(markdown);
  });
}

function elementToMarkdown(el, depth = 0) {
  if (!el) return "";
  if (el.nodeType === Node.TEXT_NODE) {
    const text = el.textContent.trim();
    return text ? text.replace(/\n+/g, " ") : "";
  }
  if (el.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = el.tagName.toLowerCase();
  const style = window.getComputedStyle(el);

  if (["script", "style", "noscript", "iframe", "svg", "canvas"].includes(tag)) return "";
  if (style.display === "none" || style.visibility === "hidden") return "";

  const attrs = {};
  if (el.id) attrs.id = el.id;
  if (el.className) attrs.class = el.className.trim().split(/\s+/).join(" ");
  if (el.href) attrs.href = el.href;
  if (el.src) attrs.src = el.src;
  if (el.alt) attrs.alt = el.alt;
  if (el.title) attrs.title = el.title;

  const children = Array.from(el.childNodes).map(child => elementToMarkdown(child, depth + 1)).join("").trim();
  if (!children && !["img", "br", "hr", "input"].includes(tag)) return "";

  switch (tag) {
    case "h1": return `${"#".repeat(depth + 1)} ${children}\n\n`;
    case "h2": return `${"#".repeat(depth + 2)} ${children}\n\n`;
    case "h3": return `${"#".repeat(depth + 3)} ${children}\n\n`;
    case "h4": return `${"#".repeat(depth + 4)} ${children}\n\n`;
    case "h5": return `${"#".repeat(depth + 5)} ${children}\n\n`;
    case "h6": return `${"#".repeat(depth + 6)} ${children}\n\n`;
    case "p": return children ? `${children}\n\n` : "";
    case "br": return "\n";
    case "hr": return "\n---\n\n";
    case "a": return attrs.href ? `[${children}](${attrs.href})` : children;
    case "img": return attrs.src ? `![${attrs.alt || ""}](${attrs.src})` : "";
    case "strong": case "b": return children ? `**${children}**` : "";
    case "em": case "i": return children ? `*${children}*` : "";
    case "code": return children ? `\`${children}\`` : "";
    case "pre": return children ? `\n\`\`\`\n${children}\n\`\`\`\n\n` : "";
    case "blockquote": return children ? `> ${children.split("\n").join("\n> ")}\n\n` : "";
    case "ul": return children ? children.split("\n").map(l => l.trim() ? `- ${l}` : "").join("\n") + "\n\n" : "";
    case "ol": return children ? children.split("\n").map((l, i) => l.trim() ? `${i + 1}. ${l}` : "").join("\n") + "\n\n" : "";
    case "li": return children ? `- ${children}` : "";
    case "table": return children ? `${children}\n\n` : "";
    case "thead": return children ? `${children}\n|${"---|".repeat(countCols(el))}\n` : "";
    case "tbody": return children ? children : "";
    case "tr": return children ? `| ${children.split("\n").map(c => c.trim()).join(" | ")} |\n` : "";
    case "th": return children ? `**${children}**` : "";
    case "td": return children || " ";
    default: return children;
  }
}

function countCols(table) {
  const firstRow = table.querySelector("tr");
  return firstRow ? firstRow.querySelectorAll("th, td").length : 0;
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  showToast("Copied (fallback)!");
}

function showToast(message) {
  const existing = document.getElementById("cam-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "cam-toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
    background: #1e293b; color: #e2e8f0; padding: 12px 20px;
    border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,.4);
    font: 14px system-ui; animation: slideIn 0.2s ease;
  `;
  const style = document.createElement("style");
  style.textContent = "@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }";
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = "slideIn 0.2s ease reverse"; setTimeout(() => toast.remove(), 200); }, 2000);
}