async function initNexusChat() {
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('send-btn');
  const indicator = document.getElementById('typing-indicator');

  if (!chatInput || !chatMessages || !sendBtn) return;

  chatInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  sendBtn.onclick = handleSend;

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // User Message
    addMessage(text, 'user');
    chatInput.value = '';
    
    // Nexus Thinking
    indicator.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      // Simulate/Real API
      const res = await api.post('/nexus/chat', { prompt: text });
      indicator.style.display = 'none';
      addMessage(res.response, 'nexus');
    } catch (err) {
      indicator.style.display = 'none';
      addMessage("Protocol error: Nexus communication interrupted. Please check mission status.", 'nexus');
    }
  }

  function addMessage(text, side) {
    const msg = document.createElement('div');
    msg.className = `msg msg-${side} anim-fade-up`;
    
    if (side === 'nexus') {
      msg.innerHTML = `<div class="nexus-avatar"></div>${text}`;
    } else {
      msg.innerText = text;
    }
    
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

window.initNexusChat = initNexusChat;
