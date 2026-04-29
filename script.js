// ═══════════════════════════════════════════════════════
//  CONFIG — paste your OpenRouter API key below
// ═══════════════════════════════════════════════════════
const API_KEY = "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";
const DEFAULT_MODEL = "openai/gpt-3.5-turbo"; // change if you want a different default
const SYSTEM_PROMPT = "You are a helpful, smart, and concise AI assistant.";
// ═══════════════════════════════════════════════════════

let history   = [];
let isLoading = false;
let currentChatId = null;
let allChats = {};

// ── Chat History Management ──
function generateChatId() {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function saveChatHistory() {
  if (currentChatId && history.length > 0) {
    const title = history[0]?.content?.substring(0, 30) || 'Untitled Chat';
    allChats[currentChatId] = {
      id: currentChatId,
      title: title,
      messages: history,
      timestamp: Date.now()
    };
    localStorage.setItem('chatHistory', JSON.stringify(allChats));
    updateHistoryList();
  }
}

function loadChatHistory() {
  const saved = localStorage.getItem('chatHistory');
  if (saved) {
    allChats = JSON.parse(saved);
  }
  updateHistoryList();
}

function startNewChat() {
  saveChatHistory();
  currentChatId = generateChatId();
  history = [];
  clearChat();
  document.getElementById('userInput').focus();
}

function loadChat(chatId) {
  saveChatHistory();
  currentChatId = chatId;
  if (allChats[chatId]) {
    history = allChats[chatId].messages;
    document.getElementById('messages').innerHTML = '';
    for (const msg of history) {
      addMessage(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
    }
  }
  updateHistoryList();
}

function updateHistoryList() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';
  
  const chats = Object.values(allChats).sort((a, b) => b.timestamp - a.timestamp);
  
  if (chats.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No chats yet</div>';
    return;
  }
  
  for (const chat of chats) {
    const item = document.createElement('div');
    item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.textContent = chat.title;
    item.title = chat.title;
    item.onclick = () => loadChat(chat.id);
    historyList.appendChild(item);
  }
}

function toggleKeyVis() {
  const input = document.getElementById('apiKey');
  const btn = event.target;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'hide';
  } else {
    input.type = 'password';
    btn.textContent = 'show';
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  loadChatHistory();
  startNewChat();
});

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function scrollToBottom() {
  const msgs = document.getElementById('messages');
  msgs.scrollTop = msgs.scrollHeight;
}

function removeEmpty() {
  const es = document.getElementById('emptyState');
  if (es) es.remove();
}

function addMessage(role, content, isError = false) {
  removeEmpty();
  const msgs         = document.getElementById('messages');
  const wrap         = document.createElement('div');
  wrap.className     = `msg ${role}`;
  const av           = document.createElement('div');
  av.className       = 'avatar';
  av.textContent     = role === 'user' ? 'U' : 'AI';
  const bubble       = document.createElement('div');
  bubble.className   = isError ? 'bubble error-bubble' : 'bubble';
  bubble.textContent = content;
  wrap.appendChild(av);
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  scrollToBottom();
  return bubble;
}

function addTyping() {
  removeEmpty();
  const msgs       = document.getElementById('messages');
  const wrap       = document.createElement('div');
  wrap.className   = 'msg ai';
  wrap.id          = 'typingIndicator';
  const av         = document.createElement('div');
  av.className     = 'avatar';
  av.textContent   = 'AI';
  const bubble     = document.createElement('div');
  bubble.className = 'bubble typing-bubble';
  bubble.innerHTML = '<span></span><span></span><span></span>';
  wrap.appendChild(av);
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function clearChat() {
  history = [];
  startNewChat();
  document.getElementById('messages').innerHTML = `
    <div class="empty-state" id="emptyState">
      <div class="empty-icon">✦</div>
      <h2>Start a conversation</h2>
      <p>Type a message below to get started.</p>
    </div>`;
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('userInput');
  const text  = input.value.trim();
  if (!text) return;

  const model        = document.getElementById('modelSelect')?.value || DEFAULT_MODEL;
  input.value        = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;
  isLoading = true;

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  addTyping();

  const messages = SYSTEM_PROMPT
    ? [{ role: 'system', content: SYSTEM_PROMPT }, ...history]
    : [...history];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  window.location.href,
        'X-Title':       'AI Chatbot'
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 2000 })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    removeTyping();
    const msgs     = document.getElementById('messages');
    const wrap     = document.createElement('div');
    wrap.className = 'msg ai';
    const av       = document.createElement('div');
    av.className   = 'avatar';
    av.textContent = 'AI';
    const bubble     = document.createElement('div');
    bubble.className = 'bubble';
    wrap.appendChild(av);
    wrap.appendChild(bubble);
    msgs.appendChild(wrap);

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          fullText   += delta;
          bubble.textContent = fullText;
          scrollToBottom();
        } catch {}
      }
    }

    history.push({ role: 'assistant', content: fullText });

  } catch (err) {
    removeTyping();
    addMessage('ai', `Error: ${err.message}`, true);
  }

  document.getElementById('sendBtn').disabled = false;
  isLoading = false;
  input.focus();
  saveChatHistory();
}
