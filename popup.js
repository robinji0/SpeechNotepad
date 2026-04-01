const locales = {
    en: {
        title: "Voice Notepad",
        sponsor: "Sponsor",
        dictationLang: "🎙️ Dictation Lang:",
        startBtn: "Start Recording",
        stopBtn: "Stop Recording",
        preparing: "Preparing...",
        statusDefault: "Click the button above to start speaking...",
        statusListening: "Listening... (Inserts at cursor)",
        statusMicRequest: "Requesting microphone access...",
        statusRedirect: "<span style='color: #ef4444;'>Need authorization in a new tab. Redirecting...</span>",
        statusNoSupport: "Sorry, your browser doesn't support speech recognition.",
        statusMicDenied: "Microphone access denied. Please check browser settings.",
        statusError: "Error occurred: ",
        placeholder: "Your text will appear here. You can pause, edit manually, and place the cursor anywhere to continue recording...",
        copyBtn: "Copy All",
        copiedMsg: "✓ Copied & Cleared",
        clearBtn: "Clear Content",
        recentTitle: "Recent Conversions",
        clearHistoryBtn: "Clear All",
        emptyHistory: "No records",
        copyFail: "Failed to copy, please select manually.",
        clickToLoad: "Click to load: ",
        deleteItem: "Delete this item",
        shortcutHint: "⌨️ Shortcuts: Chrome (Alt+S) | ",
        shortcutLink: "Set Global Shortcut"
    },
    zh: {
        title: "语音记事本",
        sponsor: "赞助",
        dictationLang: "🎙️ 录音识别语言:",
        startBtn: "开始录音",
        stopBtn: "停止录音",
        preparing: "准备中...",
        statusDefault: "点击上方按钮开始说话...",
        statusListening: "正在聆听中... (光标放在哪，字就打在哪)",
        statusMicRequest: "正在请求麦克风权限...",
        statusRedirect: "<span style='color: #ef4444;'>需在新标签页授权。正在为您跳转...</span>",
        statusNoSupport: "抱歉，你的浏览器不支持语音识别功能。",
        statusMicDenied: "麦克风权限被拒绝，请检查浏览器设置。",
        statusError: "发生错误: ",
        placeholder: "你的文字会出现在这里。你可以随时暂停，手动修改，然后把光标放在任意位置继续录音...",
        copyBtn: "复制全部",
        copiedMsg: "✓ 已复制并清空",
        clearBtn: "清空内容",
        recentTitle: "最近转换",
        clearHistoryBtn: "全部清空",
        emptyHistory: "暂无记录",
        copyFail: "复制失败，请手动选取复制。",
        clickToLoad: "点击加载: ",
        deleteItem: "删除此条",
        shortcutHint: "⌨️ 快捷键: 浏览器内 (Alt+S) | ",
        shortcutLink: "配置全局跨软件唤起"
    }
};

let currentUiLang = localStorage.getItem('appUiLang') || 'en';
let currentSpeechLang = localStorage.getItem('appSpeechLang') || 'zh-CN';

let recognition = null; // 不再设为全局唯一实例，初始为 null
let isRecording = false;
let mediaStream = null;

const uiLangSelect = document.getElementById('uiLangSelect');
const speechLangSelect = document.getElementById('speechLangSelect');
const textArea = document.getElementById('textArea');
const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status');
const interimDiv = document.getElementById('interimText');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const sponsorBtn = document.getElementById('sponsorBtn');
const shortcutLink = document.getElementById('shortcutLink');

function applyUiLanguage() {
    const t = locales[currentUiLang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerHTML = t[key];
    });

    textArea.placeholder = t.placeholder;

    if (isRecording) {
        micBtn.innerText = t.stopBtn;
        statusText.innerText = t.statusListening;
    } else {
        micBtn.innerText = t.startBtn;
        if (!statusText.innerText.includes('Error') && !statusText.innerText.includes('错误') && !statusText.innerText.includes('拒绝') && !statusText.innerText.includes('denied')) {
            statusText.innerText = t.statusDefault;
        }
    }
    renderHistory();
}

uiLangSelect.value = currentUiLang;
uiLangSelect.addEventListener('change', (e) => {
    currentUiLang = e.target.value;
    localStorage.setItem('appUiLang', currentUiLang);
    applyUiLanguage();
});

speechLangSelect.value = currentSpeechLang;
speechLangSelect.addEventListener('change', (e) => {
    currentSpeechLang = e.target.value;
    localStorage.setItem('appSpeechLang', currentSpeechLang);
    // 如果录音中途切换了语言，先停掉，稍微延时确保释放后自动重启
    if (isRecording) {
        forceStopRecording();
        setTimeout(() => {
            startRecording();
        }, 300);
    }
});

applyUiLanguage();

shortcutLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// 初始化检查
if (!('webkitSpeechRecognition' in window)) {
    statusText.innerText = locales[currentUiLang].statusNoSupport;
    micBtn.disabled = true;
} else {
    micBtn.addEventListener('click', () => {
        if (isRecording) {
            forceStopRecording();
        } else {
            startRecording();
        }
    });
}

