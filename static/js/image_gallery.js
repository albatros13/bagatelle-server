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

function updateSelected(selectedImages) {
    const selectedContainer = document.getElementById("selected-image-container");
    selectedContainer.innerHTML = "";
    [...selectedImages].forEach((imageSrc) => {
        const label = imageSrc.replace(/^.*[\\/]/, '');
        const link = imageSrc.replace(/^.*[\\/]/, "").replace(/\.[^/.]+$/, ".html");
        let thumbnailFigure = createThumbnailFigure(imageSrc, label, link);
        selectedContainer.appendChild(thumbnailFigure);
    });
}

function toggleImageSelection(event) {
    event.preventDefault();
    const checkbox = event.target;
    const imageSrc = checkbox.parentElement.querySelector('img').src;

    if (checkbox.checked) {
        selectedImages.add(imageSrc);
    } else {
        selectedImages.delete(imageSrc);
    }
    updateSelected(selectedImages);
}

function createLink(folder, filename, label) {
    let link = document.createElement("a");
    link.href = folder + filename;
    link.target = "_blank";
    link.innerText = label;
    return link;
}

function createThumbnailFigure(src, label, link) {
    const thumbnail = document.createElement("img");
    thumbnail.src = src;
    thumbnail.classList.add("thumbnail");
    thumbnail.title = thumbnail.src.replace(/^.*[\\/]/, '');
    //Figure
    const thumbnailFigure = document.createElement("figure")
    const thumbnailCaption = document.createElement("figcaption")

    const linksContainer = document.createElement("div");
    linksContainer.classList.add("linkColumn");
    linksContainer.appendChild(createLink("./static/data/html_claude-sonnet-4/", link, "Claude-sonnet-4"));
    linksContainer.appendChild(createLink("./static/data/html_gpt-4o/", link, "GPT-4o"));
    linksContainer.appendChild(createLink("./static/data/html_gpt-5/", link, "GPT-5"));

    const labelElem = document.createElement("div");
    labelElem.innerText = label;
    labelElem.classList.add("imageLabel");

    thumbnailCaption.appendChild(labelElem);
    thumbnailCaption.appendChild(linksContainer);

    thumbnailFigure.appendChild(thumbnail);
    thumbnailFigure.appendChild(thumbnailCaption);
    //thumbnailFigure.setAttribute("data-gallery", "bagatelle");
    thumbnailFigure.setAttribute("data-magniview", "bagatelle");
    return thumbnailFigure;
}

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
        //Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', toggleImageSelection);
        checkbox.classList.add(`imageCheckbox`)
        thumbnailFigure.appendChild(checkbox);
    });
}

// Definitions

// Attach submit handler for the retrieval form
const form = document.getElementById('retrieve-form');
const statusEl = document.getElementById('retrieve-status');

const categories = Array.from(new Set(images.map(img => img["category"]))).sort();
const categoryAcronyms = {};
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

document.addEventListener('DOMContentLoaded', initializeMagniview);
document.getElementById("update-button").addEventListener("click", updateImages);
document.getElementById("settings-container").style.marginRight = "20px";
document.getElementById("settings-container").style.minWidth = "300px";

let selectedImages = new Set();

form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const question = document.getElementById('query-input').value.trim();
    let k = parseInt(document.getElementById('k-input').value, 10);
    if (!question) {
        alert("Please enter a question.");
        return;
    }
    if (Number.isNaN(k)) k = 1;
    k = Math.max(1, Math.min(10, k));

    // Display loading status
    statusEl.textContent = `Retrieving top ${k} images...`;
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
            body: JSON.stringify({question: question, k: k})
        });

        if (!resp.ok) {
            throw new Error(`Server returned ${resp.status} ${resp.statusText}`);
        }

        const response = await resp.json();
        const data = response["response"];
        if (!Array.isArray(data)) {
            throw new Error('Server response is not a JSON array of image URLs/paths.');
        }

        selectedImages = new Set(data);
        updateSelected(selectedImages);

        statusEl.textContent = `Retrieved ${data.length} images.`;
    } catch (err) {
        console.error(err);
        statusEl.textContent = `Error retrieving images: ${err.message || err}`;
        alert("Failed to retrieve images. See console for details.");
    } finally {
        btn.disabled = false;
    }
});

document.getElementById("rag-chat-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const userInput = document.getElementById("rag-user-input");
    const question = userInput.value.trim();
    if (!question) return;
    addMessageToRagChat("user", question);
    userInput.value = "";

    let context = [...selectedImages].join('\n');

    // Send the question to the Flask backend
    const response = await fetch("/ask_llm", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({question: question, context: context}),
    });

    let res = await response.text()
    try {
        const result = JSON.parse(res)
        addMessageToRagChat("system", result.response);
    } catch (error) {
        addMessageToRagChat("system", res);
    }
});

// Function to add message to the chat box
function addMessageToRagChat(sender, message) {
    const chatBox = document.getElementById("rag-chat-box");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");
    messageElement.classList.add(`${sender}-message`);
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Initial display of all images
displayImages(images);

