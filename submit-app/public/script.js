const jokeForm = document.getElementById("jokeForm");
const jokeTypeDropdown = document.getElementById("jokeType");
const newTypeInput = document.getElementById("newType");
const message = document.getElementById("message");

// Load joke types from the database
async function loadJokeTypes() {
    const response = await fetch("/types");
    const data = await response.json();

    const selectedType = jokeTypeDropdown.value;

    jokeTypeDropdown.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a type";
    jokeTypeDropdown.appendChild(defaultOption);

    data.types.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        jokeTypeDropdown.appendChild(option);
    });

    if (data.types.includes(selectedType)) {
        jokeTypeDropdown.value = selectedType;
    }
}

// Load types when page opens
loadJokeTypes();

// Refresh types when dropdown is opened
jokeTypeDropdown.addEventListener("focus", loadJokeTypes);

// Submit joke
jokeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const setup = document.getElementById("setup").value.trim();
    const punchline = document.getElementById("punchline").value.trim();

    const type = newTypeInput.value.trim() || jokeTypeDropdown.value;

    if (!setup || !punchline || !type) {
        message.textContent = "Please complete all fields.";
        return;
    }

    const response = await fetch("/submit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            setup,
            punchline,
            type
        })
    });

    const data = await response.json();

    message.textContent = data.message;

    if (response.ok) {
        jokeForm.reset();
        loadJokeTypes();
    }
});