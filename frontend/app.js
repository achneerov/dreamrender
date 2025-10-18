class DreamRender {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.currentContext = null;
        this.isGenerating = false;
        this.currentHTML = '';
        this.content = document.getElementById('content');

        this.init();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        // Auto-generate on page load
        this.generateInitialWebsite();
    }

    async generateInitialWebsite() {
        if (this.isGenerating) return;

        this.isGenerating = true;
        this.content.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

        try {
            const html = await this.callAPI('Create a random, creative website', null);
            this.currentHTML = html;
            this.currentContext = html; // Pass entire HTML as context
            this.renderContent(html);
        } catch (error) {
            console.error('Error:', error);
            this.content.innerHTML = '<div class="loader"><p style="color: red;">Failed to load. Please refresh the page.</p></div>';
        } finally {
            this.isGenerating = false;
        }
    }

    async navigateToPage(linkText, elementType) {
        if (this.isGenerating) return;

        this.isGenerating = true;
        const previousContent = this.content.innerHTML;
        this.content.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

        try {
            const prompt = `User clicked on "${linkText}" (${elementType}). Generate the appropriate page for this navigation within the existing website.`;
            const html = await this.callAPI(prompt, this.currentContext);
            this.currentHTML = html;
            this.currentContext = html; // Update context to new page
            this.renderContent(html);
        } catch (error) {
            console.error('Error:', error);
            this.content.innerHTML = previousContent;
            this.attachClickHandlers();
        } finally {
            this.isGenerating = false;
        }
    }

    async callAPI(prompt, currentContext) {
        const API_URL = 'http://localhost:3000/api/generate'; // Backend API URL
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                sessionId: this.sessionId,
                currentContext
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const html = await response.text();
        return this.cleanHTML(html);
    }

    cleanHTML(html) {
        // Remove markdown code blocks if present
        html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '');

        // Remove <think> tags and their content
        html = html.replace(/<think>[\s\S]*?<\/think>/gi, '');

        html = html.trim();
        return html;
    }

    renderContent(html) {
        this.content.innerHTML = html;

        // Update page title to match generated content
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const generatedTitle = temp.querySelector('title')?.textContent;
        if (generatedTitle) {
            document.title = generatedTitle;
        }

        this.attachClickHandlers();
    }

    attachClickHandlers() {
        // Get all clickable elements in the generated content
        const clickableElements = this.content.querySelectorAll('a, button, [data-navigate]');

        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const linkText = element.textContent.trim() || element.getAttribute('aria-label') || element.getAttribute('title') || 'Unnamed link';
                const elementType = element.tagName.toLowerCase();

                this.navigateToPage(linkText, elementType);
            });
        });

        // Also intercept form submissions
        const forms = this.content.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('[type="submit"]');
                const linkText = submitBtn ? submitBtn.textContent.trim() : 'Form submission';
                this.navigateToPage(linkText, 'form');
            });
        });
    }

}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DreamRender();
});
