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

// Store website context (in production, use a database or session storage)
const contexts = new Map();

// Pixabay API endpoint for image search
app.get('/api/images/search', async (req, res) => {
  try {
    const { q, image_type = 'photo', per_page = 3, page = 1, orientation, category } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    // Pixabay requires per_page to be at least 3
    const validPerPage = Math.max(3, parseInt(per_page) || 3);

    // Build Pixabay API URL
    const params = new URLSearchParams({
      key: process.env.PIXABAY_API_KEY,
      q: q,
      image_type: image_type,
      per_page: validPerPage,
      page: page,
      safesearch: 'true'
    });

    if (orientation) params.append('orientation', orientation);
    if (category) params.append('category', category);

    const pixabayUrl = `https://pixabay.com/api/?${params.toString()}`;

    console.log('Pixabay API request:', pixabayUrl.replace(process.env.PIXABAY_API_KEY, 'API_KEY_HIDDEN'));
    console.log('API key present:', !!process.env.PIXABAY_API_KEY);

    // Fetch from Pixabay
    const response = await fetch(pixabayUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Pixabay error response:', response.status, errorBody);
      throw new Error(`Pixabay API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching images from Pixabay:', error);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, sessionId, currentContext, cachedPages } = req.body;

    // Build the user prompt based on whether this is initial generation or navigation
    let userPrompt;

    if (!currentContext) {
      // Initial website generation - pick a random keyword
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];

      userPrompt = `Create a random, creative, visually stunning website with a theme related to: "${randomKeyword}". The HTML must be complete with <!DOCTYPE html>, head, body tags, inline CSS, and inline JavaScript.

IMPORTANT:
- Make it fully responsive and look good on mobile devices (use media queries, flexible layouts, mobile-friendly font sizes)
- Every button and link MUST have a data-path attribute with an imaginary path (e.g., data-path="/about", data-path="/products/category1", data-path="/contact"). These paths should be logical and represent where that button would navigate to.
- Use the theme "${randomKeyword}" creatively to inspire the design, content, and overall aesthetic
- For images, create div elements with class="image" and use data attributes: data-keyword (search term), data-width (in pixels), and data-height (in pixels). Example: <div class="image" data-keyword="sunset beach" data-width="1200" data-height="800"></div>. The frontend will automatically fetch and load images from Pixabay. Do NOT use <img> tags - the system handles this automatically.

Return ONLY raw HTML, no markdown, no explanations.`;
    } else {
      // Navigation to a new page within the same website context
      const cachedPagesInfo = cachedPages && cachedPages.length > 0
        ? `\n\nPREVIOUSLY VISITED PAGES (user can go back to these):
${cachedPages.map(page => `- "${page}"`).join('\n')}

If you create navigation back to these pages, use the exact same text.`
        : '';

      userPrompt = `Here is the previous page HTML that the user was viewing:

${currentContext}

The user clicked on a button with this text/path: "${prompt}"

Generate the next page as complete HTML. Make sure to:
- Match the design style, color scheme, and aesthetic from the previous page
- Create a logical next page based on what button was clicked
- Include complete HTML with <!DOCTYPE html>, head, body, inline CSS, and inline JavaScript
- Make it fully responsive and look good on mobile devices (use media queries, flexible layouts, mobile-friendly font sizes)
- IMPORTANT: Every button and link MUST have a data-path attribute with an imaginary path (e.g., data-path="/services/pricing", data-path="/blog/post1")
- For images, create div elements with class="image" and use data attributes: data-keyword (search term), data-width (in pixels), and data-height (in pixels). Example: <div class="image" data-keyword="sunset beach" data-width="1200" data-height="800"></div>. The frontend will automatically fetch and load images from Pixabay. Do NOT use <img> tags - the system handles this automatically.
${cachedPagesInfo}

Return ONLY raw HTML, no markdown, no explanations.`;
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
        role: "user",
        content: userPrompt
      }
    ];

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
