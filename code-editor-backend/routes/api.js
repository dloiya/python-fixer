const express = require('express');
const os = require('os');
const { VM } = require('vm2');
const { exec } = require('child_process');
const util = require('util');
const groqService = require('../services/groqService');
const path = require('path');
const fs = require('fs');


const router = express.Router();
const execPromise = util.promisify(exec);

// Execute code in a sandbox
router.post('/execute', async (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  console.log(code);

  try {
    let result;

    if (language === 'javascript') {
      // Execute JavaScript in VM2 sandbox
      const vm = new VM({
        timeout: 5000,
        sandbox: { console: { log: (...args) => args.join(' ') } }
      });
      
      try {
        // Capture console.log output
        let output = '';
        const customConsole = {
          log: (...args) => {
            output += args.join(' ') + '\n';
            return args.join(' ');
          }
        };
        
        // Inject custom console into sandbox
        vm.freeze(customConsole, 'console');
        
        // Execute the code
        const execResult = vm.run(code);
        
        // Return either the console output or the execution result
        result = output ? output : String(execResult);
      } catch (vmError) {
        throw new Error(`JavaScript execution error: ${vmError.message}`);
      }
    } else if (language === 'python') {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `code_${Date.now()}.py`);

      try {
        // Write the code to the temporary file
        fs.writeFileSync(tempFile, code, 'utf8');

        // Execute the Python script
        const { stdout, stderr } = await execPromise(`python "${tempFile}"`, { 
          timeout: 5000,
          maxBuffer: 1024 * 1024 // Increase buffer size if needed
        });

        // Clean up the temporary file
        fs.unlinkSync(tempFile);

        // Return the output (preferring stdout, falling back to stderr)
        return stdout.trim() || stderr.trim();
      } catch (error) {
        // If the file exists, try to remove it
        try {
          fs.unlinkSync(tempFile);
        } catch {}

        // Throw a more informative error
        throw new Error(`Python execution error: ${error.message}`);
      }
    } else {
      result = `Code execution for ${language} is not supported yet.`;
    }

    return res.json({ result: result || 'Code executed successfully (no output)' });
  } catch (error) {
    console.error('Code execution error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get AI suggestions
router.post('/suggest', async (req, res) => {
  const { code, language, execution_result } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const result = await groqService.getSuggestions(code, language, execution_result);
    return res.json(result);
  } catch (error) {
    console.error('AI suggestion error:', error);
    return res.status(500).json({ error: 'Failed to get AI suggestions' });
  }
});

// Execute terminal commands
router.post('/terminal', async (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'No command provided' });
  }

  // Whitelist of safe terminal commands
  const safeCommands = ['ls', 'pwd', 'echo', 'date', 'whoami', 'uname', 'node -v', 'npm -v', 'python --version'];
  
  // Check if command is safe
  const isSafe = safeCommands.some(safe => command === safe || command.startsWith(`${safe} `));
  
  if (!isSafe) {
    return res.json({ output: `Command not allowed: ${command}` });
  }

  try {
    const { stdout, stderr } = await execPromise(command, { timeout: 5000 });
    return res.json({ output: stdout || stderr });
  } catch (error) {
    return res.json({ output: `Error: ${error.message}` });
  }
});

module.exports = router;