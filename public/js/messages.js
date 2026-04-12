let messageUsers = [];
let messageTeams = [];
let messageConversations = [];
let activeConversationId = null;
let selectedParticipantIds = new Set();

function getUserAvatar(user) {
  if (user.avatar) return user.avatar;
  return typeof getInitialsAvatar === 'function' ? getInitialsAvatar(user.name, 40) : '';
}

function formatParticipantNames(participants = []) {
  return participants.map(participant => participant.name).join(', ');
}

async function initMessages() {
  bindComposerActions();
  await Promise.all([loadMessageUsers(), loadTeams(), loadConversations()]);
  renderSelectedSummary();
}

function bindComposerActions() {
  const search = document.getElementById('user-search');
  const startBtn = document.getElementById('start-chat-btn');
  const clearBtn = document.getElementById('clear-selection-btn');
  const sendBtn = document.getElementById('send-message-btn');
  const messageInput = document.getElementById('message-input');
  const chatTitle = document.getElementById('chat-title');

  if (search) {
    search.addEventListener('input', () => {
      renderPeopleList(search.value.trim().toLowerCase());
      renderTeamList(search.value.trim().toLowerCase());
      renderConversationList(search.value.trim().toLowerCase());
    });
  }

  if (startBtn) {
    startBtn.onclick = startConversationFromSelection;
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      selectedParticipantIds.clear();
      if (chatTitle) chatTitle.value = '';
      renderPeopleList(search?.value.trim().toLowerCase() || '');
      renderSelectedSummary();
    };
  }

  if (sendBtn) {
    sendBtn.onclick = sendCurrentMessage;
  }

  if (messageInput) {
    messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCurrentMessage();
      }
    });
  }
}

async function loadMessageUsers() {
  try {
    messageUsers = await api.get('/messages/users');
    renderPeopleList();
  } catch (err) {
    messageUsers = [];
    renderPeopleList();
    showToast(err.message, 'error');
  }
}

async function loadTeams() {
  try {
    messageTeams = await api.get('/teams');
    renderTeamList();
  } catch (err) {
    messageTeams = [];
    renderTeamList();
  }
}

async function loadConversations() {
  try {
    messageConversations = await api.get('/messages/conversations');
    renderConversationList();
    if (!activeConversationId && messageConversations.length > 0) {
      openConversation(messageConversations[0].id);
    }
  } catch (err) {
    messageConversations = [];
    renderConversationList();
  }
}

