chrome.commands.onCommand.addListener((command) => {
    if (command === 'open_global_window') {
        // 检查是否已经有打开的独立窗口，避免重复打开一堆窗口
        chrome.storage.local.get(['notepadWindowId'], function(result) {
            if (result.notepadWindowId) {
                // 如果已存在，尝试将其置顶聚焦
                chrome.windows.update(result.notepadWindowId, { focused: true }).catch(() => {
                    // 如果窗口其实已经被关了（但没清理掉记录），重新创建
                    createStandaloneWindow();
                });
            } else {
                createStandaloneWindow();
            }
        });
    }
});

function createStandaloneWindow() {
    chrome.windows.create({
        url: 'popup.html',
        type: 'popup', // 以极简弹窗模式打开，没有地址栏和书签栏
        width: 520,
        height: 620,
        focused: true
    }, (window) => {
        // 记录窗口 ID
        chrome.storage.local.set({ notepadWindowId: window.id });
    });
}

// 监听窗口关闭事件，清理记录
chrome.windows.onRemoved.addListener((windowId) => {
    chrome.storage.local.get(['notepadWindowId'], function(result) {
        if (result.notepadWindowId === windowId) {
            chrome.storage.local.remove('notepadWindowId');
        }
    });
});
