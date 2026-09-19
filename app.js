const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const uploadMessage = document.getElementById("uploadMessage");

const questionInput = document.getElementById("questionInput");
const askButton = document.getElementById("askButton");
const reviseButton = document.getElementById("reviseButton");
const answer = document.getElementById("answer");

let uploadedFileName = "";

uploadButton.addEventListener("click", async function () {
    const selectedFile = fileInput.files[0];

    if (!selectedFile) {
        uploadMessage.textContent = "Please choose a PDF or TXT file first.";
        return;
    }

    const formData = new FormData();
    formData.append("notes", selectedFile);

    uploadMessage.textContent = "Uploading and reading your notes...";
    uploadButton.disabled = true;

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            uploadedFileName = data.fileName;
            uploadMessage.textContent = data.message + " File: " + data.fileName;
        } else {
            uploadMessage.textContent = data.message;
        }

    } catch (error) {
        uploadMessage.textContent = "Server error. Please try again.";
    } finally {
        uploadButton.disabled = false;
    }
});

askButton.addEventListener("click", async function () {
    const question = questionInput.value.trim();

    if (uploadedFileName === "") {
        answer.textContent = "Please upload study notes first.";
        return;
    }

    if (question === "") {
        answer.textContent = "Please enter a question.";
        return;
    }

    answer.textContent = "Thinking about your question...";
    askButton.disabled = true;

    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ question: question })
        });

        const data = await response.json();

        if (data.success) {
            answer.textContent = data.answer;
        } else {
            answer.textContent = data.message || "Something went wrong.";
        }
    } catch (error) {
        answer.textContent = "Server error. Please try again.";
    } finally {
        askButton.disabled = false;
    }
});

reviseButton.addEventListener("click", async function () {
    if (uploadedFileName === "") {
        answer.textContent = "Please upload study notes first.";
        return;
    }

    await sendToAI("/revise", {}, "Creating revision material from your notes...");
});

async function sendToAI(url, body, loadingText) {
    answer.textContent = loadingText;
    askButton.disabled = true;
    reviseButton.disabled = true;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            answer.textContent = data.answer;
        } else {
            answer.textContent = data.message || "Something went wrong.";
        }
    } catch (error) {
        answer.textContent = "Server error. Please try again.";
    } finally {
        askButton.disabled = false;
        reviseButton.disabled = false;
    }
}
