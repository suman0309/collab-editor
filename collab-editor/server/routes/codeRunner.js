const express = require("express");
const axios = require("axios");
const router = express.Router();

// Judge0 language IDs
const LANGUAGE_IDS = {
  javascript: 63, // Node.js 12
  python: 71,     // Python 3.8
  cpp: 54,        // C++ (GCC 9.2)
  java: 62,       // Java 13
  typescript: 74, // TypeScript 3.7
  go: 60,
  rust: 73,
};

// POST /api/run
router.post("/", async (req, res) => {
  const { code, language, stdin } = req.body;
  const langId = LANGUAGE_IDS[language];

  if (!langId) return res.status(400).json({ error: `Unsupported language: ${language}` });
  if (!process.env.JUDGE0_API_KEY) {
    return res.status(503).json({ error: "Code execution not configured. Add JUDGE0_API_KEY to .env" });
  }

  try {
    // Create submission
    const submitRes = await axios.post(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=false",
      { source_code: code, language_id: langId, stdin: stdin || "" },
      {
        headers: {
          "X-RapidAPI-Key": process.env.JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      }
    );

    const token = submitRes.data.token;

    // Poll for result (max 10s)
    let result;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const pollRes = await axios.get(
        `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
        {
          headers: {
            "X-RapidAPI-Key": process.env.JUDGE0_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        }
      );
      result = pollRes.data;
      if (result.status?.id > 2) break; // Not queued/processing
    }

    res.json({
      stdout: result.stdout || "",
      stderr: result.stderr || result.compile_output || "",
      status: result.status?.description || "Unknown",
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
