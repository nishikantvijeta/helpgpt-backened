import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";
import auth from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ---- Removed global auth ----
// router.use(auth);  <-- removed

// Protected routes with auth middleware
router.post("/test", auth, async (req, res) => {
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

router.get("/thread", auth, async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(threads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

router.get("/thread/:threadId", auth, async (req, res) => {
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

router.delete("/thread/:threadId", auth, async (req, res) => {
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

// Public /chat route with manual token check for optional user login
router.post("/chat", async (req, res) => {
  const { threadId, message } = req.body;
  console.log("Received:", threadId, message);

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Manually verify token and extract userId (if token provided)
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id || decoded.userId;  // adjust according to your JWT payload
    } catch (err) {
      // invalid token - ignore, treat as guest
      userId = null;
    }
  }

  try {
    let thread = null;

    if (userId) {
      thread = await Thread.findOne({ threadId, userId });

      if (!thread) {
        thread = new Thread({
          threadId,
          title: message,
          messages: [{ role: "user", content: message }],
          userId
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
  } catch (err) {
    console.log("Error in /chat:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;

