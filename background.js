// Initialize side panel state
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

let isOpen = false;

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!isOpen) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      isOpen = true;
    } else {
      await chrome.sidePanel.close();
      isOpen = false;
    }
  } catch (error) {
    console.error('Error toggling side panel:', error);
  }
});

// 在現有的代碼中添加以下內容
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'captureTab') {
        chrome.tabs.captureVisibleTab(null, {format: 'png'})
            .then(imageUrl => {
                sendResponse({imageUrl: imageUrl});
            })
            .catch(error => {
                console.error('Capture error:', error);
                sendResponse({error: error.message});
            });
        return true; // 保持消息通道開啟
    } else if (request.action === "startCapture" || request.action === "startChatCapture") {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {action: request.action});
          }
      });
    } else if (request.action === "contentCaptured") {
        chrome.storage.local.set({captureStatus: "captured"}, () => {
            chrome.runtime.sendMessage({action: "reloadContent"});
        });
    } else if (request.action === "captureCancelled") {
        chrome.storage.local.set({captureStatus: "cancelled"}, () => {
            chrome.runtime.sendMessage({action: "captureCancelled"});
        });
    }
    return true;
});