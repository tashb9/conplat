
const amqp = require("amqplib");
const mysql = require("mysql2/promise");

// RabbitMQ configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = "jokes_queue";

// MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || "mysql",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "jokesdb",
    waitForConnections: true,
    connectionLimit: 10
});

// Connect to RabbitMQ and consume messages
async function startETL() {
    try {
        console.log("Connecting to RabbitMQ...");

        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, {
            durable: true
        });

        // Process one message at a time
        channel.prefetch(1);

        console.log("Connected to RabbitMQ");
        console.log(`Waiting for messages in ${QUEUE_NAME}`);

        channel.consume(QUEUE_NAME, async (message) => {
            if (message === null) return;

            try {
                // Extract message data
                const joke = JSON.parse(
                    message.content.toString()
                );

                const { setup, punchline, type } = joke;

                if (
                    typeof setup !== "string" || !setup.trim() ||
                    typeof punchline !== "string" || !punchline.trim() ||
                    typeof type !== "string" || !type.trim()
                ) {
                    throw new Error("Invalid joke message");
                }

                console.log("Received joke:", joke);

                // Create type if it doesn't already exist
                await db.query(
                    "INSERT IGNORE INTO types (name) VALUES (?)",
                    [type.trim()]
                );

                // Retrieve type ID
                const [types] = await db.query(
                    "SELECT id FROM types WHERE name = ?",
                    [type.trim()]
                );

                // Insert joke into MySQL
                await db.query(
                    `INSERT INTO jokes (type_id, setup, punchline)
                     VALUES (?, ?, ?)`,
                    [types[0].id, setup.trim(), punchline.trim()]
                );

                console.log("Joke successfully saved to MySQL");

                // Acknowledge only after successful database insertion
                channel.ack(message);

            } catch (error) {
                console.error("ETL processing failed:", error.message);

                // Reject failed messages without requeueing
                channel.nack(message, false, false);
            }
        });

    } catch (error) {
        console.error("ETL startup failed:", error);
        process.exit(1);
    }
}

// Start the ETL application
startETL();
