import { createClient } from "redis";

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log("Connected to Redis");
    } catch (error) {
        console.error("Error connecting to Redis:", error);
    }
}

export { redisClient, connectRedis };