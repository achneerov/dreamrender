# DreamRender

An AI-powered dynamic website generator that creates unique, interactive websites on-the-fly using the Cerebras API.

## Features

- **Random Website Generation**: Click a button to generate a completely random website with unique design and content
- **Context-Aware Navigation**: Click any link or button in the generated website to create new pages that fit the context
- **Real-time AI Streaming**: Watch as the AI generates pages in real-time
- **Infinite Exploration**: Every navigation generates a new, contextually relevant page

## How It Works

1. Click "Generate Random Website" to create an initial random website
2. The AI generates a complete HTML page with styling and interactivity
3. Click any link, button, or navigation element
4. The AI generates a new page that fits within the context of the current website
5. Continue exploring - the AI maintains context throughout your session

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure your `.env` file contains your Cerebras API key:
```
CEREBRAS_API_KEY=your_api_key_here
PORT=3000
```

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## Technologies Used

- **Backend**: Node.js, Express
- **AI**: Cerebras Cloud SDK (Qwen 3 235B model)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## How It Maintains Context

The system extracts key information from each generated page:
- Page titles and headings
- Content structure
- Website theme and purpose

This context is passed to subsequent AI generations, ensuring coherent navigation experiences.

## License

MIT
