const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");
const deleteChatsBtn = document.querySelector("#delete-chats-btn");
const stopResponseBtn = document.querySelector("#stop-response-btn");
const addFileBtn = promptForm.querySelector("#add-file-btn");
const icon = themeToggle.querySelector("span");
const chatConfig = window.CHAT_CONFIG || {};

const STORAGE_KEYS = {
    theme: "policyguard-theme",
    history: "policyguard-rag-chat-history",
};

let typingInterval = null;
let controller = null;
const userData = { message: "", file: {} };
const chatHistory = [];

const escapeHtml = (value) => {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
};

const formatBotText = (text) => {
    let formatted = escapeHtml(text.trim());
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\n/g, "<br>");
    return formatted;
};

const scrollToBottom = () => {
    chatsContainer.scrollTop = chatsContainer.scrollHeight;
};

const saveChatHistory = () => {
    const serializableMessages = [...chatsContainer.querySelectorAll(".message")].map((message) => ({
        type: message.classList.contains("user-message") ? "user" : "bot",
        html: message.outerHTML,
    }));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(serializableMessages));
};

const restoreChatHistory = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.history);
    if (!saved) {
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return;
        }

        chatsContainer.innerHTML = "";
        parsed.forEach((item) => {
            if (item && typeof item.html === "string") {
                chatsContainer.insertAdjacentHTML("beforeend", item.html);
            }
        });
        container.classList.add("chats-active");
        bindCopyButtons();
        scrollToBottom();
    } catch (error) {
        console.error("Unable to restore chat history", error);
    }
};

const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

const getTimestamp = () => {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const bindCopyButtons = () => {
    chatsContainer.querySelectorAll(".copy-response-btn").forEach((button) => {
        if (button.dataset.bound === "true") {
            return;
        }

        button.dataset.bound = "true";
        button.addEventListener("click", async () => {
            const targetId = button.dataset.target;
            const textNode = document.getElementById(targetId);
            if (!textNode) {
                return;
            }

            try {
                await navigator.clipboard.writeText(textNode.textContent.trim());
                button.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => {
                    button.innerHTML = '<i class="fa-regular fa-copy"></i>';
                }, 1200);
            } catch (error) {
                console.error("Copy failed", error);
            }
        });
    });
};

const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.innerHTML = "";
    const words = text.split(" ");
    let index = 0;

    typingInterval = setInterval(() => {
        if (index < words.length) {
            const nextText = words.slice(0, index + 1).join(" ");
            textElement.innerHTML = formatBotText(nextText);
            botMsgDiv.classList.remove("loading");
            scrollToBottom();
            index += 1;
            return;
        }

        clearInterval(typingInterval);
        typingInterval = null;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
        bindCopyButtons();
        saveChatHistory();
    }, 28);
};

const showAttachmentPreview = () => {
    const helper = fileUploadWrapper.querySelector(".file-icon");
    if (!userData.file.data) {
        helper.textContent = "description";
        return;
    }

    helper.textContent = userData.file.isImage ? "image" : "description";
};

const resetAttachment = () => {
    userData.file = {};
    fileInput.value = "";
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
    fileUploadWrapper.querySelector(".file-preview").src = "#";
    showAttachmentPreview();
};

const addUserMessage = () => {
    const attachmentHtml = userData.file.data
        ? (
            userData.file.isImage
                ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" alt="${escapeHtml(userData.file.fileName)}" class="img-attachment">`
                : `<div class="file-attachment"><span class="material-symbols-rounded">description</span><span>${escapeHtml(userData.file.fileName)}</span></div>`
        )
        : "";

    const attachmentNote = userData.file.data
        ? `<div class="attachment-note">Attachment preview kept. RAG answers still come from the trained PDFs.</div>`
        : "";

    const userMsgHtml = `
        <div class="message-shell">
            <div class="message-meta">
                <span>You</span>
                <span>${getTimestamp()}</span>
            </div>
            <div class="message-text">${escapeHtml(userData.message)}</div>
            ${attachmentHtml}
            ${attachmentNote}
        </div>
    `;

    const userMsgDiv = createMsgElement(userMsgHtml, "user-message");
    chatsContainer.appendChild(userMsgDiv);
    saveChatHistory();
    scrollToBottom();
};