function startRecording() {
    if (isRecording) return; // 防连击

    micBtn.disabled = true;
    micBtn.innerText = locales[currentUiLang].preparing;
    statusText.innerText = locales[currentUiLang].statusMicRequest;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            mediaStream = stream;

            // --- 核心修复区：每次录音都实例化全新的引擎，规避状态冲突 ---
            if (recognition) {
                // 彻底销毁旧实例，并解绑事件防止出现“幽灵回调”
                recognition.onend = null;
                recognition.onerror = null;
                try { recognition.abort(); } catch(e) {}
            }

            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = currentSpeechLang;

            recognition.onstart = function() {
                isRecording = true;
                micBtn.innerText = locales[currentUiLang].stopBtn;
                micBtn.disabled = false;
                micBtn.classList.add('recording');
                statusText.innerText = locales[currentUiLang].statusListening;
                textArea.focus();
            };

            recognition.onresult = function(event) {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript !== '') {
                    let cursorStart = textArea.selectionStart;
                    let cursorEnd = textArea.selectionEnd;

                    const textBefore = textArea.value.substring(0, cursorStart);
                    const textAfter = textArea.value.substring(cursorEnd, textArea.value.length);

                    textArea.value = textBefore + finalTranscript + textAfter;

                    let newCursorPos = cursorStart + finalTranscript.length;
                    textArea.selectionStart = textArea.selectionEnd = newCursorPos;
                    textArea.focus();
                }

                interimDiv.innerText = interimTranscript;
            };

            recognition.onerror = function(event) {
                console.error("Speech error:", event.error);
                if (event.error === 'not-allowed') {
                    statusText.innerText = locales[currentUiLang].statusMicDenied;
                } else if (event.error === 'aborted') {
                    // 主动打断属于正常现象，静默忽略
                } else {
                    statusText.innerText = locales[currentUiLang].statusError + event.error;
                }
                forceStopRecording();
            };

            recognition.onend = function() {
                // 引擎自然断开时，恢复界面状态
                if (isRecording) {
                    forceStopRecording();
                }
            };

            try {
                recognition.start();
            } catch (e) {
                console.error("Start failed:", e);
                forceStopRecording();
            }
        })
        .catch(function(err) {
            console.error("Mic access error:", err);
            statusText.innerHTML = locales[currentUiLang].statusRedirect;
            setTimeout(() => {
                chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
                forceStopRecording();
            }, 1500);
        });
}

function forceStopRecording() {
    isRecording = false;
    micBtn.disabled = false;
    micBtn.innerText = locales[currentUiLang].startBtn;
    micBtn.classList.remove('recording');

    const t = locales[currentUiLang];
    if (statusText.innerText === t.statusListening || statusText.innerText === t.preparing) {
        statusText.innerText = t.statusDefault;
    }

    interimDiv.innerText = "";

    if (recognition) {
        try {
            recognition.stop(); // 温和地停止录音，让最后一段话能够正常上屏
        } catch (e) {}
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

copyBtn.addEventListener('click', () => {
    const textToCopy = textArea.value.trim();
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        saveToHistory(textToCopy);
        forceStopRecording();
        textArea.value = "";

        const originalText = copyBtn.innerText;
        copyBtn.innerText = locales[currentUiLang].copiedMsg;
        copyBtn.style.backgroundColor = "#dcfce7";
        copyBtn.style.color = "#166534";
        copyBtn.style.borderColor = "#bbf7d0";

        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style = "";
        }, 1500);
    }).catch(err => {
        console.error('Copy failed:', err);
        alert(locales[currentUiLang].copyFail);
    });
});

clearBtn.addEventListener('click', () => {
    textArea.value = "";
    textArea.focus();
});

sponsorBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.paypal.com/paypalme/robin326753' });
});

function saveToHistory(text) {
    let history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    history = history.filter(item => item !== text);
    history.unshift(text);
    if (history.length > 20) {
        history.pop();
    }
    localStorage.setItem('speechHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const t = locales[currentUiLang];
    let history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        let emptyLi = document.createElement('li');
        emptyLi.style.color = '#9ca3af';
        emptyLi.style.fontSize = '12px';
        emptyLi.style.textAlign = 'center';
        emptyLi.style.backgroundColor = 'transparent';
        emptyLi.innerText = t.emptyHistory;
        historyList.appendChild(emptyLi);
        return;
    }

    history.forEach((text, index) => {
        let li = document.createElement('li');
        li.className = 'history-item';

        let textSpan = document.createElement('span');
        textSpan.className = 'history-item-text';
        textSpan.innerText = text;
        textSpan.title = t.clickToLoad + text;

        let delBtn = document.createElement('button');
        delBtn.className = 'delete-single-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = t.deleteItem;

        li.addEventListener('click', () => {
            textArea.value = text;
            textArea.focus();
            textArea.selectionStart = textArea.selectionEnd = text.length;
        });

        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFromHistory(index);
        });

        li.appendChild(textSpan);
        li.appendChild(delBtn);
        historyList.appendChild(li);
    });
}

function deleteFromHistory(index) {
    let history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    history.splice(index, 1);
    localStorage.setItem('speechHistory', JSON.stringify(history));
    renderHistory();
}

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('speechHistory');
    renderHistory();
});
