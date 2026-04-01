let recognition;
let isRecording = false;
let mediaStream = null;
let textArea = document.getElementById('textArea');
let micBtn = document.getElementById('micBtn');
let statusText = document.getElementById('status');
let interimDiv = document.getElementById('interimText');

// 新增按钮元素获取
let copyBtn = document.getElementById('copyBtn');
let clearBtn = document.getElementById('clearBtn');

// 初始化语音识别
if (!('webkitSpeechRecognition' in window)) {
    statusText.innerText = "抱歉，你的浏览器不支持语音识别功能。";
    micBtn.disabled = true;
} else {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

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

// ---------------- 新增功能逻辑 ----------------

// 复制全部内容
copyBtn.addEventListener('click', () => {
    if (!textArea.value) return; // 如果没有内容则不执行

    navigator.clipboard.writeText(textArea.value).then(() => {
        // 视觉反馈
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "✓ 已复制";
        copyBtn.style.backgroundColor = "#dcfce7";
        copyBtn.style.color = "#166534";
        copyBtn.style.borderColor = "#bbf7d0";

        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style = ""; // 恢复默认样式
        }, 1500);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动选取复制。');
    });
});

// 清空内容
clearBtn.addEventListener('click', () => {
    if (textArea.value.trim() === '') return;

    // 添加一个简单的确认，防止误触导致辛辛苦苦说了一堆的话丢失
    if (confirm("确定要清空所有内容吗？")) {
        textArea.value = "";
        textArea.focus();
    }
});
