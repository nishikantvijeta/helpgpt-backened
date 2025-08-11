import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Protect /thread routes only (user history related)
router.use("/thread", auth);

// Test route requires auth
router.post("/test", auth, async (req, res) => {
  try {
    const thread = new Thread({
      threadId: "abc",
      title: "Testing New Thread2",
      userId: req.userId,
    });

    const response = await thread.save();
    res.send(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to save in DB" });
  }
});

// Get all threads for logged-in user
router.get("/thread", async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(threads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

// Get single thread
router.get("/thread/:threadId", async (req, res) => {
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

// Delete a thread
router.delete("/thread/:threadId", async (req, res) => {
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

// Main chat route - allow guests (no auth required)
router.post("/chat", async (req, res) => {
  const { threadId, message } = req.body;
  console.log("Received:", threadId, message);

  if (!message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    if (req.userId) {
      // Authenticated user: save chat history
      let thread = await Thread.findOne({ threadId, userId: req.userId });

      if (!thread) {
        thread = new Thread({
          threadId,
          title: message,
          messages: [{ role: "user", content: message }],
          userId: req.userId,
        });
      } else {
        thread.messages.push({ role: "user", content: message });
      }

      const assistantReply = await getOpenAIAPIResponse(message);
      console.log("GPT reply:", assistantReply);

      if (!assistantReply || typeof assistantReply !== "string") {
        return res.status(500).json({ error: "Assistant failed to reply" });
      }

      thread.messages.push({ role: "assistant", content: assistantReply });
      thread.updatedAt = new Date();
      await thread.save();

      return res.json({ reply: assistantReply });
    } else {
      // Guest user: no saving, just get reply from OpenAI
      const assistantReply = await getOpenAIAPIResponse(message);
      console.log("GPT reply (guest):", assistantReply);

      if (!assistantReply || typeof assistantReply !== "string") {
        return res.status(500).json({ error: "Assistant failed to reply" });
      }

      return res.json({ reply: assistantReply });
    }
  } catch (err) {
    console.log("Error in /chat:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;




