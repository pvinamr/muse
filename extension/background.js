chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "muse-save-selection",
    title: "Save selection to muse",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "muse-save-selection") return;

  const payload = {
    type: "text",
    content: info.selectionText || "",
    url: tab?.url || null,
    title: tab?.title || null
  };

  try {
    await fetch("http://127.0.0.1:8000/clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("muse POST failed:", e);
  }
});
