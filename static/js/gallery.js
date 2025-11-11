import {initializeMagniview} from './magniview/main.js';

// Filter images by selected categories
function updateImages() {
    const selectedCategories = Array.from(
        document.querySelectorAll('#checkbox-container input[type="checkbox"]:checked')
    ).map((checkbox) => checkbox.value);

    const filteredImages = (selectedCategories.length > 0) ? images.filter((image) =>
        selectedCategories.includes(image.category)
    ) : [...images];
    displayImages(filteredImages);

    selectedImages = new Set();
    const selectedContainer = document.getElementById("selected-image-container");
    selectedContainer.innerHTML = "";

    // Magniview is initialized on DOMContentLoaded, trigger it to update the gallery
    window.document.dispatchEvent(new Event("DOMContentLoaded", {
        bubbles: true,
        cancelable: true
    }));
}

// Update visual block with selected images
function updateSelected(selectedImages, updateCheckboxes = true) {
    const selectedContainer = document.getElementById("selected-image-container");
    selectedContainer.innerHTML = "";

    [...selectedImages].forEach(fileName => {
        const src = getImagePath(fileName);
        const link = fileName.replace(/\.[^/.]+$/, ".html");
        let thumbnailFigure = createThumbnailFigure(src, fileName, link);
        selectedContainer.appendChild(thumbnailFigure);

        //Sync checkboxes
        if (updateCheckboxes) {
            const chbName = getCheckboxName(src);
            const checkboxes = document.querySelectorAll(`input[type="checkbox"][name=${chbName}`);
            checkboxes.forEach(c => c.checked = true);
        }
    });
}


function getImagePath(fileName) {
    return "./static/data/images/" + fileName;
}

function getFileName(src) {
    const parts = src.split(/[\\/]/);
    return parts[parts.length - 1];
}

function getCheckboxName(src) {
    return "chb_" + getFileName(src).replace(/[^a-zA-Z0-9]/g, "_");
}

// Create a link for image caption
function createLink(folder, filename, label) {
    let link = document.createElement("a");
    link.href = folder + filename;
    link.target = "_blank";
    link.innerText = label;
    return link;
}

// Create a figure to show image and associated information
function createThumbnailFigure(src, label, link) {
    const maxLength = 30;
    const thumbnail = document.createElement("img");
    thumbnail.src = src;
    thumbnail.classList.add("thumbnail");
    thumbnail.title = getFileName(src);
    //Figure
    const thumbnailFigure = document.createElement("figure")
    const thumbnailCaption = document.createElement("figcaption")

    const linksContainer = document.createElement("div");
    linksContainer.classList.add("linkColumn");
    linksContainer.appendChild(createLink("./static/data/html_claude-sonnet-4/", link, "Claude-sonnet-4"));
    linksContainer.appendChild(createLink("./static/data/html_gpt-4o/", link, "GPT-4o"));
    linksContainer.appendChild(createLink("./static/data/html_gpt-5/", link, "GPT-5"));

    const labelElem = document.createElement("div");
    labelElem.innerText = label.length > maxLength ? label.slice(0, maxLength - 1) + "…" : label;
    labelElem.classList.add("imageLabel");

    thumbnailCaption.appendChild(labelElem);
    thumbnailCaption.appendChild(linksContainer);

    thumbnailFigure.appendChild(thumbnail);
    thumbnailFigure.appendChild(thumbnailCaption);
    //thumbnailFigure.setAttribute("data-gallery", "bagatelle");
    thumbnailFigure.setAttribute("data-magniview", "bagatelle");

    //Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add(`imageCheckbox`)
    checkbox.name = getCheckboxName(src);
    thumbnailFigure.appendChild(checkbox);
    checkbox.addEventListener('change', toggleImageSelection);

    checkbox.checked = selectedImages.has(getFileName(src));

    return thumbnailFigure;
}

