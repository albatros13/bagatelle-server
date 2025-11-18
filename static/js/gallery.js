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
    clearSelected();
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
    const selectedToolbar = document.getElementById('selected-toolbar');
    if ([...selectedImages].length > 0){
        selectedToolbar.style.display = 'flex';
    } else {
        selectedToolbar.style.display = 'none';
    }
}

// Create a relative path given a file name
function getImagePath(fileName) {
    return "./static/data/images/" + fileName;
}

function getHTMLPath(fileName){
    return "./static/data/html_claude-sonnet-4/" + fileName.replace(/\.[^/.]+$/, ".html");
}

// Get file name from relative or full path
function getFileName(src) {
    const parts = src.split(/[\\/]/);
    return parts[parts.length - 1];
}

// Get checkbox name to locate relevant checkboxes per image file
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
    try {
        initializeMagniview();
    } catch (e) {
        console.warn("Magniview re-initialization failed:", e);
    }
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

function sliderControl(ev){
  const sliderValue = document.getElementById('sliderValue');
  const parsedFloatEl = document.getElementById('parsedFloat');
  const intRepEl = document.getElementById('intRep');

  const raw = ev.target.value;
  sliderValue.textContent = raw;
  const v = parseFloat(raw);
  parsedFloatEl.textContent = v.toFixed(1);
  intRepEl.textContent = Math.round(v * 10);
}

// Submit password to get access to gallery
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
    // Search query
    const question = document.getElementById('query-input').value.trim();
    if (!question) {
        alert("Please enter a question.");
        return;
    }
    // Top K images to extract
    let k = parseInt(document.getElementById('k-input').value, 10);
    if (Number.isNaN(k)) k = 1;
    k = Math.max(1, Math.min(10, k));
    // LLM version to cross-check image relevance
    let llmModel = null
    const llmOptions = document.querySelector('input[name="llm_refine_choice"]:checked');
    if (llmOptions) {
        llmModel = document.querySelector('input[name="llm_refine_choice"]:checked').value;
    }
    // Weight of visual vs textual data for search
    const rawWeight = document.getElementById('slider').value;

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
            body: JSON.stringify({question: question, k: k, llm: llmModel, weight: rawWeight})
        });

        if (!resp.ok) {
            throw new Error(`Server returned ${resp.status} ${resp.statusText}`);
        }

        const response = await resp.json();
        const data = response["response"];
        if (!Array.isArray(data)) {
            throw new Error('Server response is not a JSON array of image URLs/paths.');
        }

        // selectedImages = new Set(data.map(x => getFileName(x)));
        data.forEach(item => {
            const fname = getFileName(item);
            selectedImages.add(fname);
        });
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

