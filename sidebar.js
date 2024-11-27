document.addEventListener('DOMContentLoaded', function() {
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
    const jinaApiKeyInput = document.getElementById('jina-api-key-input');
    const ragButton = document.getElementById('RAG-button');
    const tavilyApiKeyInput = document.getElementById('tavily-api-key-input');
    const tavilyButton = document.getElementById('tavily-button');
    const API_ENDPOINTS = {
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    };
    let currentImage = null;
    let cropper = null;
    let currentApiType = 'groq'; // 預設使用 Groq API
    let contentEmbeddings = null; // 用於儲存文本的 embeddings
    let contentChunks = null; // 用於儲存文本的切割片段
    let isTavilyEnabled = false;

    // 更新變數定義
    const groqApiKeyInput = document.getElementById('groq-api-key-input');
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const groqApiWrapper = document.getElementById('groq-api-input');
    const geminiApiWrapper = document.getElementById('gemini-api-input');
    
    const logButton = document.getElementById('log-button');
    const logModal = document.getElementById('log-modal');
    const logList = document.getElementById('log-list');
    const clearLogButton = document.getElementById('clear-log');
    const closeLogModalBtn = logModal.querySelector('.close-modal');
    
    // 添加 radio 切換事件
    document.querySelectorAll('input[name="api-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentApiType = this.value;
            if (this.value === 'groq') {
                groqApiWrapper.style.display = 'block';
                geminiApiWrapper.style.display = 'none';
            } else {
                groqApiWrapper.style.display = 'none';
                geminiApiWrapper.style.display = 'block';
            }
        });
    });

    // 修改儲存 API key 的處理
    saveApiKeyButton.addEventListener('click', function() {
        const groqApiKey = groqApiKeyInput.value.trim();
        const geminiApiKey = geminiApiKeyInput.value.trim();
        const jinaApiKey = jinaApiKeyInput.value.trim();
        const tavilyApiKey = tavilyApiKeyInput.value.trim();
        
        const apiKey = currentApiType === 'groq' ? groqApiKey : geminiApiKey;
        
        if (apiKey) {
            chrome.storage.local.set({ 
                groqApiKey: groqApiKey,
                geminiApiKey: geminiApiKey,
                apiType: currentApiType,
                jinaApiKey: jinaApiKey,
                tavilyApiKey: tavilyApiKey
            }, function() {
                if (currentApiType === 'groq') {
                    fetchGroqModels(groqApiKey);
                } else {
                    fetchGeminiModels();
                }
                closeModal();
            });
        }
    });

    // 修改載入已儲存的 API keys
    function loadSavedApiKeys() {
        chrome.storage.local.get([
            'groqApiKey',
            'geminiApiKey',
            'jinaApiKey',
            'tavilyApiKey',
            'apiType'
        ], function(result) {
            if (result.groqApiKey) {
                groqApiKeyInput.value = result.groqApiKey;
            }
            if (result.geminiApiKey) {
                geminiApiKeyInput.value = result.geminiApiKey;
            }
            if (result.jinaApiKey) {
                jinaApiKeyInput.value = result.jinaApiKey;
            }
            if (result.tavilyApiKey) {
                tavilyApiKeyInput.value = result.tavilyApiKey;
            }
            if (result.apiType) {
                currentApiType = result.apiType;
                document.querySelector(`input[name="api-type"][value="${currentApiType}"]`).checked = true;
                if (currentApiType === 'groq') {
                    groqApiWrapper.style.display = 'block';
                    geminiApiWrapper.style.display = 'none';
                } else {
                    groqApiWrapper.style.display = 'none';
                    geminiApiWrapper.style.display = 'block';
                }
            }
        });
    }

    // Modal functions
    function openModal() {
        loadSavedApiKeys();
        settingsModal.style.display = 'block';
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
    window.addEventListener('click', function(event) {
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
    window.addEventListener('click', function(event) {
        if (event.target == uploadModal) {
            closeUploadModal();
        }
    });

    // Event listeners for cropper modal
    closeCropperBtn.addEventListener('click', closeCropperModal);
    window.addEventListener('click', function(event) {
        if (event.target == cropperModal) {
            closeCropperModal();
        }
    });

    // Save API key and fetch models
    saveApiKeyButton.addEventListener('click', function() {
        const groqApiKey = groqApiKeyInput.value.trim();
        const geminiApiKey = geminiApiKeyInput.value.trim();
        const jinaApiKey = jinaApiKeyInput.value.trim();
        const tavilyApiKey = tavilyApiKeyInput.value.trim();
        chrome.storage.local.set({ 
            groqApiKey: groqApiKey,
            geminiApiKey: geminiApiKey,
            apiType: currentApiType,
            jinaApiKey: jinaApiKey,
            tavilyApiKey: tavilyApiKey
        }, function() {
            if (currentApiType === 'groq') {
                fetchGroqModels(groqApiKey);
            } else {
                fetchGeminiModels();
            }
            closeModal();
        });
    });

    // Handle model selection change
    modelSelect.addEventListener('change', function() {
        const selectedModel = modelSelect.value;
        updateUIForMode();
        clearImagePreview();
        chrome.storage.local.set({ selectedModel: selectedModel });
    });

    // Image upload handling
    fileInput.addEventListener('change', async function(e) {
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
    screenshotBtn.addEventListener('click', async function() {
        closeUploadModal();
        try {
            // 注入裁切功能到當前頁面
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['css/cropper.min.css']
            });

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['js/cropper.min.js', 'js/screenshot.js']
            });

            // 監聽來自內容腳本的消息
            chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                if (request.type === 'screenshot' && request.imageData) {
                    currentImage = request.imageData.split(',')[1];
                    showImagePreview(`data:image/jpeg;base64,${currentImage}`);
                    sendResponse({status: 'success'});
                }
            });

        } catch (error) {
            console.error('Screenshot error:', error);
            alert('截圖失敗：' + error.message);
        }
    });

    // Handle crop confirmation
    confirmCropBtn.addEventListener('click', async function() {
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

    // Function to fetch available models from Groq API
    async function fetchGroqModels(apiKey) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
                // 清除現有選項
                modelSelect.innerHTML = '<option value="">選擇模型...</option>';
                
                // 過濾掉包含 whisper 的模型並排序
                const filteredModels = data.data
                    .filter(model => !model.id.toLowerCase().includes('whisper'))
                    .sort((a, b) => a.id.localeCompare(b.id));

                // 添加模型到選擇元素
                filteredModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    modelSelect.appendChild(option);
                });

                // 設置之前選擇的模型
                chrome.storage.local.get(['selectedModel'], function(result) {
                    if (result.selectedModel && modelSelect.querySelector(`option[value="${result.selectedModel}"]`)) {
                        modelSelect.value = result.selectedModel;
                        // 觸發 change 事件來更新 UI
                        modelSelect.dispatchEvent(new Event('change'));
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            modelSelect.innerHTML = '<option value="">載入模型失敗</option>';
            alert('載入模型失敗：' + error.message);
        }
    }

    // Load saved API key and fetch models if available
    chrome.storage.local.get([
        'groqApiKey', 
        'geminiApiKey', 
        'jinaApiKey',
        'tavilyApiKey',
        'apiType', 
        'selectedModel', 
        'chatMessages',
        'contentChunks',
        'contentEmbeddings'
    ], function(result) {
        if (result.apiType) {
            currentApiType = result.apiType;
            const savedKey = result[`${currentApiType}ApiKey`];
            if (savedKey) {
                if (currentApiType === 'groq') {
                    groqApiKeyInput.value = savedKey;
                } else {
                    geminiApiKeyInput.value = savedKey;
                }
                if (currentApiType === 'groq') {
                    fetchGroqModels(savedKey);
                } else {
                    fetchGeminiModels();
                }
            }
        }
        
        // 載入 Jina API Key
        if (result.jinaApiKey) {
            jinaApiKeyInput.value = result.jinaApiKey;
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
        if (result.contentChunks && result.contentEmbeddings) {
            contentChunks = result.contentChunks;
            contentEmbeddings = result.contentEmbeddings;
            addMessageToChatHistory("✅ 已載入先前的文本向量，您可以繼續提問", "system");
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.firstChild);
            }, 3000);
            updateUIForMode(); // 更新 UI
        }
        if (result.tavilyApiKey) {
            tavilyApiKeyInput.value = result.tavilyApiKey;
        }
    });

    // Send message on Enter key
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            if (contentEmbeddings) {
                handleRAGQuestion(messageInput.value.trim());
            } else {
                sendMessage();
            }
        }
    });

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
        const apiKey = currentApiType === 'groq' ? groqApiKeyInput.value : geminiApiKeyInput.value;
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
                const supportsImages = modelName.includes('vision') || modelName.includes('llava') || modelName.includes('gemini');
                if (!supportsImages) {
                    throw new Error('請選擇支援圖片的模型（包含 vision 或 llava 或 gemini）');
                }
                // 當有圖片時的訊息結構
                messages.push({
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: messageText + "，請使用繁體中文回覆。#zh-TW" || "請用繁體中文描述這張圖片"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${currentImage}`
                            }
                        }
                    ]
                });
            } else {
                // messages 取得近六次的聊天歷史
                const chatMessages = chatHistory.querySelectorAll('.user-message, .ai-message');
                const lastSixMessages = Array.from(chatMessages).slice(-6);
                // 純文字訊息
                if (isTavilyEnabled) {
                    // 添加搜尋中的提示
                    addMessageToChatHistory("🔍 正在搜尋相關資訊...", "system");
                    
                    try {
                        await logApiCall('Tavily', true);
                        const searchResult = await searchWithTavily(messageText);
                        const searchContext = searchResult.answer + "\n\n相關資訊：\n" + 
                            searchResult.results.map(r => `- ${r.title}: ${r.content.slice(0, 200)} [${r.url}]`).join('\n');
                        
                        // 移除搜尋提示
                        chatHistory.removeChild(chatHistory.lastChild);
                        
                        // 修改系統提示，加入搜尋結果
                        messages.push({
                            role: 'system',
                            content: `當前時間：${getCurrentTime()}\n你是一個AI助手。請使用以下搜尋到的資訊來協助回答。若資訊不足，可使用自己的知識補充。
                            搜尋結果：${searchContext}
                            請用繁體中文(zh-TW)回答，除非使用者要求翻譯成指定語言。請用自然、流暢且專業的語氣回應。`
                        });
                    } catch (error) {
                        await logApiCall('Tavily', false, error.message);
                        console.error('搜尋錯誤:', error);
                        addMessageToChatHistory("⚠️ 搜尋資訊時發生錯誤，將使用基本對話模式", "system");
                        setTimeout(() => chatHistory.removeChild(chatHistory.lastChild), 3000);
                    }
                } else {
                    messages.push({
                        role: 'system',
                        content: `當前時間：${getCurrentTime()}\n你是一個AI助手。預設使用繁體中文(zh-TW)回答，除非使用者要求翻譯成指定語言。請用自然、流暢且專業的語氣回應。`
                    });
                }
                lastSixMessages.forEach(message => {
                    messages.push({
                        role: message.classList.contains('user-message') ? 'user' : 'assistant',
                        content: message.textContent
                    });
                });
                messages.push({
                    role: "user",
                    content: messageText
                });
            }

            const answer = await callLLMAPI(messages);
            if (answer) {
                addMessageToChatHistory(answer, 'ai');
                await logApiCall(currentApiType === 'groq' ? 'Groq' : 'Gemini', true);

                // 更新聊天歷史
                chrome.storage.local.get(['chatMessages'], async function(result) {
                    const chatMessages = result.chatMessages || [];
                    if (messageText) {
                        chatMessages.push({ 
                            type: 'text',
                            text: messageText, 
                            sender: 'user' 
                        });
                    }
                    if (currentImage) {
                        // 創建並儲存縮圖
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
            await logApiCall(currentApiType === 'groq' ? 'Groq' : 'Gemini', false, error.message);
            console.error('Error:', error);
            addMessageToChatHistory('錯誤: ' + error.message, 'system');
        }
    }

    // Clear chat history
    clearHistoryButton.addEventListener('click', function() {
        if (confirm('確定要刪除對話紀錄？')) {
            chatHistory.innerHTML = '';
            // 清除所有相關資料
            chrome.storage.local.remove([
                'chatMessages',
                'contentChunks',
                'contentEmbeddings'
            ]);
            // 清除本地變數
            contentEmbeddings = null;
            contentChunks = null;
            addMessageToChatHistory("已清除對話紀錄，回到聊天模式。", "system");
            setTimeout(() => {
                chatHistory.removeChild(chatHistory.firstChild);
            }, 3000);
            updateUIForMode(); // 更新 UI
        }
    });

    function addMessageToChatHistory(message, sender) {
        const messageElement = document.createElement('div');
        
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
            }
        } else {
            messageElement.classList.add(sender + '-message');
            // 使用 marked 解析 Markdown
            try {
                messageElement.innerHTML = marked.parse(message);
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

    // 添加 API 類型切換處理
    document.querySelectorAll('input[name="api-type"]').forEach(radio => {
        radio.addEventListener('change', function(e) {
            currentApiType = e.target.value;
            // 切換時讀取對應的 API key
            chrome.storage.local.get([`${currentApiType}ApiKey`], function(result) {
                const savedKey = result[`${currentApiType}ApiKey`];
                if (currentApiType === 'groq') {
                    groqApiKeyInput.value = savedKey;
                } else {
                    geminiApiKeyInput.value = savedKey;
                }
            });
        });
    });

    // 添加 Gemini 模型獲取函數
    async function fetchGeminiModels() {
        const geminiModels = [
            { id: 'gemini-1.5-flash', name: 'Gemini-1.5-Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini-1.5-Pro' }
        ];
        
        modelSelect.innerHTML = '<option value="">選擇模型...</option>';
        geminiModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });

        // 設置之前選擇的模型
        chrome.storage.local.get(['selectedModel'], function(result) {
            if (result.selectedModel && modelSelect.querySelector(`option[value="${result.selectedModel}"]`)) {
                modelSelect.value = result.selectedModel;
                modelSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    // 添加 RAG 按鈕點擊事件
    ragButton.addEventListener('click', function() {
        // 檢查是否有設定 Jina API Key
        chrome.storage.local.get(['jinaApiKey'], function(result) {
            if (!result.jinaApiKey) {
                alert('請先在設定中設定 Jina API Key');
                return;
            }
            
            // 發送消息給 content script 開始擷取
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "startRAGCapture"
                    });
                }
            });
        });
    });

    // 監聽來自 content script 的消息
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "ragContentCaptured") {
            const content = request.content;
            // 使用 Jina API 進行向量化
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
                'contentChunks',
                'contentEmbeddings'
            ]);
            // 清除本地變數
            contentEmbeddings = null;
            contentChunks = null;

            addMessageToChatHistory("正在處理文本，請稍候...", "system");

            // 去除 HTML 標籤
            const cleanContent = stripHtmlTags(content);

            // 切割文本
            const chunks = splitText(cleanContent);
            
            chrome.storage.local.get(['jinaApiKey'], async function(result) {
                const jinaApiKey = result.jinaApiKey;
                
                try {
                    // 更新處理狀態
                    chatHistory.innerHTML = '';
                    addMessageToChatHistory("正在生成文本向量...", "system");

                    // 批次處理每個文本片段
                    const embeddings = await getEmbeddings(chunks);
                    
                    // 更新本地變數
                    contentChunks = chunks;
                    contentEmbeddings = embeddings;
                    
                    // 儲存處理結果
                    chrome.storage.local.set({
                        contentChunks: chunks,
                        contentEmbeddings: embeddings
                    }, function() {
                        // 清除處理狀態訊息
                        chatHistory.innerHTML = '';
                        // 顯示完成訊息
                        addMessageToChatHistory("✅ 文本處理完成，您現在可以開始提問了！", "system");
                        setTimeout(() => {
                            chatHistory.removeChild(chatHistory.firstChild);
                        }, 3000);
                        updateUIForMode(); // 更新 UI
                    });

                } catch (error) {
                    console.error('向量化錯誤:', error);
                    chatHistory.innerHTML = '';
                    addMessageToChatHistory('❌ 向量化失敗: ' + error.message, "system");
                }
            });
        } catch (error) {
            console.error('處理文本錯誤:', error);
            chatHistory.innerHTML = '';
            addMessageToChatHistory('❌ 處理文本失敗: ' + error.message, "system");
        }
    }

    // 修改 getEmbeddings 函數
    async function getEmbeddings(texts, batchSize = 20) {
        const result = await chrome.storage.local.get(['jinaApiKey']);
        const jinaApiKey = result.jinaApiKey;
        
        if (!jinaApiKey) {
            throw new Error('Jina AI API Key 未設置');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jinaApiKey}`
        };
        
        const allEmbeddings = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const data = {
                "model": "jina-embeddings-v3",
                "dimensions": 1024,
                "normalized": true,
                "embedding_type": "float",
                "input": batch.map(text => ({ text }))  // 將每個文本包裝成物件
            };
            const response = await fetch('https://api.jina.ai/v1/embeddings', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status}`);
            }

            const result = await response.json();
            allEmbeddings.push(...result.data.map(item => item.embedding));
        }
        
        return allEmbeddings;
    }

    // 添加文本分割函數
    function splitText(text, maxLength = 1000, overlap = 200) {
        const paragraphs = text.split('\n');
        const chunks = [];
        let currentChunk = "";
        
        for (const para of paragraphs) {
            const trimmedPara = para.trim();
            if (!trimmedPara) continue;
            
            if (currentChunk.length + trimmedPara.length < maxLength) {
                currentChunk += trimmedPara + " ";
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    // 保留重疊部分
                    currentChunk = currentChunk.slice(-overlap) + trimmedPara + " ";
                } else {
                    currentChunk = trimmedPara + " ";
                }
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    // 添加 HTML 標籤清除函數
    function stripHtmlTags(html) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // 修改 rerank 函數
    async function rerankResults(query, texts) {
        if (!jinaApiKey) {
            throw new Error('Jina AI API Key 未設置');
        }

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jinaApiKey}`
        };
        
        // 修改請求資料格式，直接使用文本陣列
        const data = {
            "model": "jina-reranker-v2-base-multilingual",
            "query": query,
            "top_n": 3,
            "documents": texts  // 直接傳入文本陣列
        };
        
        try {
            const response = await fetch("https://api.jina.ai/v1/rerank", {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 請求失敗: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            
            // 檢查回應格式
            if (!result || !Array.isArray(result.results)) {
                console.error('Unexpected API response:', result);
                throw new Error('API 回應格式不正確');
            }
            
            // 根據相關性分數和文本多樣性進行過濾
            const filtered_results = [];
            const seen_content = new Set();
            
            for (const item of result.results) {
                const text = item.text;  // 直接使用 text 屬性
                const score = item.score; // 使用 score 屬性
                
                // 計算文本的特徵指紋
                const text_fingerprint = text.split(' ').sort().join(' ');
                
                // 如果內容不重複且相性分數足夠高
                if (!seen_content.has(text_fingerprint) && score > 0.5) {
                    filtered_results.push({
                        document: { text },
                        relevance_score: score
                    });
                    seen_content.add(text_fingerprint);
                }
            }
            
            // 如果沒有找到任何結果，使用原始文本
            if (filtered_results.length === 0) {
                return texts.slice(0, 3).map(text => ({
                    document: { text },
                    relevance_score: 1.0
                }));
            }
            
            return filtered_results.slice(0, 3); // 返回最終的 3 個結果
            
        } catch (error) {
            console.error('重新排序時發生錯誤:', error);
            // 如果 rerank 失敗，返回基於原始順序的結果
            return texts.slice(0, 3).map(text => ({
                document: { text },
                relevance_score: 1.0
            }));
        }
    }

    // 添加餘弦相似度計算函數
    function cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (normA * normB);
    }

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
            
            // 添加思考中的提示
            addMessageToChatHistory("🤔 正在思考回答...", "system");

            try {
                const questionEmbedding = (await getEmbeddings([question]))[0];
                await logApiCall('JinaAI', true);

                const similarities = contentEmbeddings.map((embedding, index) => ({
                    index,
                    similarity: cosineSimilarity(questionEmbedding, embedding)
                }));

                const topResults = similarities
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, 3);
                    
                const relevantContent = topResults
                    .map(result => contentChunks[result.index])
                    .join('\n\n');

                const messages = [
                    {
                        role: 'system',
                        content: `當前時間：${getCurrentTime()}\n你是一個專業的問答助手。請根據提供的上下文內容，以繁體中文回答用戶的問題。
                        如果上下文中沒有足夠的資訊來回答問題，請誠實說明。
                        回答應該簡潔明瞭，並且直接針對問題給出答案。
                        #zh-TW`
                    },
                    {
                        role: 'user',
                        content: `根據以下內容回答問題：\n\n${relevantContent}\n\n問題：${question}\n\n#zh-TW`
                    }
                ];

                const answer = await callLLMAPI(messages);
                await logApiCall(currentApiType === 'groq' ? 'Groq' : 'Gemini', true);
                
                chatHistory.removeChild(chatHistory.lastChild);
                addMessageToChatHistory(answer, "ai");

            } catch (error) {
                console.error('API 呼叫錯誤:', error);
                await logApiCall('JinaAI', false, error.message);
                chatHistory.removeChild(chatHistory.lastChild);
                addMessageToChatHistory("❌ 處理問題時發生錯誤，請重試", "system");
            }

        } catch (error) {
            console.error('處理問題時發生錯誤:', error);
            addMessageToChatHistory("❌ 處理問題時發生錯誤，請重試", "system");
        }
    }

    async function callLLMAPI(messages) {
        const apiKey = currentApiType === 'groq' ? groqApiKeyInput.value : geminiApiKeyInput.value;
        if (!apiKey) {
            alert('請先設定 API Key');
            return;
        }

        const response = await fetch(API_ENDPOINTS[currentApiType], {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelSelect.value,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API 錯誤 (${response.status})`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // 在 DOMContentLoaded 事件中添加函數
    function updateUIForMode() {
        if (contentEmbeddings) {
            // RAG 模式
            tavilyButton.style.display = 'none';
            uploadButton.style.display = 'none';
            ragButton.style.display = 'none';
        } else {
            // 一般模式：根據模型類型決定是否顯示圖片上傳按鈕
            tavilyButton.style.display = 'block';
            ragButton.style.display = 'block';
            const selectedModel = modelSelect.value;
            const hasVision = selectedModel.toLowerCase().includes('vision') || 
                             selectedModel.toLowerCase().includes('llava') ||
                             selectedModel.toLowerCase().includes('gemini');
            uploadButton.style.display = hasVision ? 'block' : 'none';
        }
    }

    // 新增 Tavily API 搜尋函數
    async function searchWithTavily(query) {
        const tavilyApiKey = tavilyApiKeyInput.value.trim();
        if (!tavilyApiKey) {
            throw new Error('Tavily API Key 未設置');
        }

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                api_key: tavilyApiKey,
                include_answer: true
            })
        });

        if (!response.ok) {
            throw new Error(`Tavily API 錯誤: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }

    // 添加 Tavily 按鈕點擊事件
    tavilyButton.addEventListener('click', function() {
        isTavilyEnabled = !isTavilyEnabled;
        this.classList.toggle('active', isTavilyEnabled);
    });

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
            const apiKey = currentApiType === 'groq' ? groqApiKeyInput.value : geminiApiKeyInput.value;
            if (!apiKey) {
                addMessageToChatHistory('❌ 請先設定 API Key', 'system');
                setTimeout(() => {
                    chatHistory.removeChild(chatHistory.lastChild);
                }, 3000);
                return;
            }
            if (contentEmbeddings) {
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

    // 點擊 modal 外部區域關閉
    window.addEventListener('click', function(event) {
        if (event.target == logModal) {
            logModal.style.display = 'none';
        }
    });

    // 設定 marked 選項
    marked.setOptions({
        breaks: true,  // 支援換行
        gfm: true,     // 支援 GitHub Flavored Markdown
        sanitize: false, // 允許 HTML
        highlight: function(code, lang) {
            // 如果需要程式碼高亮，可以在這裡添加
            return code;
        }
    });
});