const express = require("express");
const router = express.Router();
const Session = require("../models/Session");

// GET /api/sessions/:roomId — load saved session
router.get("/:roomId", async (req, res) => {
  try {
    const session = await Session.findOne({ roomId: req.params.roomId });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions — save session manually
router.post("/", async (req, res) => {
  try {
    const { roomId, code, language, files } = req.body;
    const session = await Session.findOneAndUpdate(
      { roomId },
      { code, language, files, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