// Workshop form submission: collect params + selected images and call server LLM
async function submitWorkshopForm(ev) {
    ev.preventDefault();
    const statusEl = document.getElementById('workshop-status');

    const numDaysInput = document.getElementById('num-days');
    const themeInput = document.getElementById('theme');
    const audienceInput = document.getElementById('audience');

    const num_days = Math.max(1, Math.min(30, parseInt(numDaysInput.value || 3, 10)));
    const theme = (themeInput.value || "").trim();
    const audience = (audienceInput.value || "").trim();
    const llm_model = document.querySelector('input[name="llm_model"]:checked').value;

    if (!theme) {
        alert("Please provide a theme for the workshop.");
        return;
    }
    if (!audience) {
        alert("Please provide a target audience.");
        return;
    }

    // const llm_model = document.querySelector('input[name="llm_model"]:checked').value;
    const imagesArray = [...selectedImages]
    if (imagesArray.length === 0) {
        if (!confirm("No images selected. Generate programme without images?")) {
            return;
        }
    }

    if (imagesArray.length > 6) {
        alert("Please reduce the number of images, the service can process up to 6 images in one call.");
        return;
    }

    const context_type = document.querySelector('input[name="context"]:checked').value;

    const context = context_type === "images"? [...selectedImages].map(x => getImagePath(x)).join('\n')
        : [...selectedImages].map(x => getHTMLPath(x)).join('\n')

    statusEl.textContent = "Generating programme — please wait...";
    const content = document.getElementById('workshop-result-content');
    const btn = document.getElementById('workshop-submit');
    btn.disabled = true;

    try {
        const resp = await fetch("/generate_program", {
            method: "POST",
            headers: {"Content-Type": "application/json", "Accept": "application/json"},
            body: JSON.stringify({
                num_days: num_days,
                theme: theme,
                audience: audience,
                context_type: context_type,
                context: context,
                llm: llm_model
            })
        });

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Server returned ${resp.status}: ${txt}`);
        }

        const data = await resp.json();
        const programText = data["response"] || JSON.stringify(data);
        const prompt = data["prompt"] || "?"

        statusEl.textContent = "Programme generated.";
        showWorkshopProgram(programText, prompt);
    } catch (err) {
        console.error(err);
        statusEl.textContent = `Error: ${err.message || err}`;
        content.innerHTML = "";
        alert("Failed to generate programme. See console for details.");
    } finally {
        btn.disabled = false;
    }
}

// Call this after receiving `programText` from the server
function showWorkshopProgram(responseText, prompt) {
    const wToolbar = document.getElementById('workshop-result-toolbar');
    const wContent = document.getElementById('workshop-result-content');
    const wDownloadBtn = document.getElementById('workshop-download');
    const wClearBtn = document.getElementById('workshop-clear');
    const wPromptDownloadBtn = document.getElementById('prompt-download');

    if (!wContent) {
        console.error('showWorkshopProgram: element #workshop-result-content not found in DOM. Make sure gallery HTML is inserted and initialization ran after insertion.');
        return;
    }

    function extractHTML(responseText) {
      const htmlMatch = responseText.match(/```html\n?([\s\S]*?)```/i);
      if (htmlMatch) {
        return htmlMatch[1].trim();
      }
      return responseText.trim();
    }

    let htmlBody = extractHTML(responseText);

    if (!htmlBody || htmlBody.trim().length === 0) {
        wToolbar.style.display = 'none';
        wContent.innerHTML = "";
        return;
    }

    wContent.innerHTML = htmlBody;

    // Show toolbar and wire the download button
    wToolbar.style.display = 'flex';

    // Prepare an HTML file for download when the button is clicked
    wDownloadBtn.onclick = () => {
        const filename = `workshop_program_${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
        const blob = new Blob([htmlBody], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    wPromptDownloadBtn.onclick = () => {
        const filename = `prompt_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
        const blob = new Blob([prompt], { type: "text/txt" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    wClearBtn.onclick = () => {
         wContent.innerHTML = "";
         wToolbar.style.display = 'none';
         const themeInput = document.getElementById('theme');
         themeInput.value = "";
         const audienceInput = document.getElementById('audience');
         audienceInput.value = "";
    };
}

function clearSelected(){
     [...selectedImages].forEach(fileName => {
        const src = getImagePath(fileName);
        const chbName = getCheckboxName(src);
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][name=${chbName}`);
        checkboxes.forEach(c => c.checked = false);
    });
    selectedImages = new Set();
    const selectedContainer = document.getElementById("selected-image-container");
    selectedContainer.innerHTML = "";
    const selectedToolbar = document.getElementById('selected-toolbar');
    selectedToolbar.style.display = 'none';
}

// Global definitions and controls

const retrieveStatus = document.getElementById('retrieve-status');
const categories = Array.from(new Set(images.map(img => img["category"]))).sort();
const categoryAcronyms = {};
let selectedImages = new Set();

document.getElementById('llm-checkbox').addEventListener('change', updateLlmRadios);
document.getElementById("update-button").addEventListener("click", updateImages);
document.getElementById('retrieve-form').addEventListener('submit', submitSearchRequest);
document.getElementById('slider').addEventListener('input', sliderControl);
document.getElementById('workshop-form').addEventListener('submit', submitWorkshopForm);
document.getElementById('selected-clear').onclick = clearSelected;

// document.getElementById("rag-chat-form").addEventListener("submit", submitLLMQuestion);

const settingContainer = document.getElementById("settings-container");
settingContainer.style.marginRight = "20px";
settingContainer.style.minWidth = "300px";

// Initial setup
loadCategories();
displayImages(images);

