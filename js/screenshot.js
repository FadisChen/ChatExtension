(function() {
    // 創建裁切界面
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    const cropperContainer = document.createElement('div');
    cropperContainer.style.cssText = `
        position: relative;
        width: 90%;
        height: 80vh;
        max-height: 800px;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
    `;

    const cropperWrapper = document.createElement('div');
    cropperWrapper.style.cssText = `
        flex: 1;
        overflow: hidden;
        position: relative;
        min-height: 0;
    `;

    const img = document.createElement('img');
    img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        margin-top: 10px;
        text-align: right;
        flex-shrink: 0;
    `;

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '確認裁切';
    confirmBtn.style.cssText = `
        padding: 8px 16px;
        margin-left: 10px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    cropperWrapper.appendChild(img);
    cropperContainer.appendChild(cropperWrapper);
    cropperContainer.appendChild(buttonContainer);
    overlay.appendChild(cropperContainer);

    let cropper = null;

    // 截取當前視窗
    chrome.runtime.sendMessage({type: 'captureTab'}, async function(response) {
        if (response && response.imageUrl) {
            document.body.appendChild(overlay);
            img.src = response.imageUrl;
            
            // 初始化裁切工具
            cropper = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 1,
                dragMode: 'move',
                autoCrop: true,
                movable: true,
                rotatable: false,
                scalable: false,
                zoomable: true,
                zoomOnTouch: false,
                zoomOnWheel: true,
                responsive: true,
                restore: true,
                checkCrossOrigin: false
            });
        }
    });

    // 處理確認裁切
    confirmBtn.addEventListener('click', () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas();
            const imageData = canvas.toDataURL('image/jpeg');
            chrome.runtime.sendMessage({
                type: 'screenshot',
                imageData: imageData
            });
        }
        cleanup();
    });

    // 處理取消
    cancelBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cleanup();
        }
    });

    function cleanup() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        overlay.remove();
    }
})(); 