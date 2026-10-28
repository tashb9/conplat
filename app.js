const express = require("express");

const app = express();
const PORT = 3000;

// endpoint 1
app.get("/joke", (req, res) => {
    res.json({
        joke: "Why do programmers prefer dark mode? Because light attracts bugs!"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "Joke Service"
    });
});

app.listen(PORT, () => {
    console.log(`Joke Service running on port ${PORT}`);
});