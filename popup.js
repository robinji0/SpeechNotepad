
const locales = {
    en: {
        title: "Voice Notepad",
        subtitle: "Cursor-first speech notes",
        workflowBadge: "Pause, edit, then continue at any cursor position",
        dictationLangShort: "Dictation",
        startBtn: "Start",
        stopBtn: "Stop",
        preparing: "Preparing...",
        statusDefault: "Ready. Click start and speak.",
        statusListening: "Listening... text will be inserted at the cursor.",
        statusMicRequest: "Requesting microphone access...",
        statusRedirect: "Microphone permission needs a new tab. Redirecting...",
        statusNoSupport: "Sorry, your browser doesn't support speech recognition.",
        statusMicDenied: "Microphone access denied. Please check browser settings.",
        statusError: "Error: ",
        placeholder: "Speak, pause, edit, and move the cursor anywhere to continue dictation...",
        copyBtn: "Copy",
        copiedMsg: "Copied",
        clearBtn: "Clear",
        recentTitle: "Recent",
        historySub: "Tap an item to load it back into the editor",
        clearHistoryBtn: "Clear all",
        emptyHistory: "No records yet",
        copyFail: "Copy failed. Please copy the text manually.",
        clickToLoad: "Click to load: ",
        deleteItem: "Delete this item",
        historyToggle: "History",
        cursorMode: "Insert at cursor",
        livePreview: "Live preview",
        shortcutLabel: "Shortcut",
        sponsorShort: "Sponsor",
        closeHistory: "Close",
        uiLangEn: "EN",
        uiLangZh: "中文"
    },
    zh: {
        title: "语音记事本",
        subtitle: "光标优先的语音记事本",
        workflowBadge: "暂停修改后，可从任意光标位继续录音",
        dictationLangShort: "识别语言",
        startBtn: "开始录音",
        stopBtn: "停止录音",
        preparing: "准备中...",
        statusDefault: "已准备就绪，点击开始录音。",
        statusListening: "正在聆听中，文字会插入到当前光标处。",
        statusMicRequest: "正在请求麦克风权限...",
        statusRedirect: "需要在新标签页授权麦克风，正在跳转...",
        statusNoSupport: "抱歉，你的浏览器不支持语音识别功能。",
        statusMicDenied: "麦克风权限被拒绝，请检查浏览器设置。",
        statusError: "发生错误：",
        placeholder: "先说一段，停下来修改，再把光标移到任意位置继续录音...",
        copyBtn: "复制",
        copiedMsg: "已复制",
        clearBtn: "清空",
        recentTitle: "最近转换",
        historySub: "点一下即可回到编辑区继续处理",
        clearHistoryBtn: "全部清空",
        emptyHistory: "暂无记录",
        copyFail: "复制失败，请手动复制。",
        clickToLoad: "点击加载：",
        deleteItem: "删除此条",
        historyToggle: "历史",
        cursorMode: "光标处插入",
        livePreview: "实时预览",
        shortcutLabel: "快捷键",
        sponsorShort: "赞助",
        closeHistory: "关闭",
        uiLangEn: "EN",
        uiLangZh: "中文"
    }
};

let currentUiLang = localStorage.getItem('appUiLang') || 'zh';
let currentSpeechLang = localStorage.getItem('appSpeechLang') || 'zh-CN';

let recognition = null;
let isRecording = false;
let mediaStream = null;
let currentStatusKey = 'statusDefault';
let currentStatusVariant = 'default';

const uiLangButtons = [...document.querySelectorAll('.ui-lang-btn')];
const speechLangSelect = document.getElementById('speechLangSelect');
const textArea = document.getElementById('textArea');
const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status');
const interimWrap = document.getElementById('interimWrap');
const interimDiv = document.getElementById('interimText');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const sponsorBtn = document.getElementById('sponsorBtn');
const shortcutLink = document.getElementById('shortcutLink');
const historyToggleBtn = document.getElementById('historyToggleBtn');
const historyCloseBtn = document.getElementById('historyCloseBtn');
const historySheet = document.getElementById('historySheet');
const historyCount = document.getElementById('historyCount');

function openExternalUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

function setStatus(key, variant = 'default', extraText = '') {
    const t = locales[currentUiLang];
    currentStatusKey = key;
    currentStatusVariant = variant;
    const baseText = t[key] || '';
    statusText.className = `status status-${variant}`;
    statusText.textContent = extraText ? `${baseText}${extraText}` : baseText;
}

function updateMicButton() {
    const t = locales[currentUiLang];
    micBtn.textContent = isRecording ? t.stopBtn : t.startBtn;
    micBtn.classList.toggle('recording', isRecording);
}

function updateUiLangSwitch() {
    uiLangButtons.forEach(btn => {
        const isActive = btn.dataset.lang === currentUiLang;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function updateHistoryCount() {
    const history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    historyCount.textContent = String(history.length);
}

function showInterim(text = '') {
    interimDiv.textContent = text;
    interimWrap.hidden = !text;
}

function toggleHistorySheet(open) {
    const shouldOpen = typeof open === 'boolean' ? open : historySheet.hidden;
    historySheet.hidden = !shouldOpen;
    historySheet.setAttribute('aria-hidden', String(!shouldOpen));
    if (shouldOpen) {
        renderHistory();
    }
}

function applyUiLanguage() {
    const t = locales[currentUiLang];

    document.documentElement.lang = currentUiLang === 'zh' ? 'zh-CN' : 'en';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    textArea.placeholder = t.placeholder;
    sponsorBtn.title = t.sponsorShort;
    sponsorBtn.setAttribute('aria-label', t.sponsorShort);
    updateMicButton();
    updateUiLangSwitch();
    updateHistoryCount();

    if (!('webkitSpeechRecognition' in window)) {
        setStatus('statusNoSupport', 'error');
        micBtn.disabled = true;
    } else if (currentStatusKey === 'statusListening' && isRecording) {
        setStatus('statusListening', 'listening');
    } else if (currentStatusVariant === 'error' && currentStatusKey === 'statusError') {
        // Preserve the exact error text already shown.
    } else if (currentStatusKey === 'statusMicDenied') {
        setStatus('statusMicDenied', 'error');
    } else if (currentStatusKey === 'statusMicRequest') {
        setStatus('statusMicRequest', 'warning');
    } else if (currentStatusKey === 'statusRedirect') {
        setStatus('statusRedirect', 'warning');
    } else {
        setStatus('statusDefault', 'default');
    }

    renderHistory();
}

speechLangSelect.value = currentSpeechLang;

uiLangButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const nextLang = btn.dataset.lang;
        if (!nextLang || nextLang === currentUiLang) return;
        currentUiLang = nextLang;
        localStorage.setItem('appUiLang', currentUiLang);
        applyUiLanguage();
    });
});

speechLangSelect.addEventListener('change', (e) => {
    currentSpeechLang = e.target.value;
    localStorage.setItem('appSpeechLang', currentSpeechLang);

    if (isRecording) {
        forceStopRecording();
        setTimeout(() => {
            startRecording();
        }, 320);
    }
});

shortcutLink.addEventListener('click', (e) => {
    e.preventDefault();
    openExternalUrl('chrome://extensions/shortcuts');
});

sponsorBtn.addEventListener('click', () => {
    openExternalUrl('https://www.paypal.com/paypalme/robin326753');
});

historyToggleBtn.addEventListener('click', () => {
    toggleHistorySheet(true);
});

historyCloseBtn.addEventListener('click', () => {
    toggleHistorySheet(false);
});

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('speechHistory');
    renderHistory();
    updateHistoryCount();
});

