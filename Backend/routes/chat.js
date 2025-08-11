import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";
import auth from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ---- Apply auth middleware ONLY to routes that require login ----
const protectedRoutes = express.Router();
protectedRoutes.use(auth);

// Protected test route
protectedRoutes.post("/test", async (req, res) => {
  try {
    const thread = new Thread({
      threadId: "abc",
      title: "Testing New Thread2",
      userId: req.userId
    });

    const response = await thread.save();
    res.send(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to save in DB" });
  }
});

// Get all threads for logged-in user
protectedRoutes.get("/thread", async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(threads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

// Get a single thread (only if it belongs to the user)
protectedRoutes.get("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;

  try {
    const thread = await Thread.findOne({ threadId, userId: req.userId });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread.messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

// Delete a thread (only if it belongs to the user)
protectedRoutes.delete("/thread/:threadId", async (req, res) => {
  const { threadId } = req.params;

  try {
    const deletedThread = await Thread.findOneAndDelete({ threadId, userId: req.userId });

    if (!deletedThread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.status(200).json({ success: "Thread deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

// Mount all protected routes under router
router.use(protectedRoutes);

// --- Middleware to optionally decode token and set req.userId if token valid ---
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id || decoded.userId; // adjust based on your token payload
    } catch (err) {
      // invalid token, ignore and continue as guest
      req.userId = null;
    }
  } else {
    req.userId = null; // no token provided
  }
  next();
}

// Chat route — accessible to all but saves history only if logged in
router.post("/chat", optionalAuth, async (req, res) => {
  const { threadId, message } = req.body;
  console.log("Received:", threadId, message);

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  let thread = null;

  if (req.userId) {
    thread = await Thread.findOne({ threadId, userId: req.userId });
    if (!thread) {
      thread = new Thread({
        threadId,
        title: message,
        messages: [{ role: "user", content: message }],
        userId: req.userId
      });
    } else {
      thread.messages.push({ role: "user", content: message });
    }
  }

  const assistantReply = await getOpenAIAPIResponse(message);
  console.log("GPT reply:", assistantReply);

  if (!assistantReply || typeof assistantReply !== "string") {
    return res.status(500).json({ error: "Assistant failed to reply" });
  }

  if (thread) {
    thread.messages.push({ role: "assistant", content: assistantReply });
    thread.updatedAt = new Date();
    await thread.save();
  }

  res.json({ reply: assistantReply });
});

export default router;