// Add/remove image from selected list on checkbox toggle
function toggleImageSelection(event) {
    event.preventDefault();
    const checkbox = event.target;
    const src = checkbox.parentElement.querySelector('img').src;
    const fileName = getFileName(src)

    const isChecked = checkbox.checked;
    if (isChecked) {
        selectedImages.add(fileName);
    } else {
        selectedImages.delete(fileName);
    }
    const chbName = getCheckboxName(src);
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name=${chbName}`);
    checkboxes.forEach(c => c.checked = isChecked);
    updateSelected(selectedImages, false);
}

// Load images into catalogue
function displayImages(images) {
    const imageContainer = document.getElementById("image-container");
    imageContainer.innerHTML = "";
    images.forEach((image, index) => {
        let label = `Image ${index + 1}`
        if (image.category) {
            label += `(${categoryAcronyms[image.category]})`;
        }
        let thumbnailFigure = createThumbnailFigure(
            'static/data/images/' + image.name, label, image.link);
        imageContainer.appendChild(thumbnailFigure);
    });
}

// Toggle rado group for LLM refined search
function updateLlmRadios(e) {
    let enabled = e.target.checked;
    // Prefer a wrapper element if present
    const wrapper = document.getElementById('llm-options');
    if (wrapper) {
        const radios = wrapper.querySelectorAll('input[type="radio"]');
        radios.forEach(r => {
            r.disabled = !enabled;
            if (!enabled) r.checked = false;
        });
        if (radios.length > 0 && enabled) {
            radios[0].checked = true;
        }
    }
}

// Populate category selection panel
function loadCategories() {
    let prevNum = 0;
    let prevLetter = "";
    categories.forEach(category => {
        let a = category[0]
        if (a === prevLetter) {
            prevNum += 1;
        } else {
            prevLetter = a;
            prevNum = 1;
        }
        categoryAcronyms[category] = a + prevNum;
    });
    const checkboxContainer = document.getElementById("checkbox-container");
    categories.forEach(category => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = category;
        label.appendChild(checkbox);
        const count = images.filter(image => image.category === category).length;
        label.appendChild(document.createTextNode(category + " (" + categoryAcronyms[category] + ") - " + count));
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(document.createElement("br"));
    });
}

// Add message to the chat box
function addMessageToRagChat(sender, message) {
    const chatBox = document.getElementById("rag-chat-box");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");
    messageElement.classList.add(`${sender}-message`);
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function login() {
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("error-msg");
    const loginContainer = document.getElementById("login-container");

    const password = passwordInput.value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({password})
        });

        const result = await response.json();
        console.log(result);
        if (result.success) {
            loginContainer.style.display = "none";
        } else {
            errorMsg.textContent = result.error || "Login failed";
        }

    } catch (err) {
        errorMsg.textContent = "Server error";
        console.error(err);
    }
}

// Submit request to the server to retrieve images
async function submitSearchRequest(ev) {
    ev.preventDefault();
    const question = document.getElementById('query-input').value.trim();
    let k = parseInt(document.getElementById('k-input').value, 10);
    if (!question) {
        alert("Please enter a question.");
        return;
    }
    if (Number.isNaN(k)) k = 1;
    k = Math.max(1, Math.min(10, k));

    let llm_model = null
    const llm_options = document.querySelector('input[name="llm_refine_choice"]:checked');
    if (llm_options) {
        llm_model = document.querySelector('input[name="llm_refine_choice"]:checked').value;
    }

    // Display loading status
    retrieveStatus.textContent = `Retrieving top ${k} images...`;
    const btn = document.getElementById('retrieve-btn');
    btn.disabled = true;

    try {
        // POST JSON payload to server endpoint. Change URL if backend expects a different path.
        const resp = await fetch('/retrieve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({question: question, k: k, llm: llm_model})
        });

        if (!resp.ok) {
            throw new Error(`Server returned ${resp.status} ${resp.statusText}`);
        }

        const response = await resp.json();
        const data = response["response"];
        if (!Array.isArray(data)) {
            throw new Error('Server response is not a JSON array of image URLs/paths.');
        }

        selectedImages = new Set(data.map(x => getFileName(x)));
        updateSelected(selectedImages);

        retrieveStatus.textContent = `Retrieved ${data.length} images.`;
    } catch (err) {
        console.error(err);
        retrieveStatus.textContent = `Error retrieving images: ${err.message || err}`;
        alert("Failed to retrieve images. See console for details.");
    } finally {
        btn.disabled = false;
    }
}

// Submit a question to a selected LLM about selected images
async function submitLLMQuestion(event) {
    event.preventDefault();

    const userInput = document.getElementById("rag-user-input");
    const question = userInput.value.trim();
    if (!question) return;
    addMessageToRagChat("user", question);
    userInput.value = "";

    const llm_model = document.querySelector('input[name="llm_model"]:checked').value;

    let context = [...selectedImages].map(x => getImagePath(x)).join('\n');

    // Send the question to the Flask backend
    const response = await fetch("/ask_llm", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({question: question, context: context, llm: llm_model}),
    });

    let res = await response.text()
    try {
        const result = JSON.parse(res)
        addMessageToRagChat("system", result.response);
    } catch (error) {
        addMessageToRagChat("system", res);
    }
}

// Global definitions and controls

const retrieveStatus = document.getElementById('retrieve-status');
const categories = Array.from(new Set(images.map(img => img["category"]))).sort();
const categoryAcronyms = {};
let selectedImages = new Set();

document.addEventListener('DOMContentLoaded', initializeMagniview);
document.getElementById('llm-checkbox').addEventListener('change', updateLlmRadios);
document.getElementById("update-button").addEventListener("click", updateImages);
document.getElementById('retrieve-form').addEventListener('submit', submitSearchRequest);
document.getElementById("rag-chat-form").addEventListener("submit", submitLLMQuestion);
document.getElementById("settings-container").style.marginRight = "20px";
document.getElementById("settings-container").style.minWidth = "300px";


// Initial setup
loadCategories();
displayImages(images);

