const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle=document.querySelector("#theme-toggle-btn");
const icon = themeToggle.querySelector("span");


const API_KEY = "AIzaSyAS_-me0YMAWgPLpcZJAbmIXtSuFPj7DOU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const userData = { message: "", file: {} };
const chatHistory = [];


const trimChatHistory = () => {
    const MAX_MESSAGES = 12;
    if (chatHistory.length > MAX_MESSAGES) {
        chatHistory.splice(0, chatHistory.length - MAX_MESSAGES);
    }
};

const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};


const scrollToBottom = () => {
    chatsContainer.scrollTop = chatsContainer.scrollHeight;
};

const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let i = 0;

    typingInterval = setInterval(() => {
        if (i < words.length) {
            textElement.textContent += (i === 0 ? "" : " ") + words[i++];
            botMsgDiv.classList.remove("loading");
             
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
             botMsgDiv.classList.remove("loading");
               document.body.classList.remove("bot-responding");
        }
    }, 40);
};

const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController(); 


    chatHistory.push({
        role: "user",
        parts: [
            { text: userData.message },
            ...(userData.file.data ? [{ inline_data: { data: userData.file.data, mime_type: userData.file.mime_type } }] : [])
        ]
    });

    trimChatHistory();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        let responseText = data.candidates[0].content.parts[0].text;
        responseText = responseText.replace(/\*\*(.*?)\*\*/g, "$1").trim();

        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    } catch (err) {
        if (err.name === "AbortError") {
            textElement.textContent = " Response stopped.";
        } else {
            textElement.textContent = "Something went wrong.";
        }
    } finally {
        userData.file = {};
    }
};

const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage|| document.body.classList.contains("bot-responding")) return;


    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");


    const userMsgHtml = `
        <p class="message-text">${userMessage}</p>
        ${userData.file.data 
            ? (userData.file.isImage
                ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attached" />`
                : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
              )
            : ""
        }
    `;

    const userMsgDiv = createMsgElement(userMsgHtml, "user-message");
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();


    setTimeout(() => {
        const botMsgHtml = `
            <img src="chatbot.png" class="avatar">
            <p class="message-text">Just a sec...</p>
        `;

        const botMsgDiv = createMsgElement(botMsgHtml, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();

        generateResponse(botMsgDiv);
    }, 600);
};


fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];

        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = {
            fileName: file.name,
            data: base64String,
            mime_type: file.type,
            isImage
        };
    };
});


document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});


document.querySelector("#stop-response-btn").addEventListener("click", () => {
    controller?.abort();
    clearInterval(typingInterval);
       chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
               document.body.classList.remove("bot-responding");
});




document.querySelector("#delete-chats-btn").addEventListener("click", () => {
chatHistory.length=0;
chatsContainer.innerHTML= "";
document.body.classList.remove("bot-responding","chats-active");
});

document.querySelectorAll(".suggestions-item").forEach(item=>{
    item.addEventListener("click",()=>{
        promptInput.value=item.querySelector("").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});







const savedTheme = localStorage.getItem("themeColor") === "light";
document.body.classList.toggle("light-theme", savedTheme);


icon.textContent = savedTheme ? "dark_mode" : "light_mode";


themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-theme");


    icon.textContent = isLight ? "dark_mode" : "light_mode";


    localStorage.setItem("themeColor", isLight ? "light" : "dark");
});




const hideHeaderAndSuggestions = () => {
    const container = document.querySelector(".container");
    container.classList.add("chats-active");
};


document.getElementById("send-prompt-btn").addEventListener("click", hideHeaderAndSuggestions);

document.querySelector(".prompt-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.value.trim() !== "") {
        hideHeaderAndSuggestions();
    }
});

promptForm.addEventListener("submit", handleFormSubmit);


promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