function renderPeopleList(filter = '') {
  const container = document.getElementById('people-list');
  if (!container) return;

  const filtered = messageUsers.filter(user => {
    const haystack = `${user.name} ${user.email} ${user.role}`.toLowerCase();
    return haystack.includes(filter);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state-lite">No people match your search.</div>';
    return;
  }

  container.innerHTML = filtered.map(user => {
    const active = selectedParticipantIds.has(Number(user.id));
    return `
      <div class="select-item ${active ? 'active' : ''}" onclick="toggleMessageUser(${user.id})">
        <img class="select-avatar" src="${getUserAvatar(user)}" alt="${user.name}">
        <div class="select-meta">
          <div class="select-name">${escapeHtml(user.name)}</div>
          <div class="select-subtitle">${escapeHtml(user.email)} • ${escapeHtml(String(user.role).replace(/_/g, ' '))}</div>
        </div>
        <div class="badge ${active ? 'badge-approved' : 'badge-normal'}" style="font-size:0.58rem;">${active ? 'Selected' : 'Add'}</div>
      </div>
    `;
  }).join('');
}

function renderTeamList(filter = '') {
  const container = document.getElementById('teams-list');
  if (!container) return;

  const filtered = messageTeams.filter(team => {
    const haystack = `${team.name} ${team.description || ''} ${team.leader_name || ''}`.toLowerCase();
    return haystack.includes(filter);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state-lite">No teams available.</div>';
    return;
  }

  container.innerHTML = filtered.map(team => `
    <div class="select-item" onclick="selectTeamChat(${team.id})">
      <div class="select-avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(90,115,255,0.2);color:var(--accent-primary);">
        <i class="fas fa-users"></i>
      </div>
      <div class="select-meta">
        <div class="select-name">${escapeHtml(team.name)}</div>
        <div class="select-subtitle">${team.member_count || 0} members • ${escapeHtml(team.leader_name || 'No leader')}</div>
      </div>
      <div class="badge badge-normal" style="font-size:0.58rem;">Chat</div>
    </div>
  `).join('');
}

function renderConversationList(filter = '') {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  const filtered = messageConversations.filter(conversation => {
    const haystack = `${conversation.title || ''} ${conversation.participant_names || ''} ${conversation.last_message || ''}`.toLowerCase();
    return haystack.includes(filter);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state-lite">No conversations yet.</div>';
    return;
  }

  container.innerHTML = filtered.map(conversation => `
    <div class="select-item ${Number(conversation.id) === Number(activeConversationId) ? 'active' : ''}" onclick="openConversation(${conversation.id})">
      <div class="select-avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);">
        <i class="fas fa-comment-dots"></i>
      </div>
      <div class="select-meta">
        <div class="select-name">${escapeHtml(conversation.is_group ? (conversation.title || 'Group Chat') : (conversation.participant_names || 'Direct Message'))}</div>
        <div class="select-subtitle">${escapeHtml(conversation.participant_names || 'Participants')}${conversation.last_message ? ' • ' + escapeHtml(conversation.last_message) : ''}</div>
      </div>
    </div>
  `).join('');
}

function renderSelectedSummary() {
  const container = document.getElementById('selected-summary');
  if (!container) return;

  const selectedUsers = messageUsers.filter(user => selectedParticipantIds.has(Number(user.id)));
  if (selectedUsers.length === 0) {
    container.innerHTML = '<span class="badge badge-normal" style="font-size:0.58rem;">No participants selected</span>';
    return;
  }

  container.innerHTML = selectedUsers.map(user => `
    <span class="team-chip active" onclick="toggleMessageUser(${user.id})">${user.name}</span>
  `).join('');
}

window.toggleMessageUser = function(userId) {
  const id = Number(userId);
  if (selectedParticipantIds.has(id)) {
    selectedParticipantIds.delete(id);
  } else {
    selectedParticipantIds.add(id);
  }
  const search = document.getElementById('user-search')?.value.trim().toLowerCase() || '';
  renderPeopleList(search);
  renderSelectedSummary();
};

window.selectTeamChat = function(teamId) {
  const team = messageTeams.find(item => Number(item.id) === Number(teamId));
  if (!team) return;
  selectedParticipantIds.clear();
  (team.members || []).forEach(member => selectedParticipantIds.add(Number(member.id)));
  const title = document.getElementById('chat-title');
  if (title && !title.value.trim()) {
    title.value = `Team: ${team.name}`;
  }
  renderSelectedSummary();
  const search = document.getElementById('user-search')?.value.trim().toLowerCase() || '';
  renderPeopleList(search);
};

async function startConversationFromSelection() {
  const participantIds = Array.from(selectedParticipantIds);
  if (participantIds.length === 0) {
    showToast('Select at least one person or team first.', 'error');
    return;
  }

  const title = document.getElementById('chat-title')?.value.trim() || '';
  try {
    const response = await api.post('/messages/conversations', {
      participant_ids: participantIds,
      title,
      is_group: participantIds.length > 1 || !!title
    });
    await loadConversations();
    if (response.conversation?.id) {
      await openConversation(response.conversation.id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openConversation(conversationId) {
  activeConversationId = Number(conversationId);
  const conversation = messageConversations.find(item => Number(item.id) === activeConversationId) || null;
  const titleEl = document.getElementById('active-chat-title');
  const metaEl = document.getElementById('active-chat-meta');
  const stream = document.getElementById('chat-stream');
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-message-btn');
  const badge = document.getElementById('active-chat-badge');

  if (titleEl) titleEl.textContent = conversation ? (conversation.is_group ? (conversation.title || 'Group Chat') : (conversation.participant_names || 'Direct Message')) : 'Conversation';
  if (metaEl) metaEl.textContent = conversation ? (conversation.participant_names || 'Participants') : 'Conversation loaded';
  if (badge) {
    badge.style.display = 'inline-flex';
    badge.textContent = conversation?.is_group ? 'GROUP' : 'DIRECT';
  }
  if (input) input.disabled = false;
  if (sendBtn) sendBtn.disabled = false;

  if (stream) {
    stream.innerHTML = '<div class="empty-state-lite">Loading messages...</div>';
  }

  const filter = document.getElementById('user-search')?.value.trim().toLowerCase() || '';
  renderConversationList(filter);

  try {
    const messages = await api.get(`/messages/conversations/${activeConversationId}/messages`);
    renderMessages(messages);
  } catch (err) {
    if (stream) {
      stream.innerHTML = `<div class="empty-state-lite">${err.message}</div>`;
    }
  }
}

function renderMessages(messages) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;

  if (!messages || messages.length === 0) {
    stream.innerHTML = '<div class="empty-state-lite">No messages yet. Send the first message.</div>';
    return;
  }

  stream.innerHTML = messages.map(message => {
    const isSelf = Number(message.sender_id) === Number(auth.getUser()?.id);
    return `
      <div class="message-bubble ${isSelf ? 'self' : 'other'}">
        <div style="font-weight:700; font-size:0.78rem; margin-bottom:4px;">${escapeHtml(isSelf ? 'You' : message.sender_name || 'Teammate')}</div>
        <div>${escapeHtml(message.message)}</div>
        <div class="message-meta">${timeAgo(message.created_at)}</div>
      </div>
    `;
  }).join('');

  stream.scrollTop = stream.scrollHeight;
}

async function sendCurrentMessage() {
  if (!activeConversationId) {
    showToast('Open or create a conversation first.', 'error');
    return;
  }

  const input = document.getElementById('message-input');
  const text = input?.value.trim();
  if (!text) return;

  try {
    await api.post(`/messages/conversations/${activeConversationId}/messages`, { message: text });
    if (input) input.value = '';
    await loadConversations();
    await openConversation(activeConversationId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.initMessages = initMessages;
window.openConversation = openConversation;
window.sendCurrentMessage = sendCurrentMessage;
