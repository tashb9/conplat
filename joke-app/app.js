const express = require("express");
const db = require("../db");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

// GET /types
app.get("/types", async (req, res) => {
    const [rows] = await db.query(
        "SELECT name FROM types"
    );

    const types = rows.map(row => row.name);

    res.json({ types });
});

// GET /joke/:type?count
app.get("/joke/:type", async (req, res) => {
    const type = req.params.type;
    const count = Number(req.query.count) || 1;

    let rows;

    if (type.toLowerCase() === "any") {
        [rows] = await db.query(
            "SELECT setup, punchline FROM jokes ORDER BY RAND() LIMIT ?",
            [count]
        );
    } else {
        [rows] = await db.query(
            `SELECT jokes.setup, jokes.punchline
             FROM jokes
             JOIN types ON jokes.type_id = types.id
             WHERE LOWER(types.name) = LOWER(?)
             ORDER BY RAND()
             LIMIT ?`,
            [type, count]
        );
    }

    res.json(rows);
});

app.listen(PORT, () => {
    console.log(`Joke Service running on port ${PORT}`);
});