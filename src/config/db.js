// simple mongoose connect helper; import once in index.js
const mongoose = require("mongoose");

let isConnected = false;

async function connectDB(uri = process.env.MONGODB_URI) {
    if (!uri) throw new Error("MONGODB_URI is missing");
    if (isConnected) return mongoose.connection;

    mongoose.set("strictQuery", true);

    await mongoose.connect(uri, {
        autoIndex: true, // builds indexes in dev; fine for local
        maxPoolSize: 10,
    });

    isConnected = true;
    console.log("MongoDB connected");
    return mongoose.connection;
}

module.exports = { connectDB };
