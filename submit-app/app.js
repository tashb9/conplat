const express = require("express");
const db = require("../db");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static("public"));

// GET /types
app.get("/types", async (req, res) => {
    const [rows] = await db.query(
        "SELECT name FROM types ORDER BY name"
    );

    res.json({ types: rows.map(row => row.name) });
});

// POST /submit
app.post("/submit", async (req, res) => {
    const { setup, punchline, type } = req.body;

    if (!setup || !punchline || !type) {
        return res.status(400).json({
            message: "Please complete all fields."
        });
    }

    await db.query(
        "INSERT IGNORE INTO types (name) VALUES (?)",
        [type]
    );

    const [types] = await db.query(
        "SELECT id FROM types WHERE name = ?",
        [type]
    );

    await db.query(
        "INSERT INTO jokes (type_id, setup, punchline) VALUES (?, ?, ?)",
        [types[0].id, setup, punchline]
    );

    res.status(201).json({
        message: "Joke submitted successfully!"
    });
});

// Swagger documentation
const swaggerDocument = {
    openapi: "3.0.0",
    info: {
        title: "Submit Application API",
        version: "1.0.0",
        description: "API for submitting jokes and retrieving joke types."
    },
    servers: [
        {
            url: "http://localhost:3001"
        }
    ],
    paths: {
        "/types": {
            get: {
                summary: "Get all joke types",
                responses: {
                    200: {
                        description: "List of joke types"
                    }
                }
            }
        },
        "/submit": {
            post: {
                summary: "Submit a new joke",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["setup", "punchline", "type"],
                                properties: {
                                    setup: { type: "string" },
                                    punchline: { type: "string" },
                                    type: { type: "string" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: "Joke submitted successfully"
                    },
                    400: {
                        description: "Incomplete submission"
                    }
                }
            }
        },
        "/docs": {
            get: {
                summary: "View API documentation",
                responses: {
                    200: {
                        description: "Swagger UI documentation"
                    }
                }
            }
        }
    }
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
    console.log(`Submit Application running on port ${PORT}`);
});