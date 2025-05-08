document.addEventListener('DOMContentLoaded', function () {
    const saveApiKeyButton = document.getElementById('save-api-key');
    const modelSelect = document.getElementById('model-select');
    const messageInput = document.getElementById('message-input');
    const chatHistory = document.getElementById('chat-history');
    const clearHistoryButton = document.getElementById('clear-history');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const uploadButton = document.getElementById('upload-button');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const uploadModal = document.getElementById('upload-modal');
    const screenshotBtn = document.getElementById('screenshot-btn');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const closeUploadModalBtn = uploadModal.querySelector('.close-modal');
    const cropperModal = document.getElementById('cropper-modal');
    const confirmCropBtn = document.getElementById('confirm-crop');
    const closeCropperBtn = cropperModal.querySelector('.close-modal');
    const ragButton = document.getElementById('RAG-button');
    const API_ENDPOINTS = 'https://generativelanguage.googleapis.com/v1beta/models/';
    let currentImage = null;
    let cropper = null;
    let contentChunks = null; // 用於儲存文本內容

    // 更新變數定義
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const geminiApiWrapper = document.getElementById('gemini-api-input');
    
    const logButton = document.getElementById('log-button');
    const logModal = document.getElementById('log-modal');
    const logList = document.getElementById('log-list');
    const clearLogButton = document.getElementById('clear-log');
    const closeLogModalBtn = logModal.querySelector('.close-modal');
      // 載入儲存的 API Keys
    chrome.storage.sync.get([
        'geminiApiKey'
    ], function (result) {
        if (result.geminiApiKey) {
            geminiApiKeyInput.value = result.geminiApiKey;
        }
        // 顯示 API 輸入框
        geminiApiWrapper.style.display = 'block';
    });

    // Modal functions
    function openModal() {
        settingsModal.style.display = 'block';
        // 載入已儲存的 API keys
        chrome.storage.local.get([
            'geminiApiKey'
        ], function(result) {
            if (result.geminiApiKey) {
                geminiApiKeyInput.value = result.geminiApiKey;
            }
        });
    }

    function closeModal() {
        settingsModal.style.display = 'none';
    }

    function openUploadModal() {
        uploadModal.style.display = 'block';
    }

    function closeUploadModal() {
        uploadModal.style.display = 'none';
    }

    // Add new functions for cropper modal
    function openCropperModal() {
        cropperModal.style.display = 'block';
    }

    function closeCropperModal() {
        cropperModal.style.display = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    // Event listeners for settings modal
    settingsButton.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function (event) {
        if (event.target == settingsModal) {
            closeModal();
        }
        if (event.target == uploadModal) {
            closeUploadModal();
        }
        if (event.target == cropperModal) {
            closeCropperModal();
        }
    });

    // Event listeners for upload modal
    uploadButton.addEventListener('click', openUploadModal);
    closeUploadModalBtn.addEventListener('click', closeUploadModal);
    window.addEventListener('click', function (event) {
        if (event.target == uploadModal) {
            closeUploadModal();
        }
    });

    // Event listeners for cropper modal
    closeCropperBtn.addEventListener('click', closeCropperModal);
    window.addEventListener('click', function (event) {
        if (event.target == cropperModal) {
            closeCropperModal();
        }
    });

    // Load saved API key and fetch models if available
    chrome.storage.local.get([
        'geminiApiKey', 
        'selectedModel', 
        'chatMessages',
        'contentChunks'
    ], async function (result) {
        if (result.geminiApiKey) {
            geminiApiKeyInput.value = result.geminiApiKey;
            await fetchGeminiModels();
        }
        
        // 恢復聊天歷史
        if (result.chatMessages) {
            result.chatMessages.forEach(message => {
                if (message.type === 'image') {
                    addImageToHistory(`data:image/jpeg;base64,${message.text}`, message.sender);
                } else {
                    addMessageToChatHistory(message.text, message.sender);
                }
            });
        }
        
        // 恢復 RAG 相關資料
        if (result.contentChunks) {
            contentChunks = result.contentChunks;
            addMessageToChatHistory("✅ 已載入先前的文本內容，您可以繼續提問", "system");
            setTimeout(() => {
                const systemMessage = chatHistory.querySelector('.system-message');
                if (systemMessage && systemMessage.parentNode === chatHistory) {
                    chatHistory.removeChild(systemMessage);
                }
            }, 3000);
            updateUIForMode(); // 更新 UI
        }
    });

    // Save API key and fetch models
    saveApiKeyButton.addEventListener('click', async function () {
        const geminiApiKey = geminiApiKeyInput.value.trim();
        const apiKey = geminiApiKey;

        if (apiKey) {
            chrome.storage.local.set({ 
                geminiApiKey: geminiApiKey
            }, async function () {
                await fetchGeminiModels();
                closeModal();
            });
        }
    });

    // Handle model selection change
    modelSelect.addEventListener('change', function () {
        const selectedModel = modelSelect.value;
        updateUIForMode();
        clearImagePreview();
        chrome.storage.local.set({ selectedModel: selectedModel });
    });

    // Image upload handling
    fileInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64Image = await convertImageToBase64(file);
                currentImage = base64Image.split(',')[1];
                showImagePreview(base64Image);
            } catch (error) {
                console.error('Error processing image:', error);
                addMessageToChatHistory('圖片處理錯誤', 'system');
            }
        }
    });

    // Screenshot functionality
    screenshotBtn.addEventListener('click', async function () {
        closeUploadModal();
        try {
            // 注入裁切功能到當前頁面
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['css/cropper.min.css']
            });

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['js/cropper.min.js', 'js/screenshot.js']
            });

            // 監聽來自內容腳本的消息
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (request.type === 'screenshot' && request.imageData) {
                    currentImage = request.imageData.split(',')[1];
                    showImagePreview(`data:image/jpeg;base64,${currentImage}`);
                    sendResponse({ status: 'success' });
                }
            });

        } catch (error) {
            console.error('Screenshot error:', error);
            alert('截圖失敗：' + error.message);
        }
    });

    // Handle crop confirmation
    confirmCropBtn.addEventListener('click', async function () {
        if (!cropper) return;

        try {
            // Get cropped canvas
            const croppedCanvas = cropper.getCroppedCanvas();
            
            // Convert to base64
            const base64Image = croppedCanvas.toDataURL('image/jpeg');
            currentImage = base64Image.split(',')[1];
            
            // Show preview
            showImagePreview(base64Image);
            
            // Close cropper modal
            closeCropperModal();
        } catch (error) {
            console.error('Crop error:', error);
            alert('裁切失敗：' + error.message);
        }
    });

    // Choose file functionality
    chooseFileBtn.addEventListener('click', () => {
        closeUploadModal();
        fileInput.click();
    });

    function convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function showImagePreview(base64Image) {
        // 計算圖片大小
        const sizeInMB = (base64Image.split(',')[1].length * 3 / 4) / (1024 * 1024);
        const formattedSize = sizeInMB.toFixed(2); // 保留兩位小數
        
        imagePreview.innerHTML = `
            <div class="preview-container">
                <img src="${base64Image}" alt="預覽圖片">
                <div class="image-info">
                    <span class="image-size">${formattedSize} MB</span>
                    <button class="delete-image-btn" title="刪除圖片">×</button>
                </div>
            </div>
        `;
        imagePreview.style.display = 'block';

        // 為刪除按鈕添加事件監聽器
        const deleteBtn = imagePreview.querySelector('.delete-image-btn');
        deleteBtn.addEventListener('click', clearImagePreview);
    }

    function clearImagePreview() {
        imagePreview.innerHTML = '';
        imagePreview.style.display = 'none';
        currentImage = null;
        fileInput.value = '';
    }

    // Send message on Enter key
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            if (contentChunks) {
                handleRAGQuestion(messageInput.value.trim());
            } else {
                sendMessage();
            }
        }
    });

    // 修改 callLLMAPI 函數
    async function callLLMAPI(messages, withTools = true) {
        const apiKey = geminiApiKeyInput.value;
        if (!apiKey) {
            alert('請先設定 API Key');
            return;
        }

        // 如果選擇的模型中有出現thinking，則不使用工具
        if (modelSelect.value.includes('thinking')) {
            withTools = false;
        }

        try {
            const requestBody = {
                system_instruction: {
                    parts: [{
                        text: `你是一個AI助手。預設使用繁體中文(zh-TW)回答，除非使用者要求翻譯成指定語言。請用自然、流暢且專業的語氣回應。當前時間：${getCurrentTime()}`
                    }]
                },
                contents: [],                generationConfig: {
                    temperature: 0.9,
                    topK: 1,
                    topP: 1,
                }
            };

            if (withTools) {
                requestBody.tools = [{
                    google_search: {}
                }];
            }

            for (const message of messages) {
                if (!message.parts || message.parts.length === 0) {
                    if (message.content) {
                        message.parts = [{
                            text: message.content
                        }];
                    } else {
                        continue;
                    }
                }

                const content = {
                    role: message.role === 'assistant' ? 'model' : message.role,
                    parts: message.parts
                };

                requestBody.contents.push(content);
            }

            const response = await fetch(
                `${API_ENDPOINTS}${modelSelect.value}:streamGenerateContent?key=${apiKey}&alt=sse`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData.error?.message || `API 錯誤 (${response.status})`);
            }

            const tempId = 'temp-' + Date.now();
            addMessageToChatHistory('', 'ai', tempId);
            const messageElement = document.getElementById(tempId);
            let fullResponse = '';

            const decoder = new TextDecoder();
            const reader = response.body.getReader();
            let buffer = '';            while (true) {
                const {value, done} = await reader.read();
                
                // 如果流結束，使用 {stream: false} 解碼剩餘部分確保處理完整
                if (done) {
                    // 處理可能剩餘在 buffer 中的最後數據
                    if (buffer.length > 0) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ') && line.length > 6) {
                                try {
                                    const jsonStr = line.slice(6);
                                    if (jsonStr.trim() === '[DONE]') continue;
                                    
                                    const data = JSON.parse(jsonStr);
                                    if (data.candidates && data.candidates[0].content) {
                                        const text = data.candidates[0].content.parts[0].text || '';
                                        fullResponse += text;
                                        
                                        const htmlContent = marked.parse(fullResponse);
                                        messageElement.innerHTML = htmlContent;
                                        
                                        messageElement.querySelectorAll('pre code').forEach((block) => {
                                            hljs.highlightBlock(block);
                                        });
                                        
                                        chatHistory.scrollTop = chatHistory.scrollHeight;
                                    }
                                } catch (e) {
                                    console.error('解析最終數據時發生錯誤:', e);
                                }
                            }
                        }
                    }
                    break;
                }

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr.trim() === '[DONE]') continue;

                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.candidates && data.candidates[0].content) {
                                const text = data.candidates[0].content.parts[0].text || '';
                                fullResponse += text;

                                const htmlContent = marked.parse(fullResponse);
                                messageElement.innerHTML = htmlContent;

                                messageElement.querySelectorAll('pre code').forEach((block) => {
                                    hljs.highlightBlock(block);
                                });

                                if (data.candidates[0].finishReason === 'STOP' && 
                                    data.candidates[0].groundingMetadata) {
                                    const metadata = data.candidates[0].groundingMetadata;
                                    
                                    if (metadata.groundingChunks) {
                                        let searchResults = '\n\n參考來源：\n';
                                        metadata.groundingChunks.forEach((chunk, index) => {
                                            if (chunk.web) {
                                                searchResults += `${index + 1}. [${chunk.web.title}](${chunk.web.uri})\n`;
                                            }
                                        });
                                        fullResponse += searchResults;
                                        messageElement.innerHTML = marked.parse(fullResponse);
                                    }
                                }

                                chatHistory.scrollTop = chatHistory.scrollHeight;
                            }
                        } catch (e) {
                            //console.error('解析數據時發生錯誤:', e);
                        }
                    }
                }
            }

            return fullResponse;

        } catch (error) {
            console.error('API 調用錯誤:', error);
            throw error;
        }
    }

    async function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText && !currentImage) return;

        // 檢查是否已選擇模型
        if (!modelSelect.value) {
            addMessageToChatHistory('❌ 請先選擇一個模型', 'system');
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.lastChild);
            }, 3000);
            return;
        }

        messageInput.value = '';
        const apiKey = geminiApiKeyInput.value;
        if (!apiKey) {
            alert('請先設定 API Key');
            return;
        }

        try {
            // 先添加用戶文字訊息到歷史記錄
            if (messageText) {
                addMessageToChatHistory(messageText, 'user');
            }

            // 處理圖片
            if (currentImage) {
                imagePreview.style.display = 'none';
                try {
                    // 檢查大小
                    const sizeInMB = (currentImage.length * 3 / 4) / (1024 * 1024);
                    if (sizeInMB > 4) {
                        alert('圖片太大');
                    }
                    // 添加圖片到歷史記錄
                    await addImageToHistory(`data:image/jpeg;base64,${currentImage}`, 'user');
                } catch (error) {
                    throw new Error(`圖片處理失敗: ${error.message}`);
                }
            }

            // 構建訊息
            const messages = [];
            if (currentImage) {
                // 檢查模型支援
                const modelName = modelSelect.value.toLowerCase();
                if (!modelName) {
                    throw new Error('請選擇一個模型');
                }

                // 當有圖片時的訊息結構
                messages.push({
                    role: "user",
                    parts: [
                        {
                            text: messageText + "，請使用繁體中文回覆。#zh-TW" || "請用繁體中文描述這張圖片"
                        },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: currentImage
                            }
                        }
                    ]
                });
            } else {
                // messages 取得近六次的聊天歷史
                const chatMessages = chatHistory.querySelectorAll('.user-message, .ai-message');
                const lastSixMessages = Array.from(chatMessages).slice(-6);

                // 將聊天歷史轉換為 API 格式
                lastSixMessages.forEach(message => {
                    // 檢查是否為圖片訊息
                    const imageElement = message.querySelector('.image-message img');
                    if (imageElement) {
                        // 跳過圖片訊息，因為我們不能在後續對話中重用圖片
                        return;
                    }

                    // 處理文字訊息
                    const textContent = message.textContent.trim();
                    if (textContent) {
                        messages.push({
                            role: message.classList.contains('user-message') ? 'user' : 'model',
                            parts: [{
                                text: textContent
                            }]
                        });
                    }
                });

                // 添加當前用戶訊息
                messages.push({
                    role: "user",
                    parts: [{
                        text: messageText
                    }]
                });
            }

            const answer = await callLLMAPI(messages, currentImage ? false : true);
            if (answer) {
                await logApiCall('Gemini', true);

                // 更新聊天歷史
                chrome.storage.local.get(['chatMessages'], async function (result) {
                    const chatMessages = result.chatMessages || [];
                    if (messageText) {
                        chatMessages.push({ 
                            type: 'text',
                            text: messageText, 
                            sender: 'user' 
                        });
                    }
                    if (currentImage) {
                        chatMessages.push({ 
                            type: 'image',
                            text: currentImage,
                            sender: 'user'
                        });
                    }
                    chatMessages.push({ 
                        type: 'text',
                        text: answer, 
                        sender: 'ai' 
                    });
                    chrome.storage.local.set({ chatMessages });
                    // 清除當前圖片
                    clearImagePreview();
                });
            }

        } catch (error) {
            await logApiCall('Gemini', false, error.message);
            console.error('Error:', error);
            addMessageToChatHistory('錯誤: ' + error.message, 'system');
        }
    }

    // Clear chat history
    clearHistoryButton.addEventListener('click', function () {
        if (confirm('確定要刪除對話紀錄？')) {
            chatHistory.innerHTML = '';
            // 清除所有相關資料
            chrome.storage.local.remove([
                'chatMessages',
                'contentChunks'
            ]);
            // 清除本地變數
            contentChunks = null;
            addMessageToChatHistory("已清除對話紀錄。", "system");
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.firstChild);
            }, 3000);
            updateUIForMode(); // 更新 UI
        }
    });

    // 修改 addMessageToChatHistory 函數以支援臨時消息 ID
    function addMessageToChatHistory(message, sender, tempId = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add(sender + '-message');
        
        if (tempId) {
            messageElement.id = tempId;
        }
        
        if (sender === 'system') {
            messageElement.classList.add('system-message');
            
            // 根據訊息內容添加適當的角色標記
            if (message.includes('✅') || message.includes('已載入')) {
                messageElement.innerHTML = `<span role="success">${message}</span>`;
            } else if (message.includes('❌')) {
                messageElement.innerHTML = `<span role="error">${message}</span>`;
            } else if (message.includes('🤔') || message.includes('正在')) {
                messageElement.innerHTML = `<span role="processing">${message}</span>`;
            } else {
                messageElement.textContent = message;
            }        } else {
            try {
                messageElement.innerHTML = marked.parse(message);
                
                // 增強表格樣式
                enhanceTableStyles(messageElement);
            } catch (error) {
                console.error('Markdown 解析錯誤:', error);
                messageElement.textContent = message;
            }
        }
        
        // 為所有連結添加目標屬性
        messageElement.querySelectorAll('a').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // 修改 addImageToHistory 函數
    async function addImageToHistory(base64Image, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add(sender + '-message');
        
        // 用原始圖片來顯示
        const imgSrc = base64Image.startsWith('data:') 
            ? base64Image 
            : `data:image/jpeg;base64,${base64Image}`;
        messageElement.innerHTML = `<div class="image-message"><img src="${imgSrc}" alt="上傳的圖片"></div>`;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // 添加 Gemini 模型獲取函數
    async function fetchGeminiModels() {
        try {
            const apiKey = geminiApiKeyInput.value;
            if (!apiKey) {
                console.error('未設定 API Key');
                return;
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                throw new Error(`API 錯誤: ${response.status}`);
            }

            const data = await response.json();
            
            // 清空現有選項
            modelSelect.innerHTML = '<option value="">選擇模型...</option>';
            
            // 使用 Map 來儲存唯一的 displayName
            const uniqueModels = new Map();
            
            // 過濾 Gemini 模型並處理重複的 displayName
            data.models
                .filter(model => model.name.includes('gemini'))
                .forEach(model => {
                    const displayName = model.displayName || model.name.split('models/')[1];
                    // 如果這個 displayName 還沒有被記錄，或者是更新版本的模型，就更新它
                    if (!uniqueModels.has(displayName) || 
                        (model.name.includes('2.0') && !uniqueModels.get(displayName).name.includes('2.0'))) {
                        uniqueModels.set(displayName, model);
                    }
                });

            // 將 Map 轉換為陣列並排序
            const sortedModels = Array.from(uniqueModels.values())
                .sort((a, b) => {
                    // 優先顯示 gemini-2.0 的模型
                    const aVersion = a.name.includes('2.0') ? 1 : 0;
                    const bVersion = b.name.includes('2.0') ? 1 : 0;
                    if (aVersion !== bVersion) {
                        return bVersion - aVersion;
                    }
                    // 如果版本相同，按照 displayName 排序
                    return (a.displayName || '').localeCompare(b.displayName || '');
                });

            // 添加模型選項
            sortedModels.forEach(model => {
                const modelId = model.name.split('models/')[1];
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = model.displayName || modelId;
                modelSelect.appendChild(option);
            });

            // 設置之前選擇的模型
            chrome.storage.local.get(['selectedModel'], function (result) {
                if (result.selectedModel && modelSelect.querySelector(`option[value="${result.selectedModel}"]`)) {
                    modelSelect.value = result.selectedModel;
                    modelSelect.dispatchEvent(new Event('change'));
                }
            });

        } catch (error) {
            console.error('獲取模型列表失敗:', error);
            addMessageToChatHistory('❌ 獲取模型列表失敗: ' + error.message, "system");
        }
    }

    // 添加 RAG 按鈕點擊事件
    ragButton.addEventListener('click', function () {
        // 檢查是否已選擇模型
        if (!modelSelect.value) {
            addMessageToChatHistory('❌ 請先選擇一個模型', 'system');
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.lastChild);
            }, 3000);
            return;
        }
        // 檢查是否已設定 API key
        if (!geminiApiKeyInput.value) {
            addMessageToChatHistory('❌ 請先設定 API Key', 'system');
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.lastChild);
            }, 3000);
            return;
        }
        // 發送消息給 content script 開始擷取
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "startRAGCapture"
                });
            }
        });
    });

    // Handle RAG question
    async function handleRAGQuestion(question) {
        if (!question) return;

        // 檢查是否已選擇模型
        if (!modelSelect.value) {
            addMessageToChatHistory('❌ 請先選擇一個模型', 'system');
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.lastChild);
            }, 3000);
            return;
        }

        try {
            addMessageToChatHistory(question, 'user');
            messageInput.value = '';

            const messages = [
                {
                    role: 'user',
                    parts: [
                        {
                            text: "以下是一段網頁內容："
                        },
                        {
                            inline_data: {
                                mime_type: "text/html",
                                data: btoa(unescape(encodeURIComponent(contentChunks[0])))
                            }
                        },
                        {
                            text: `根據以上內容回答問題：${question}\n\n請用繁體中文回答。#zh-TW`
                        }
                    ]
                }
            ];

            const answer = await callLLMAPI(messages, false);
            await logApiCall('Gemini', true);

            // 更新聊天歷史
            chrome.storage.local.get(['chatMessages'], function (result) {
                const chatMessages = result.chatMessages || [];
                chatMessages.push({ 
                    type: 'text',
                    text: question, 
                    sender: 'user' 
                });
                chatMessages.push({ 
                    type: 'text',
                    text: answer, 
                    sender: 'ai' 
                });
                chrome.storage.local.set({ chatMessages });
            });

        } catch (error) {
            await logApiCall('Gemini', false, error.message);
            console.error('處理問題時發生錯誤:', error);
            addMessageToChatHistory("❌ 處理問題時發生錯誤，請重試", "system");
        }
    }

    // 在 DOMContentLoaded 事件中添加函數
    function updateUIForMode() {
        if (contentChunks) {
            // RAG 模式
            uploadButton.style.display = 'none';
            ragButton.style.display = 'none';
        } else {
            // 一般模式：根據模型類型決定是否顯示圖片上傳按鈕
            ragButton.style.display = 'block';
            uploadButton.style.display = 'block';
        }
    }

    // 添加接收選取文字的處理
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getSelectedText") {
            messageInput.value = request.text;
            if (!modelSelect.value) {
                addMessageToChatHistory('❌ 請先選擇一個模型', 'system');
                setTimeout(() => {
                    chatHistory.removeChild(chatHistory.lastChild);
                }, 3000);
                return;
            }
            // 確保 API key 已設定
            const apiKey = geminiApiKeyInput.value;
            if (!apiKey) {
                addMessageToChatHistory('❌ 請先設定 API Key', 'system');
                setTimeout(() => {
                    chatHistory.removeChild(chatHistory.lastChild);
                }, 3000);
                return;
            }
            if (contentChunks) {
                handleRAGQuestion(request.text.trim());
            } else {
                sendMessage();
            }
        }
    });

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+)/, '$1/$2/$3');
    }

    // API Log 功能
    async function logApiCall(apiType, isSuccess, errorMessage = '') {
        const timestamp = getCurrentTime();
        const logEntry = {
            timestamp,
            apiType,
            isSuccess,
            errorMessage
        };

        // 從 storage 獲取現有的 logs
        const { apiLogs = [] } = await chrome.storage.local.get('apiLogs');
        
        // 添加新的 log
        apiLogs.push(logEntry);
        
        // 儲存回 storage
        await chrome.storage.local.set({ apiLogs });
        
        // 如果 log modal 開啟中，更新顯示
        if (logModal.style.display === 'block') {
            displayLogs();
        }
    }

    // 顯示 logs
    async function displayLogs() {
        const { apiLogs = [] } = await chrome.storage.local.get('apiLogs');
        
        logList.innerHTML = apiLogs.reverse().map(log => `
            <div class="log-entry ${log.isSuccess ? 'success' : 'error'}">
                <div class="log-time">${log.timestamp}</div>
                <div class="log-type">${log.apiType}</div>
                <div class="log-status">
                    ${log.isSuccess ? '✅ 成功' : `❌ 失敗${log.errorMessage ? ': ' + log.errorMessage : ''}`}
                </div>
            </div>
        `).join('');
    }

    // Log 按鈕點擊事件
    logButton.addEventListener('click', () => {
        logModal.style.display = 'block';
        displayLogs();
    });

    // 清除 log 按鈕點擊事件
    clearLogButton.addEventListener('click', async () => {
        if (confirm('確定要清除所有 API 呼叫紀錄嗎？')) {
            await chrome.storage.local.remove('apiLogs');
            displayLogs();
        }
    });

    // 添加關閉 Log Modal 的事件處理
    closeLogModalBtn.addEventListener('click', () => {
        logModal.style.display = 'none';
    });

    // 點擊 modal 外區域關閉
    window.addEventListener('click', function (event) {
        if (event.target == logModal) {
            logModal.style.display = 'none';
        }
    });    // 設定 marked 選項
    marked.setOptions({
        breaks: true,  // 支援換行
        gfm: true,     // 支援 GitHub Flavored Markdown
        sanitize: false, // 允許 HTML
        highlight: function (code, lang) {
            // 如果需要程式碼高亮，可以在這裡添加
            return code;
        },
        // 自訂 renderer 來增強表格樣式
        renderer: (function() {
            const renderer = new marked.Renderer();
            
            // 增強表格渲染
            const originalTable = renderer.table;
            renderer.table = function(header, body) {
                return '<div class="table-container">' + 
                       originalTable.call(this, header, body) + 
                       '</div>';
            };
            
            return renderer;
        })()
    });    // 添加一個用於解碼 Unicode 的輔助函數
    function decodeUnicode(str) {
        try {
            // 如果是 JSON 字符串，先解析它
            if (typeof str === 'string' && (str.startsWith('{') || str.startsWith('['))) {
                const obj = JSON.parse(str);
                // 將物件轉回字符串，並確保中文正確顯示
                return JSON.stringify(obj, null, 2)
                    .replace(/\\u[\dA-F]{4}/gi, match => 
                        String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
                    );
            }
            // 如果是普通字符串，直接解碼
            return str.replace(/\\u[\dA-F]{4}/gi, match => 
                String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
            );
        } catch (error) {
            console.error('Unicode 解碼錯誤:', error);
            return str; // 如果解碼失敗，返回原始字符串
        }
    }
    
    // 添加表格樣式增強函數
    function enhanceTableStyles(element) {
        // 處理表格
        const tables = element.querySelectorAll('table');
        tables.forEach(table => {
            // 為表格添加自適應容器
            if (!table.parentNode.classList.contains('table-container')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-container';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
            
            // 確保標題列有適當的樣式
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                const headerCells = headerRow.querySelectorAll('th');
                headerCells.forEach(cell => {
                    cell.setAttribute('scope', 'col');
                });
            }
        });
    }

    // 監聽來自 content script 的消息
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === "ragContentCaptured") {
            const content = request.content;
            // 使用 Gemini API 處理內容
            vectorizeContent(content);
        }
    });

    // 向量化內容的函數
    async function vectorizeContent(content) {
        try {
            // 清空聊天歷史
            chatHistory.innerHTML = '';
            // 清除所有相關資料
            chrome.storage.local.remove([
                'chatMessages',
                'contentChunks'
            ]);
            // 清除本地變數
            contentChunks = null;

            // 顯示處理中訊息
            addMessageToChatHistory("正在處理文本，請稍候...", "system");

            // 儲存處理的文本
            contentChunks = [content];
            
            // 儲存處理結果
            chrome.storage.local.set({
                contentChunks: [content]
            }, function () {
                // 清除所有訊息
                chatHistory.innerHTML = '';
                
                // 顯示完成訊息
                addMessageToChatHistory("✅ 文本處理完成，您現在可以開始提問了！", "system");
                
                // 使用 setTimeout 清除成功訊息
                const successElement = chatHistory.querySelector('.system-message');
                if (successElement) {
                    setTimeout(() => {
                        if (successElement && successElement.parentNode === chatHistory) {
                            chatHistory.removeChild(successElement);
                        }
                    }, 3000);
                }
                
                updateUIForMode(); // 更新 UI
            });

        } catch (error) {
            console.error('處理文本錯誤:', error);
            chatHistory.innerHTML = '';
            addMessageToChatHistory('❌ 處理文本失敗: ' + error.message, "system");
        }
    }
});