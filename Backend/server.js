import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 10000;

// Middleware
app.use(express.json());
app.use(cors());

// Public Auth Routes
app.use("/api/auth", authRoutes);

// Protected Chat Routes
app.use("/api", chatRoutes);

// Ping test route
app.get("/ping", (req, res) => {
    res.send("pong");
});

// MongoDB connection and server start
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(" Connected to MongoDB");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(` Server listening on 0.0.0.0:${PORT}`);
        });
    } catch (err) {
        console.error(" MongoDB connection failed:", err);
        process.exit(1);
    }
};

startServer();

// import express from "express";
// import "dotenv/config";
// import cors from "cors";
// import mongoose from "mongoose";
// import chatRoutes from "./routes/chat.js";
// import authRoutes from "./routes/auth.js"; // <-- Add this line

// const app = express();
// const PORT = Number(process.env.PORT) || 10000;

// // Middleware
// app.use(express.json());
// app.use(cors());

// // Public Auth Routes (register, login)
// app.use("/api/auth", authRoutes); // <-- Add this line

// // Protected Chat Routes
// app.use("/api", chatRoutes);

// //  Ping test route
// app.get("/ping", (req, res) => {
//     res.send("pong");
// });

// //  Start server and connect DB
// // app.listen(PORT, () => {
// //     console.log(` Server running on http://localhost:${PORT}`);
// //     connectDB();
// // });
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server listening on 0.0.0.0:${PORT}`);
// });
// //  MongoDB connection
// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.MONGODB_URI, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//         });
//         console.log(" Connected to MongoDB");
//     } catch (err) {
//         console.error(" MongoDB connection failed:", err);
//         process.exit(1);
//     }
// };
