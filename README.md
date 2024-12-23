[繁體中文](#chinese) | [English](#english)

<h1 id="chinese">AI Chat Chrome Extension</h1>

這個 Chrome Extension 讓你可以輕鬆地與 AI 模型進行對話，支援文字、圖片互動、網路搜尋以及 RAG (檢索增強生成) 功能。

## 功能特點

### 基本功能
- 支援多種 AI 模型 (Gemini API)
- 即時對話介面
- 支援繁體中文介面
- 可保存對話歷史
- 深色模式界面
- 網路搜尋功能

### 圖片功能
- 支援圖片上傳
- 網頁截圖功能（可自由選擇區域）
- 圖片裁切功能
- 支援與圖片相關的 AI 對話

### RAG 功能
- 網頁內容智能擷取
- 使用 Jina AI 進行文本向量化
- 智能問答功能（基於文本相似度）
- 支援長文本理解和回答

## 安裝方法

1. 下載此專案的所有檔案
2. 開啟 Chrome 瀏覽器，進入擴充功能管理頁面 (chrome://extensions/)
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇專案資料夾

## 使用方法

### 基本設定
1. 點擊擴充功能圖示開啟側邊欄
2. 點擊設定按鈕 (⚙️)
3. 設定必要的 API Keys：
   - Gemini API（用於一般對話）
   - Jina API（用於 RAG 功能）
4. 選擇要使用的 AI 模型

### 一般對話
1. 在輸入框輸入訊息
2. 按 Enter 發送
3. 等待 AI 回應

### 圖片互動
1. 點擊圖片上傳按鈕 (📎)
2. 選擇：
   - 截取網頁：擷取當前網頁畫面
   - 選擇圖片：上傳本地圖片
3. 可進行圖片裁切（支援自由選擇區域）
4. 與 AI 討論圖片內容

### RAG 功能
1. 點擊 RAG 按鈕 (🔍)
2. 選擇網頁中要擷取的文本
3. 等待系統處理文本（需要一定時間）
4. 開始提問相關內容
5. 系統會自動找出最相關的內容進行回答

## 系統需求
- Chrome 瀏覽器 88 或更新版本
- 有效的 API 金鑰：
  - Gemini API
  - Jina AI API
- 穩定的網路連線

## 注意事項
- 請確保 API 金鑰的安全性
- 圖片大小限制為 4MB
- RAG 功能需要額外的處理時間
- 網路搜尋功能需要額外的處理時間
- 建議在網路連線穩定的環境下使用

## 隱私聲明
- 所有的對話內容僅儲存在本地
- 圖片處理完全在本地進行
- API 請求直接與相應的服務提供商進行
- 不會收集或上傳任何個人資訊- 網路搜尋結果僅用於當次對話

---

<h1 id="english">AI Chat Chrome Extension</h1>

This Chrome Extension enables seamless communication with AI models, supporting text, image interaction, web search, and RAG (Retrieval-Augmented Generation) functionality.

## Features

### Basic Functions
- Multiple AI model support (Gemini API)
- Real-time chat interface
- Traditional Chinese interface support
- Chat history preservation
- Dark mode interface
- Web search capability

### Image Features
- Image upload support
- Webpage screenshot capability (with area selection)
- Image cropping functionality
- AI conversation about images

### RAG Features
- Smart webpage content extraction
- Text vectorization using Jina AI
- Intelligent Q&A functionality (based on text similarity)
- Long text comprehension and response support

## Installation

1. Download all project files
2. Open Chrome browser and navigate to extensions page (chrome://extensions/)
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the project folder

## Usage

### Basic Setup
1. Click the extension icon to open the sidebar
2. Click the settings button (⚙️)
3. Configure required API Keys:
   - Gemini API (for general conversation)
   - Jina API (for RAG functionality)
4. Select your preferred AI model

### General Chat
1. Enter your message in the input box
2. Press Enter to send
3. Wait for AI response

### Image Interaction
1. Click the image upload button (📎)
2. Choose:
   - Capture webpage: Take a screenshot of current page
   - Select image: Upload local image
3. Crop image if needed (supports free area selection)
4. Discuss image content with AI

### RAG Functionality
1. Click the RAG button (🔍)
2. Select text to extract from webpage
3. Wait for text processing (requires processing time)
4. Start asking questions about the content
5. System will automatically find and use the most relevant content for answers

## System Requirements
- Chrome browser version 88 or newer
- Valid API keys:
  - Gemini API
  - Jina AI API
- Stable internet connection

## Important Notes
- Ensure API key security
- Image size limit: 4MB
- RAG functionality requires additional processing time
- Web search functionality requires additional processing time
- Stable internet connection recommended

## Privacy Statement
- All conversation content stored locally only
- Image processing performed locally
- API requests made directly to respective service providers
- No personal information collected or uploaded
- Web search results used only for current conversation
