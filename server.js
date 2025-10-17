import Cerebras from '@cerebras/cerebras_cloud_sdk';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store website context (in production, use a database or session storage)
const contexts = new Map();

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, sessionId, currentContext } = req.body;

    // Build the system prompt based on whether this is initial generation or navigation
    let systemPrompt;
    let userPrompt;

    if (!currentContext) {
      // Initial website generation
      systemPrompt = `You are a creative web designer and developer. Generate a complete, functional HTML page for a random website concept. The HTML should be:
- Complete with <!DOCTYPE html>, head, and body tags
- Include inline CSS styles in a <style> tag for beautiful design
- Include inline JavaScript in a <script> tag for any interactivity
- Have multiple clickable elements (navigation links, buttons, etc.) that users can click on
- Be creative and unique - could be any type of website (business, game, blog, portfolio, store, etc.)
- Make it visually appealing with good design principles
- Include data-navigate attributes on clickable elements to enable navigation

Return ONLY the raw HTML code, no markdown formatting, no explanations.`;

      userPrompt = prompt || "Create a random, creative website";
    } else {
      // Navigation to a new page within the same website context
      systemPrompt = `You are a creative web designer and developer. You are generating a new page for an existing website.

The user is currently viewing this page:
${currentContext}

Generate a complete HTML page that fits within this website's theme and style. The page should:
- Match the EXACT design style, color scheme, fonts, and CSS styling from the current page
- Be a logical page within this website's structure (about, contact, services, products, etc.)
- Include similar navigation elements to the current page
- Maintain complete visual consistency with the existing website
- Include inline CSS styles that match the website's aesthetic
- Include inline JavaScript for interactivity
- Have clickable elements (links, buttons) for further navigation

Return ONLY the raw HTML code, no markdown formatting, no explanations.`;

      userPrompt = prompt;
    }

    // Store context for this session
    if (sessionId && !contexts.has(sessionId)) {
      contexts.set(sessionId, {
        initialPrompt: userPrompt,
        timestamp: Date.now()
      });
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ];

    const stream = await cerebras.chat.completions.create({
      messages: messages,
      model: 'qwen-3-235b-a22b-instruct-2507',
      stream: true,
      max_completion_tokens: 20000,
      temperature: 0.7,
      top_p: 0.8
    });

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }

    res.end();
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content', details: error.message });
  }
});

// Clean up old contexts (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [sessionId, context] of contexts.entries()) {
    if (context.timestamp < oneHourAgo) {
      contexts.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to see the magic!`);
});
