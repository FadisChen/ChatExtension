// 在文件開頭添加這個函數
function stripHtmlTags(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

let captureMode = false;
let originalStyles = new Map();
let captureType = "normal";

// 新增取消擷取函數
function cancelCapture() {
    captureMode = false;
    document.body.style.cursor = 'default';
    restoreAllElements();
    
    // 移除取消按鈕
    const cancelButtons = document.querySelectorAll('button');
    cancelButtons.forEach(button => {
        if (button.textContent === '取消擷取') {
            document.body.removeChild(button);
        }
    });
    
    chrome.runtime.sendMessage({action: "captureCancelled"});
}

// 新增創建取消按鈕的函數
function createCancelButton() {
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消擷取';
    cancelButton.setAttribute('data-capture-ui', 'true');
    cancelButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: background-color 0.2s, box-shadow 0.2s;
    `;

    cancelButton.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#d32f2f';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });

    cancelButton.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#f44336';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    });

    cancelButton.addEventListener('click', cancelCapture);
    document.body.appendChild(cancelButton);
    return cancelButton;
}

// 事件監聽器
document.addEventListener('mouseover', function(e) {
    if (captureMode) {
        highlightElement(e.target);
    }
});

document.addEventListener('mouseout', function(e) {
    if (captureMode) {
        restoreElement(e.target);
    }
});

document.addEventListener('click', function(e) {
    if (captureMode) {
        if (e.target.textContent === '取消擷取') {
            return;
        }
        
        e.preventDefault();
        let content = e.target.innerText;
        
        // 根據不同的擷取模式發送不同的消息
        if (captureType === "rag") {
            chrome.runtime.sendMessage({
                action: "ragContentCaptured",
                content: content
            });
        } else {
            chrome.storage.local.set({capturedContent: content}, function() {
                chrome.runtime.sendMessage({action: "contentCaptured"});
            });
        }
        
        captureMode = false;
        document.body.style.cursor = 'default';
        restoreAllElements();
        
        // 移除取消按鈕
        const cancelButtons = document.querySelectorAll('button');
        cancelButtons.forEach(button => {
            if (button.textContent === '取消擷取') {
                document.body.removeChild(button);
            }
        });
    }
});

// 元素樣式處理函數
function highlightElement(element) {
    if (element.getAttribute('data-capture-ui') === 'true') {
        return;
    }

    if (!originalStyles.has(element)) {
        originalStyles.set(element, element.style.cssText || '');
        element.style.outline = '2px solid #4CAF50';
        element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    }
}

function restoreElement(element) {
    if (originalStyles.has(element)) {
        element.style.cssText = originalStyles.get(element);
        originalStyles.delete(element);
    }
}

function restoreAllElements() {
    originalStyles.forEach((originalStyle, element) => {
        if (element && document.body.contains(element)) {
            element.style.cssText = originalStyle;
        }
    });
    originalStyles.clear();
}

// 消息監聽器
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    (async () => {
        try {
            if (request.action === "startRAGCapture") {
                captureMode = true;
                captureType = "rag";
                document.body.style.cursor = 'pointer';
                
                let notification = document.createElement('div');
                notification.textContent = '請點擊要向量化的內容';
                notification.setAttribute('data-capture-ui', 'true');
                notification.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #4CAF50;
                    color: white;
                    padding: 10px;
                    border-radius: 4px;
                    z-index: 10000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    pointer-events: none;
                    user-select: none;
                    -webkit-user-select: none;
                `;
                document.body.appendChild(notification);
                
                const cancelBtn = createCancelButton();
                
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 5000);
                sendResponse({ status: 'success' });
            } else if (request.action === "startCapture" || request.action === "startChatCapture") {
                captureMode = true;
                captureType = request.action === "startChatCapture" ? "chat" : "normal";
                document.body.style.cursor = 'pointer';
                
                let notification = document.createElement('div');
                notification.textContent = '請點擊要擷取的內容';
                notification.setAttribute('data-capture-ui', 'true');
                notification.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #4CAF50;
                    color: white;
                    padding: 10px;
                    border-radius: 4px;
                    z-index: 10000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    pointer-events: none;
                `;
                document.body.appendChild(notification);
                
                const cancelBtn = createCancelButton();
                
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 5000);
                sendResponse({ status: 'success' });
            }
        } catch (error) {
            sendResponse({ status: 'error', error: error.message });
        }
    })();
    return true;  // 保留 return true 表示我們會異步發送回應
}); 