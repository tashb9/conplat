const getJokeButton = document.getElementById("getJoke");
const jokeDisplay = document.getElementById("jokeDisplay");
const jokeTypeDropdown = document.getElementById("jokeType");

// Load joke types from API
async function loadJokeTypes() {
    const response = await fetch("/types");
    const data = await response.json();

    const selectedType = jokeTypeDropdown.value;

    jokeTypeDropdown.innerHTML = "";

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

// Get a random joke
getJokeButton.addEventListener("click", async () => {
    const selectedType = jokeTypeDropdown.value;

    const response = await fetch(`/joke/${selectedType}`);
    const data = await response.json();

    const joke = data[0];

    jokeDisplay.textContent = joke.setup;

    setTimeout(() => {
        jokeDisplay.textContent = joke.setup + "\n" + joke.punchline;
    }, 3000);
});