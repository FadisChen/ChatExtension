// Initialize side panel state
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  chrome.contextMenus.create({
    id: "chatWithAI",
    title: "Chat with AI",
    contexts: ["selection"]
  });
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

// 統一的消息監聽器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 處理選取文字更新右鍵選單
    if (request.action === "updateContextMenu" && request.selectionText) {
        const truncatedText = request.selectionText.length > 20 
            ? request.selectionText.substring(0, 20) + "..." 
            : request.selectionText;
        chrome.contextMenus.update("chatWithAI", {
            title: `Chat with AI：${truncatedText}`
        }, () => {
            sendResponse({ status: 'success' });
        });
        return true;
    }

    // 處理截圖
    if (request.type === 'captureTab') {
        chrome.tabs.captureVisibleTab(null, {format: 'png'})
            .then(imageUrl => {
                sendResponse({imageUrl: imageUrl});
            })
            .catch(error => {
                console.error('Capture error:', error);
                sendResponse({error: error.message});
            });
        return true;
    } 
    // 處理擷取開始
    if (request.action === "startCapture" || request.action === "startChatCapture") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: request.action});
                sendResponse({ status: 'success' });
            }
        });
        return true;
    } 
    // 處理擷取完成
    if (request.action === "contentCaptured") {
        chrome.storage.local.set({captureStatus: "captured"}, () => {
            chrome.runtime.sendMessage({action: "reloadContent"});
            sendResponse({ status: 'success' });
        });
        return true;
    } 
    // 處理擷取取消
    if (request.action === "captureCancelled") {
        chrome.storage.local.set({captureStatus: "cancelled"}, () => {
            chrome.runtime.sendMessage({action: "captureCancelled"});
            sendResponse({ status: 'success' });
        });
        return true;
    }
    sendResponse({ status: 'ignored' });
});

// 處理右鍵選單點擊
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "chatWithAI") {
        chrome.sidePanel.open({ windowId: tab.windowId }).then(() => {
            isOpen = true;
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, {
                    action: "getSelectedText",
                    text: info.selectionText
                });
            }, 500);
        }).catch(error => {
            console.error('Error opening side panel:', error);
        });
    }
});