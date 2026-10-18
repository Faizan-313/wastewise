import mongoose from "mongoose";

let connection: Promise<typeof mongoose> | undefined;

export function connectDatabase(): Promise<typeof mongoose> {
    if (mongoose.connection.readyState === 1) {
        return Promise.resolve(mongoose);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        return Promise.reject(new Error("MONGODB_URI is missing from environment variables"));
    }

    connection ??= mongoose.connect(uri).catch((error: unknown) => {
        connection = undefined;
        throw error;
    });
    return connection;
}