const addBotMessageShell = () => {
    const messageId = `bot-message-${Date.now()}`;
    const botMsgHtml = `
        <img src="${chatConfig.avatarUrl}" alt="PolicyGuard bot avatar" class="avatar">
        <div class="message-shell">
            <div class="message-meta">
                <span>Policy Chatbot</span>
                <div class="meta-actions">
                    <span>${getTimestamp()}</span>
                    <button type="button" class="copy-response-btn" data-target="${messageId}" aria-label="Copy answer">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="message-text" id="${messageId}">Checking your training data...</div>
        </div>
    `;

    const botMsgDiv = createMsgElement(botMsgHtml, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    bindCopyButtons();
    scrollToBottom();
    return botMsgDiv;
};

const askQuestion = async (question) => {
    controller = new AbortController();

    const response = await fetch(chatConfig.askUrl || "/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.answer || "Something went wrong.");
    }
    return data.answer || "I could not generate an answer.";
};

const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");

    try {
        const answer = await askQuestion(userData.message);
        typingEffect(answer, textElement, botMsgDiv);
    } catch (error) {
        clearInterval(typingInterval);
        typingInterval = null;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");

        if (error.name === "AbortError") {
            textElement.textContent = "Response stopped.";
        } else {
            textElement.innerHTML = formatBotText(
                error.message || "The chatbot could not reach the RAG backend."
            );
        }
        saveChatHistory();
    } finally {
        controller = null;
        resetAttachment();
    }
};

const hideHeaderAndSuggestions = () => {
    container.classList.add("chats-active");
};

const handleFormSubmit = (event) => {
    event.preventDefault();

    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) {
        return;
    }

    userData.message = userMessage;
    promptInput.value = "";
    document.body.classList.add("bot-responding");
    hideHeaderAndSuggestions();

    addUserMessage();
    const botMsgDiv = addBotMessageShell();
    generateResponse(botMsgDiv);
};

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) {
        return;
    }

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
        const base64String = event.target.result.split(",")[1];
        const preview = fileUploadWrapper.querySelector(".file-preview");

        preview.src = event.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = {
            fileName: file.name,
            data: base64String,
            mime_type: file.type,
            isImage,
        };
        showAttachmentPreview();
    };
});

document.querySelector("#cancel-file-btn").addEventListener("click", resetAttachment);

stopResponseBtn.addEventListener("click", () => {
    controller?.abort();
    if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
    }

    const loadingMessage = chatsContainer.querySelector(".bot-message.loading");
    if (loadingMessage) {
        loadingMessage.classList.remove("loading");
        const textNode = loadingMessage.querySelector(".message-text");
        if (textNode && !textNode.textContent.trim()) {
            textNode.textContent = "Response stopped.";
        }
    }

    document.body.classList.remove("bot-responding");
    saveChatHistory();
});

deleteChatsBtn.addEventListener("click", () => {
    chatsContainer.innerHTML = `
        <section class="welcome-panel">
            <img src="${chatConfig.avatarUrl}" alt="PolicyGuard bot avatar" class="welcome-avatar">
            <div class="welcome-copy">
                <p class="eyebrow">Policy Chatbot</p>
                <h3>Ask about insurance laws, claims, and policy language.</h3>
                <p>The chatbot answers from your loaded RAG documents. If the answer is missing in the PDFs, it should say so instead of guessing.</p>
            </div>
        </section>
    `;
    localStorage.removeItem(STORAGE_KEYS.history);
    document.body.classList.remove("bot-responding");
    container.classList.remove("chats-active");
    resetAttachment();
});

document.querySelectorAll(".suggestions-item").forEach((item) => {
    item.addEventListener("click", () => {
        const text = item.querySelector(".text")?.textContent?.trim();
        if (!text) {
            return;
        }

        promptInput.value = text;
        promptForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
});

const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) === "light";
document.body.classList.toggle("light-theme", savedTheme);
icon.textContent = savedTheme ? "dark_mode" : "light_mode";

themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-theme");
    icon.textContent = isLight ? "dark_mode" : "light_mode";
    localStorage.setItem(STORAGE_KEYS.theme, isLight ? "light" : "dark");
});

promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        promptForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
});

promptForm.addEventListener("submit", handleFormSubmit);
addFileBtn.addEventListener("click", () => fileInput.click());

restoreChatHistory();
showAttachmentPreview();
