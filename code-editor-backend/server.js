const express = require('express');
const cors = require('cors');
const os = require('os');
const { Groq } = require('groq-sdk');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const expressip = require('express-ip');
const connectDB = require('./config/db');
const sessionService = require('./services/sessionService');

// Load environment variables from .env file if exists
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(expressip().getIpInfoMiddleware);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "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"
});

// Session endpoints
app.post('/api/session/save', async (req, res) => {
  try {
    const { code, language } = req.body;
    const ipAddress = req.ipInfo.ip || req.ip;

    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    const session = await sessionService.saveSession(ipAddress, code, language);
    res.json({ message: 'Session saved successfully', session });
  } catch (error) {
    console.error('Session save error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.get('/api/session/load', async (req, res) => {
  try {
    const ipAddress = req.ipInfo.ip || req.ip;
    const session = await sessionService.getSession(ipAddress);
    
    if (!session) {
      return res.status(404).json({ 
        error: 'No saved session found',
        defaultCode: `# Welcome to Python Sandbox\ndef hello_world():\n    print("Hello, Sandbox World!")\n\nhello_world()`
      });
    }
    
    res.json({ session });
  } catch (error) {
    console.error('Session load error:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// Endpoint for AI code suggestions
app.post('/api/suggest', async (req, res) => {
  try {
    const { code } = req.body;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a Python code improvement assistant. Provide concise, practical suggestions for code optimization, readability, and potential improvements. Focus on Python best practices."
        },
        {
          role: "user",
          content: `Provide specific suggestions for improving this Python code:\n\n${code}`
        }
      ],
      model: "llama3-8b-8192"
    });

    const suggestion = chatCompletion.choices[0]?.message?.content || "No suggestions available.";
    res.json({ suggestion });
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Endpoint for code execution
app.post('/api/shell', (req, res) => {
  const { command } = req.body;
  
  // Validate input
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Invalid command input' });
  }

  // Options for command execution
  const options = {
    timeout: 10000, // 10 second timeout
    maxBuffer: 1024 * 1024, // 1MB max buffer
    shell: os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash'
  };

  // Execute shell command
  exec(command, options, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ 
        output: stderr || error.message,
        error: true
      });
    }

    res.json({ 
      output: stdout || 'Command executed successfully',
      error: false
    });
  });
});

// Existing code execution endpoint (from previous implementation)
app.post('/api/run', (req, res) => {
  const { code } = req.body;
  
  // Validate input
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code input' });
  }

  // Create a unique temporary filename
  const tempFileName = `temp_code_${Date.now()}.py`;
  const tempFile = path.join(__dirname, tempFileName);

  try {
    // Write code to temporary file
    fs.writeFileSync(tempFile, code);

    // Execute Python script with timeout
    const process = exec(`python "${tempFile}"`, { 
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024 // 1MB max buffer
    }, (error, stdout, stderr) => {
      // Always attempt to remove the temporary file
      try {
        fs.unlinkSync(tempFile);
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError);
      }

      if (error) {
        return res.status(500).json({ 
          output: stderr || error.message,
          error: true
        });
      }

      res.json({ 
        output: stdout,
        error: false
      });
    });
  } catch (writeError) {
    res.status(500).json({ 
      output: `Failed to write temp file: ${writeError.message}`,
      error: true
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});