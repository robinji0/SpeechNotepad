let recognition;
let isRecording = false;
let mediaStream = null;
let textArea = document.getElementById('textArea');
let micBtn = document.getElementById('micBtn');
let statusText = document.getElementById('status');
let interimDiv = document.getElementById('interimText');

let copyBtn = document.getElementById('copyBtn');
let clearBtn = document.getElementById('clearBtn');
let historyList = document.getElementById('historyList');
let clearHistoryBtn = document.getElementById('clearHistoryBtn');

renderHistory();

if (!('webkitSpeechRecognition' in window)) {
    statusText.innerText = "抱歉，你的浏览器不支持语音识别功能。";
    micBtn.disabled = true;
} else {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    // 取消了 recognition.lang = 'zh-CN' 的硬编码
    // 现在系统会自动根据浏览器的默认语言环境进行自适应识别

    recognition.onstart = function() {
        isRecording = true;
        micBtn.innerText = "停止录音";
        micBtn.disabled = false;
        micBtn.classList.add('recording');
        statusText.innerText = "正在聆听中... (光标放在哪，字就打在哪)";
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
            statusText.innerText = "麦克风权限被拒绝，请检查浏览器设置。";
        } else {
            statusText.innerText = "发生错误: " + event.error;
        }
        forceStopRecording();
    };

    recognition.onend = function() {
        forceStopRecording();
    };

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            forceStopRecording();
        } else {
            startRecording();
        }
    });
}

function startRecording() {
    micBtn.disabled = true;
    micBtn.innerText = "准备中...";
    statusText.innerText = "正在请求麦克风权限...";

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            mediaStream = stream;
            try {
                recognition.start();
            } catch (e) {
                console.error("启动识别失败:", e);
                forceStopRecording();
            }
        })
        .catch(function(err) {
            console.error("麦克风权限异常:", err);
            statusText.innerHTML = "<span style='color: #ef4444;'>需在新标签页授权。正在为您跳转...</span>";
            setTimeout(() => {
                chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
                forceStopRecording();
            }, 1500);
        });
}

function forceStopRecording() {
    isRecording = false;
    micBtn.disabled = false;
    micBtn.innerText = "开始录音";
    micBtn.classList.remove('recording');

    if (statusText.innerText.includes("聆听中") || statusText.innerText.includes("准备中")) {
        statusText.innerText = "点击上方按钮开始说话...";
    }

    interimDiv.innerText = "";

    try {
        recognition.stop();
    } catch (e) {}

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
        copyBtn.innerText = "✓ 已复制并清空";
        copyBtn.style.backgroundColor = "#dcfce7";
        copyBtn.style.color = "#166534";
        copyBtn.style.borderColor = "#bbf7d0";

        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style = "";
        }, 1500);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动选取复制。');
    });
});

clearBtn.addEventListener('click', () => {
    textArea.value = "";
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
    renderHistory();
}

function renderHistory() {
    let history = JSON.parse(localStorage.getItem('speechHistory') || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        let emptyLi = document.createElement('li');
        emptyLi.style.color = '#9ca3af';
        emptyLi.style.fontSize = '12px';
        emptyLi.style.textAlign = 'center';
        emptyLi.style.backgroundColor = 'transparent';
        emptyLi.innerText = '暂无记录';
        historyList.appendChild(emptyLi);
        return;
    }

    history.forEach((text, index) => {
        let li = document.createElement('li');
        li.className = 'history-item';

        let textSpan = document.createElement('span');
        textSpan.className = 'history-item-text';
        textSpan.innerText = text;
        textSpan.title = "点击加载: " + text;

        let delBtn = document.createElement('button');
        delBtn.className = 'delete-single-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = "删除此条";

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
