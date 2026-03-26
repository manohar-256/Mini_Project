/* ═══════════════════════════════════════════════════════════════════════════
   PolicyGuard — Frontend Logic
   ═══════════════════════════════════════════════════════════════════════════ */

const chatMessages = document.getElementById("chat-messages");
const chatForm     = document.getElementById("chat-form");
const userInput    = document.getElementById("user-input");
const sendBtn      = document.getElementById("send-btn");
const suggestions  = document.getElementById("suggestions");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebar      = document.querySelector(".sidebar");

// ── Helpers ────────────────────────────────────────────────────────────────

function getTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Set welcome message time
document.getElementById("welcome-time").textContent = getTime();

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/** Convert basic markdown-like formatting to HTML */
function formatAnswer(text) {
    // Convert **bold**
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Convert *italic*
    text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    // Convert line breaks
    text = text.replace(/\n/g, "<br>");
    return text;
}

// ── Messages ───────────────────────────────────────────────────────────────

function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "message user-message";
    div.innerHTML = `
        <div class="message-avatar">You</div>
        <div class="message-content">
            <div class="message-bubble"><p>${escapeHtml(text)}</p></div>
            <span class="message-time">${getTime()}</span>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addBotMessage(text) {
    const div = document.createElement("div");
    div.className = "message bot-message";
    div.innerHTML = `
        <div class="message-avatar">⚖️</div>
        <div class="message-content">
            <div class="message-bubble"><p>${formatAnswer(text)}</p></div>
            <span class="message-time">${getTime()}</span>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function showTypingIndicator() {
    const div = document.createElement("div");
    div.className = "message bot-message";
    div.id = "typing-msg";
    div.innerHTML = `
        <div class="message-avatar">⚖️</div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById("typing-msg");
    if (el) el.remove();
}

// ── API Call ───────────────────────────────────────────────────────────────

async function askQuestion(question) {
    try {
        const resp = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
        });

        const data = await resp.json();
        return data.answer || "Sorry, something went wrong.";
    } catch (err) {
        console.error(err);
        return "Unable to connect to the server. Please try again.";
    }
}

// ── Event Handlers ─────────────────────────────────────────────────────────

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // Hide suggestions after first real question
    if (suggestions) suggestions.style.display = "none";

    addUserMessage(text);
    userInput.value = "";
    userInput.style.height = "auto";
    sendBtn.disabled = true;

    showTypingIndicator();

    const answer = await askQuestion(text);

    removeTypingIndicator();
    addBotMessage(answer);
    sendBtn.disabled = false;
    userInput.focus();
});

// Auto-resize textarea
userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

// Submit on Enter (Shift+Enter for newline)
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event("submit"));
    }
});

// Suggestion chips
function askSuggestion(btn) {
    userInput.value = btn.textContent;
    chatForm.dispatchEvent(new Event("submit"));
}

// Sidebar toggle (mobile)
sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        e.target !== sidebarToggle) {
        sidebar.classList.remove("open");
    }
});
