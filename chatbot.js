const chatBox = document.getElementById("aiChatBox");
const questionInput = document.getElementById("aiQuestion");
const sendButton = document.getElementById("aiSendButton");
const quickQuestions = document.querySelectorAll(".ai-question");

if (chatBox && questionInput && sendButton) {
    function escapeHTML(text) {
        const div = document.createElement("div");
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatResponse(text) {
        let result = escapeHTML(text);
        result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        result = result.replace(/\n/g, "<br>");
        return result;
    }

    function addMessage(message, type) {
        const div = document.createElement("div");
        div.className = "ai-message " + type;

        const avatar = type === "bot" ? "🤖" : "👨‍🌾";
        div.innerHTML = `
            <div class="ai-avatar">${avatar}</div>
            <div class="ai-bubble">
                ${type === "bot" ? "<strong>AI Farmer Assistant</strong>" : ""}
                <div>
                    ${type === "bot" ? formatResponse(message) : escapeHTML(message)}
                </div>
            </div>
        `;

        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement("div");
        div.id = "typingIndicator";
        div.className = "ai-message bot";
        div.innerHTML = `
            <div class="ai-avatar">🤖</div>
            <div class="ai-bubble">
                <strong>AI Farmer Assistant</strong>
                <div class="ai-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTyping() {
        const typing = document.getElementById("typingIndicator");
        if (typing) typing.remove();
    }

    async function sendQuestion() {
        const question = questionInput.value.trim();

        if (!question) {
            questionInput.focus();
            return;
        }

        addMessage(question, "user");
        questionInput.value = "";
        sendButton.disabled = true;
        sendButton.textContent = "…";
        showTyping();

        try {
            const language = localStorage.getItem("selectedLanguage") || "en";
            let crops = [];

            try {
                crops = JSON.parse(localStorage.getItem("crops") || "[]");
                if (!Array.isArray(crops)) crops = [];
            } catch {
                crops = [];
            }

            const response = await fetch("http://localhost:3000/api/farmer-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, language, crops })
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error("Invalid response from server.");
            }

            if (!response.ok) {
                throw new Error(data.error || "Server error");
            }

            if (!data.reply) {
                throw new Error("Gemini returned no response.");
            }

            removeTyping();
            addMessage(data.reply, "bot");
        } catch (error) {
            console.error(error);
            removeTyping();
            addMessage(
                "⚠️ AI connection failed.<br><br>" +
                escapeHTML(error.message) +
                "<br><br>Make sure the Node.js server is running.",
                "bot"
            );
        }

        sendButton.disabled = false;
        sendButton.textContent = "➤";
    }

    sendButton.addEventListener("click", sendQuestion);
    questionInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendQuestion();
        }
    });

    quickQuestions.forEach(function (button) {
        button.addEventListener("click", function () {
            questionInput.value = this.dataset.question;
            sendQuestion();
        });
    });
}