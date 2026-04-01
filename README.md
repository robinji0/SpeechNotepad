# 🎙️ Speech Notepad (Insert at Cursor)

[🇨🇳 简体中文](README_zh-CN.md) | [🇬🇧 English](README.md)

**Speech Notepad** is a smart, seamless, and highly efficient speech-to-text Chrome extension.

It solves the biggest pain point of traditional voice typing extensions: **text overwriting**. With Speech Notepad, you can pause speaking, manually edit your text, place your cursor anywhere, and resume speaking—your newly dictated words will be inserted **exactly at the cursor position** without destroying your previous work.

## ✨ Key Features

* 🎯 **Precise Cursor Insertion:** "Point and shoot." New speech results are inserted exactly where your cursor is. Never overwrites your existing text.
* ⌨️ **Global Shortcut (Cross-App Usage):** Not limited to the Chrome browser! Set a global shortcut (e.g., `Ctrl+Shift+S`) to instantly pop up a standalone voice notepad window over any application (IDEA, VSCode, Word, etc.).
* 🌍 **Multi-Language Dictation:** Separates the UI language from the dictation language. Supports accurate voice recognition for multiple languages (English, Chinese, Japanese, Korean, French, German, Spanish) regardless of your system's default language.
* 📋 **One-Click Copy & Auto-Clear:** Click "Copy All" to copy your text to the clipboard, stop recording, and clear the pad for your next thought in one fluid motion.
* 🕒 **Smart History Management:** Automatically saves your recent conversions. Accidentally cleared your text? Just click a history item to instantly load it back.
* 🌗 **Bilingual Interface:** Toggle between English and Chinese UI instantly.

## 🚀 Installation

Currently, the extension can be loaded manually via Chrome Developer Mode.

1. Download or `git clone` this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (the toggle switch in the top right corner).
4. Click the **Load unpacked** button in the top left corner.
5. Select the folder containing the extension files.
6. Pin the extension to your toolbar for easy access!

## 💡 How to Use Global Shortcuts

Want to use this extension while coding in your IDE or writing a document?

1. Go to `chrome://extensions/shortcuts` in your Chrome browser.
2. Find **Speech Notepad**.
3. Under "全局唤起语音记事本 (跨软件)" / "Global Window", set your preferred shortcut (e.g., `Ctrl+Shift+S` or `Cmd+Shift+S`).
4. **Crucial:** Change the dropdown menu next to it from "In Chrome" to **"Global"**.
5. Minimize Chrome, open any other app, press your shortcut, and start dictating!

## 🔒 Privacy & Security

This extension utilizes the native Chrome Web Speech API. All speech recognition is handled directly by your browser. We **do not** collect, store, or transmit your voice data or text to any third-party servers. Your history is saved entirely locally on your device via `localStorage`.

## ☕ Support

If this extension saves you time and boosts your productivity, consider buying the developer a coffee!
[Sponsor](https://www.paypal.com/paypalme/robin326753)
