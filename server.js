import Cerebras from '@cerebras/cerebras_cloud_sdk';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY
});

// Load keywords from JSON file
const keywordsData = JSON.parse(readFileSync(join(__dirname, 'keywords.json'), 'utf-8'));
const keywords = keywordsData.keywords;

// Function to get random keywords
function getRandomKeywords(count = 10) {
  const shuffled = [...keywords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

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
      // Get random keywords to inspire variety
      const randomWords = getRandomKeywords(5);  // Reduced to 5 for clarity
      console.log('Selected keywords:', randomWords);

      systemPrompt = `You are an expert web designer creating a visually stunning website for: ${randomWords.join(', ')}

MANDATORY REQUIREMENTS:
- Create a website that is themed around: ${randomWords.join(', ')}
- Example: if keywords are "dental, toys" then make "Dental Toys for Kids" NOT "Creative Design Studio"

DESIGN REQUIREMENTS - MAKE IT IMPRESSIVE:
- Use modern, eye-catching color gradients and schemes
- Include stunning visual effects (hover effects, animations, transitions)
- Use creative layouts with interesting sections and cards
- Add beautiful typography with multiple font weights
- Include CSS animations and smooth transitions
- Make it look like a premium, professional website
- Use modern CSS features (flexbox, grid, box-shadows, border-radius)
- Add interactive elements with JavaScript
- Make buttons and links have satisfying hover effects
- Give the website a surreal, dreamlike, ethereal atmosphere (but do NOT use the word "dream" anywhere in the website)
- Use unconventional color combinations and flowing animations to create an otherworldly feel

The HTML must:
- Have <!DOCTYPE html>, head, body tags
- Include impressive inline CSS in <style> tag
- Include inline JavaScript for interactivity
- Have clickable links/buttons with data-navigate attributes
- IMPORTANT: ALL buttons must have data-navigate attribute and be clickable - no decorative non-clickable buttons
- Every button in the hero section MUST be functional and navigable

Return ONLY raw HTML, no markdown, no explanations.`;

      userPrompt = prompt || `Create a visually stunning, impressive website for a business called "${randomWords[0]} ${randomWords[1]}" that sells/provides ${randomWords[2]} and ${randomWords[3]} services. Make it look modern, beautiful, and professional with amazing visual design.`;
    } else {
      // Navigation to a new page within the same website context
      systemPrompt = `You are an expert web designer generating a new page for an existing website.

The user is currently viewing this page:
${currentContext}

Generate a complete HTML page that fits within this website's theme and style. The page should:
- Match the design style, color scheme, fonts, and CSS styling from the current page
- You can reuse CSS from the previous page but adapt it as needed. For example, I don't expect a hero section on every page.
- Be a logical page within this website's structure (about, contact, services, products, etc.)
- Include inline CSS in <style> tag that matches the website's aesthetic
- Include inline JavaScript for interactivity if needed
- Have clickable elements (links, buttons) for further navigation with data-navigate attributes

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

    console.log('\n=== SYSTEM PROMPT ===');
    console.log(systemPrompt);
    console.log('\n=== USER PROMPT ===');
    console.log(userPrompt);
    console.log('===================\n');

    const stream = await cerebras.chat.completions.create({
      messages: messages,
      model: 'qwen-3-235b-a22b-instruct-2507',
      stream: true,
      max_completion_tokens: 20000,
      temperature: 0.7,  // Increased for much more variety
      top_p: 0.8
    });

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(content);
      }
    }

    console.log('\n--- LLM Response ---');
    console.log(fullResponse.substring(0, 500) + '...');  // Print first 500 chars
    console.log('--- End Response ---\n');

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
