// Nexus AI Chatbot - Powered by Gemini API
class NexusAI {
    constructor() {
        const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:';
        this.apiUrl = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || (isLocalDev ? 'http://localhost:8080/api' : '/api');
        this.knowledge = null;
        this.conversationHistory = [];
        this.isOpen = false;

        this.init();
    }

    async init() {
        await this.loadKnowledge();
        this.createChatWidget();
        this.attachEventListeners();
    }

    async loadKnowledge() {
        try {
            const response = await fetch('/public/data/nexus-ai-knowledge.json');
            this.knowledge = await response.json();
        } catch (error) {
            console.error('Error loading AI knowledge base:', error);
            this.knowledge = { companyName: 'Tech Turf', description: 'Technology company' };
        }
    }

    createChatWidget() {
        const widget = document.createElement('div');
        widget.innerHTML = `
            <!-- Chat Button -->
            <button id="nexus-chat-button" class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform z-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
            
            <!-- Chat Window -->
            <div id="nexus-chat-window" class="fixed bottom-24 right-6 w-96 h-[600px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col hidden z-50">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-2xl flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-bold text-white">Nexus AI</h3>
                            <p class="text-xs text-white/80">Powered by Gemini</p>
                        </div>
                    </div>
                    <button id="nexus-close-button" class="text-white hover:bg-white/20 rounded-lg p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <!-- Messages -->
                <div id="nexus-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
                    <div class="flex gap-3">
                        <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                        </div>
                        <div class="bg-gray-800 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                            <p class="text-sm text-gray-200">Hi! I'm Nexus AI, your Tech Turf assistant. How can I help you today?</p>
                        </div>
                    </div>
                </div>
                
                <!-- Input -->
                <div class="p-4 border-t border-gray-700">
                    <form id="nexus-form" class="flex gap-2">
                        <input 
                            id="nexus-input" 
                            type="text" 
                            placeholder="Ask me anything..." 
                            class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            autocomplete="off"
                        />
                        <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }

    attachEventListeners() {
        const button = document.getElementById('nexus-chat-button');
        const closeButton = document.getElementById('nexus-close-button');
        const form = document.getElementById('nexus-form');

        button.addEventListener('click', () => this.toggleChat());
        closeButton.addEventListener('click', () => this.toggleChat());
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    toggleChat() {
        const window = document.getElementById('nexus-chat-window');
        this.isOpen = !this.isOpen;
        window.classList.toggle('hidden');

        if (this.isOpen) {
            document.getElementById('nexus-input').focus();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const input = document.getElementById('nexus-input');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';

        // Show typing indicator
        this.showTyping();

        // Get AI response (now handles errors internally with fallback)
        const response = await this.getAIResponse(message);
        this.removeTyping();
        this.addMessage(response, 'ai');
    }

    addMessage(text, sender) {
        const messagesContainer = document.getElementById('nexus-messages');
        const messageDiv = document.createElement('div');

        if (sender === 'user') {
            messageDiv.className = 'flex gap-3 justify-end';
            messageDiv.innerHTML = `
                <div class="bg-purple-600 rounded-2xl rounded-tr-none p-3 max-w-[80%]">
                    <p class="text-sm text-white">${this.escapeHtml(text)}</p>
                </div>
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
            `;
        } else {
            messageDiv.className = 'flex gap-3';
            messageDiv.innerHTML = `
                <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                </div>
                <div class="bg-gray-800 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                    <p class="text-sm text-gray-200">${this.formatMessage(text)}</p>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTyping() {
        const messagesContainer = document.getElementById('nexus-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex gap-3';
        typingDiv.innerHTML = `
            <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
            </div>
            <div class="bg-gray-800 rounded-2xl rounded-tl-none p-3">
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    async getAIResponse(userMessage) {
        try {
            const response = await fetch(`${this.apiUrl}/ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    context: {
                        companyName: this.knowledge?.companyName,
                        aiInstructions: this.knowledge?.aiInstructions
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Nexus AI request failed with status ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.reply) {
                throw new Error(data.message || 'Invalid response from Nexus AI service');
            }
            return data.reply;

        } catch (error) {
            console.error('Nexus AI Error:', error);

            // Provide fallback response based on common questions
            return this.getFallbackResponse(userMessage);
        }
    }

    getFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Check for common questions and provide fallback responses
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return `Hello! I'm Nexus AI, your Tech Turf assistant. I'm currently experiencing connectivity issues with my AI service, but I can still help you navigate our website. What would you like to know about Tech Turf?`;
        }

        if (lowerMessage.includes('quinta') || lowerMessage.includes('rocket') || lowerMessage.includes('aerospace')) {
            return `Quinta is our Aerospace & Space Division, specializing in high-altitude research rockets and telemetry systems. We build cutting-edge aerospace technology. Visit our Quinta page to learn more!`;
        }

        if (lowerMessage.includes('trend hive') || lowerMessage.includes('marketing')) {
            return `Trend Hive is our Digital Marketing Division, focused on viral content creation, branding, and social growth strategies. We help businesses grow their online presence.`;
        }

        if (lowerMessage.includes('click sphere') || lowerMessage.includes('software') || lowerMessage.includes('development')) {
            return `Click Sphere is our IT & Software Division, offering full-stack development, cloud architecture, and custom software solutions. We build innovative digital products.`;
        }

        if (lowerMessage.includes('product') || lowerMessage.includes('shop') || lowerMessage.includes('buy')) {
            return `You can browse our products in the Shopping section. We offer a range of innovative tech products across our divisions. Would you like me to guide you there?`;
        }

        if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('email')) {
            return `You can reach us through our Contact page. We're here to help with any questions about our products, services, or divisions!`;
        }

        // Default fallback
        return `I apologize, but I'm currently experiencing technical difficulties connecting to my AI service. However, I can still help you navigate Tech Turf! 

Here's what we offer:
• **Quinta** - Aerospace & Space Division
• **Trend Hive** - Digital Marketing Division  
• **Click Sphere** - IT & Software Division

You can also visit our Products, Projects, or Contact pages. What would you like to explore?

*Note: If you're seeing this message, the Gemini API may need configuration. Please check the console for details.*`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMessage(text) {
        // Convert markdown-style formatting to HTML
        return this.escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
}

// Initialize Nexus AI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NexusAI());
} else {
    new NexusAI();
}