if (!('webkitSpeechRecognition' in window)) {
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
    if (isRecording) return;

    micBtn.disabled = true;
    micBtn.textContent = locales[currentUiLang].preparing;
    setStatus('statusMicRequest', 'warning');

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            mediaStream = stream;

            if (recognition) {
                recognition.onend = null;
                recognition.onerror = null;
                try { recognition.abort(); } catch (e) {}
            }

            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = currentSpeechLang;

            recognition.onstart = function() {
                isRecording = true;
                micBtn.disabled = false;
                updateMicButton();
                setStatus('statusListening', 'listening');
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
                    const cursorStart = textArea.selectionStart;
                    const cursorEnd = textArea.selectionEnd;

                    const textBefore = textArea.value.substring(0, cursorStart);
                    const textAfter = textArea.value.substring(cursorEnd);

                    textArea.value = textBefore + finalTranscript + textAfter;

                    const newCursorPos = cursorStart + finalTranscript.length;
                    textArea.selectionStart = textArea.selectionEnd = newCursorPos;
                    textArea.focus();
                }

                showInterim(interimTranscript);
            };

            recognition.onerror = function(event) {
                console.error('Speech error:', event.error);
                if (event.error === 'not-allowed') {
                    setStatus('statusMicDenied', 'error');
                } else if (event.error === 'aborted') {
                    // Ignore user-initiated aborts.
                } else {
                    currentStatusKey = 'statusError';
                    currentStatusVariant = 'error';
                    statusText.className = 'status status-error';
                    statusText.textContent = `${locales[currentUiLang].statusError}${event.error}`;
                }
                forceStopRecording(false);
            };

            recognition.onend = function() {
                if (isRecording) {
                    forceStopRecording(true);
                }
            };

            try {
                recognition.start();
            } catch (e) {
                console.error('Start failed:', e);
                forceStopRecording(true);
            }
        })
        .catch((err) => {
            console.error('Mic access error:', err);
            setStatus('statusRedirect', 'warning');
            setTimeout(() => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                    openExternalUrl(chrome.runtime.getURL('popup.html'));
                }
                forceStopRecording(true);
            }, 1200);
        });
}

function forceStopRecording(resetToDefault = true) {
    isRecording = false;
    micBtn.disabled = false;
    updateMicButton();
    showInterim('');

    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {}
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (resetToDefault) {
        setStatus('statusDefault', 'default');
    }
}

copyBtn.addEventListener('click', () => {
    const textToCopy = textArea.value.trim();
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        saveToHistory(textToCopy);
        forceStopRecording(true);
        textArea.value = '';

        const originalText = locales[currentUiLang].copyBtn;
        copyBtn.textContent = locales[currentUiLang].copiedMsg;
        copyBtn.classList.add('success');

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('success');
        }, 1400);
    }).catch((err) => {
        console.error('Copy failed:', err);
        alert(locales[currentUiLang].copyFail);
    });
});

clearBtn.addEventListener('click', () => {
    textArea.value = '';
    showInterim('');
    textArea.focus();
});

function saveToHistory(text) {
    let history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    history = history.filter(item => item !== text);
    history.unshift(text);
    if (history.length > 20) {
        history.pop();
    }
    localStorage.setItem('speechHistory', JSON.stringify(history));
    updateHistoryCount();
    renderHistory();
}

function loadHistoryItem(text) {
    textArea.value = text;
    textArea.focus();
    textArea.selectionStart = textArea.selectionEnd = text.length;
    toggleHistorySheet(false);
}

function renderHistory() {
    const t = locales[currentUiLang];
    const history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    historyList.innerHTML = '';
    updateHistoryCount();

    if (history.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'history-empty';
        emptyLi.textContent = t.emptyHistory;
        historyList.appendChild(emptyLi);
        return;
    }

    history.forEach((text, index) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.tabIndex = 0;

        const textSpan = document.createElement('span');
        textSpan.className = 'history-item-text';
        textSpan.textContent = text;
        textSpan.title = t.clickToLoad + text;

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-single-btn';
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.title = t.deleteItem;
        delBtn.setAttribute('aria-label', t.deleteItem);

        li.addEventListener('click', () => {
            loadHistoryItem(text);
        });

        li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                loadHistoryItem(text);
            }
        });

        delBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteFromHistory(index);
        });

        li.appendChild(textSpan);
        li.appendChild(delBtn);
        historyList.appendChild(li);
    });
}

function deleteFromHistory(index) {
    const history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    history.splice(index, 1);
    localStorage.setItem('speechHistory', JSON.stringify(history));
    renderHistory();
}

applyUiLanguage();
renderHistory();
showInterim('');
