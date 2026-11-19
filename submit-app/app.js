
const express = require("express");
const db = require("../db");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs/promises");
const path = require("path");
const amqp = require("amqplib");

const app = express();
const PORT = 3001;

// Cache configuration
const CACHE_DIR = "/cache";
const CACHE_FILE = path.join(CACHE_DIR, "types.json");

// RabbitMQ configuration
const QUEUE_NAME = "jokes_queue";
let channel;

app.use(express.json());
app.use(express.static("public"));

// ==========================================
// RABBITMQ CONNECTION
// ==========================================

async function connectRabbitMQ() {
    while (!channel) {
        try {
            const connection = await amqp.connect(
                process.env.RABBITMQ_URL
            );

            channel = await connection.createChannel();

            await channel.assertQueue(QUEUE_NAME, {
                durable: true
            });

            console.log("Connected to RabbitMQ");
            console.log(`Queue ready: ${QUEUE_NAME}`);

        } catch (error) {
            console.error(
                "RabbitMQ connection failed:",
                error.message
            );

            await new Promise(resolve =>
                setTimeout(resolve, 3000)
            );
        }
    }
}

// ==========================================
// GET /types
// Retrieve types from Joke service
// Update cache or use fallback
// ==========================================

app.get("/types", async (req, res) => {
    try {
        const response = await fetch(
            `${process.env.JOKE_SERVICE_URL}/types`
        );

        if (!response.ok) {
            throw new Error("Joke service request failed");
        }

        const data = await response.json();

        if (!Array.isArray(data.types)) {
            throw new Error("Invalid response from Joke service");
        }

        await fs.mkdir(CACHE_DIR, {
            recursive: true
        });

        await fs.writeFile(
            CACHE_FILE,
            JSON.stringify(data, null, 2)
        );

        console.log("Types retrieved from Joke service");
        console.log("Cache updated successfully");

        res.json(data);

    } catch (error) {
        console.error(
            "Joke service unavailable:",
            error.message
        );

        try {
            const cachedData = await fs.readFile(
                CACHE_FILE,
                "utf8"
            );

            const data = JSON.parse(cachedData);

            console.log("Returning cached joke types");

            res.json(data);

        } catch (cacheError) {
            console.error(
                "Cache unavailable:",
                cacheError.message
            );

            res.status(502).json({
                message: "Joke service unavailable and no cache exists"
            });
        }
    }
});

// ==========================================
// POST /submit
// CURRENTLY: Direct MySQL submission
// RabbitMQ publishing comes next
// ==========================================


app.post("/submit", async (req, res) => {
    try {
        const { setup, punchline, type } = req.body;

        // Validate submitted data
        if (
            !setup ||
            !punchline ||
            !type ||
            typeof setup !== "string" ||
            typeof punchline !== "string" ||
            typeof type !== "string" ||
            !setup.trim() ||
            !punchline.trim() ||
            !type.trim()
        ) {
            return res.status(400).json({
                message: "Please complete all fields."
            });
        }

        // Create the message
        const jokeMessage = {
            setup: setup.trim(),
            punchline: punchline.trim(),
            type: type.trim(),
            submittedAt: new Date().toISOString()
        };

        // Publish message to RabbitMQ
        const message = Buffer.from(
            JSON.stringify(jokeMessage)
        );

        const published = channel.sendToQueue(
            QUEUE_NAME,
            message,
            {
                persistent: true,
                contentType: "application/json"
            }
        );

        if (!published) {
            throw new Error("RabbitMQ write buffer is full");
        }

        console.log("Joke published to RabbitMQ:", jokeMessage);

        res.status(202).json({
            message: "Joke submitted successfully and queued for processing!"
        });

    } catch (error) {
        console.error("Joke submission error:", error);

        res.status(500).json({
            message: "Unable to submit joke"
        });
    }
});


// ==========================================
// SWAGGER DOCUMENTATION
// ==========================================

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
                    },
                    502: {
                        description: "Joke service unavailable and no cache exists"
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

                                required: [
                                    "setup",
                                    "punchline",
                                    "type"
                                ],

                                properties: {
                                    setup: {
                                        type: "string"
                                    },

                                    punchline: {
                                        type: "string"
                                    },

                                    type: {
                                        type: "string"
                                    }
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
                    },

                    500: {
                        description: "Submission failed"
                    }
                }
            }
        }
    }
};

// Swagger UI
app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// ==========================================
// START SERVER AFTER RABBITMQ CONNECTION
// ==========================================

connectRabbitMQ().then(() => {
    app.listen(PORT, () => {
        console.log(
            `Submit Application running on port ${PORT}`
        );
    });
});
