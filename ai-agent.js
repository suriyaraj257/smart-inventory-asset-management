// AI Assistant Client Module (LabPulse AI)
const AIAgent = {
  isOpen: false,
  messages: [],

  init() {
    this.renderWelcome();
  },

  toggleDrawer() {
    const drawer = document.getElementById('ai-drawer');
    const backdrop = document.getElementById('ai-backdrop');
    if (!drawer) return;

    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      drawer.classList.remove('translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
      setTimeout(() => document.getElementById('ai-input')?.focus(), 200);
    } else {
      drawer.classList.add('translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
    }
  },

  renderWelcome() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-start gap-3 mb-4">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
          AI
        </div>
        <div class="bg-indigo-50 border border-indigo-100 text-slate-800 text-sm p-3.5 ai-chat-bubble max-w-[85%] shadow-sm">
          <p class="font-semibold text-indigo-900 mb-1">👋 Welcome to LabPulse AI Assistant</p>
          <p class="mb-2">I am your specialized intelligent assistant for lab inventory, equipment tracking, predictive maintenance, and compliance.</p>
          <p class="text-xs text-slate-600 mb-3">You can speak in plain natural language to add assets, update chemical stocks, inquire about warranty, or run predictive failure checks.</p>
          
          <div class="space-y-1.5" id="ai-initial-pills">
            <button onclick="AIAgent.sendPrompt('Run predictive maintenance diagnostics on all equipment')" class="block w-full text-left text-xs bg-white hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded border border-indigo-200 transition">
              🔍 Run predictive maintenance diagnostics
            </button>
            <button onclick="AIAgent.sendPrompt('Which equipment is overdue for calibration?')" class="block w-full text-left text-xs bg-white hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded border border-indigo-200 transition">
              🛠️ Which equipment is overdue for calibration?
            </button>
            <button onclick="AIAgent.sendPrompt('Show all consumables running low on stock')" class="block w-full text-left text-xs bg-white hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded border border-indigo-200 transition">
              📦 Show all consumables running low
            </button>
            <button onclick="AIAgent.sendPrompt('Add a Thermo Fisher Sorvall Microcentrifuge in Room 305 with cost $4,200')" class="block w-full text-left text-xs bg-white hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded border border-indigo-200 transition">
              ➕ Add a new centrifuge via natural language
            </button>
          </div>
        </div>
      </div>
    `;
  },

  formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-indigo-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
    // Bullet points
    html = html.replace(/^\s*•\s*(.*)$/gm, '<li class="ml-4 list-disc text-xs my-0.5">$1</li>');
    html = html.replace(/^\s*-\s*(.*)$/gm, '<li class="ml-4 list-disc text-xs my-0.5">$1</li>');
    // Numbered list
    html = html.replace(/^\s*(\d+)\.\s*(.*)$/gm, '<li class="ml-4 list-decimal text-xs my-0.5">$2</li>');
    // Line breaks
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br/>');

    return html;
  },

  async sendPrompt(text) {
    const input = document.getElementById('ai-input');
    const query = text || (input ? input.value.trim() : '');
    if (!query) return;

    if (input) input.value = '';

    // Append User Message
    const container = document.getElementById('ai-chat-messages');
    container.innerHTML += `
      <div class="flex items-start justify-end gap-3 mb-4">
        <div class="bg-indigo-600 text-white text-sm p-3 user-chat-bubble max-w-[85%] shadow-sm">
          ${query}
        </div>
        <div class="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">
          U
        </div>
      </div>
    `;

    // Append Loading indicator
    const loadingId = 'ai-loading-' + Date.now();
    container.innerHTML += `
      <div id="${loadingId}" class="flex items-start gap-3 mb-4">
        <div class="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">AI</div>
        <div class="bg-slate-100 text-slate-500 text-xs p-3 rounded-lg flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
          Analyzing laboratory telemetry & database...
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;

    try {
      const currentRole = document.getElementById('user-role-select')?.value || 'Lab Staff';
      const result = await API.sendAIChat(query, currentRole);

      // Remove loading indicator
      document.getElementById(loadingId)?.remove();

      // Render AI response
      let suggestionHtml = '';
      if (result.quickSuggestions && result.quickSuggestions.length > 0) {
        suggestionHtml = `
          <div class="mt-3 pt-2 border-t border-indigo-100 flex flex-wrap gap-1.5">
            ${result.quickSuggestions.map(s => `
              <button onclick="AIAgent.sendPrompt('${s.replace(/'/g, "\\'")}')" class="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 transition">
                ⚡ ${s}
              </button>
            `).join('')}
          </div>
        `;
      }

      container.innerHTML += `
        <div class="flex items-start gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
            AI
          </div>
          <div class="bg-white border border-slate-200 text-slate-800 text-sm p-3.5 ai-chat-bubble max-w-[85%] shadow-sm">
            ${this.formatMarkdown(result.reply)}
            ${suggestionHtml}
          </div>
        </div>
      `;

      // If AI performed an action (created asset or adjusted stock), trigger app refresh!
      if (result.actionTaken && window.App) {
        window.App.refreshAllData();
        window.App.showToast(`AI Executed: ${result.actionTaken.type}`, 'success');
      }

    } catch (err) {
      console.error("AI error:", err);
      document.getElementById(loadingId)?.remove();
      container.innerHTML += `
        <div class="flex items-start gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0">!</div>
          <div class="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            Sorry, I encountered an error processing that request. Please try again.
          </div>
        </div>
      `;
    }

    container.scrollTop = container.scrollHeight;
  }
};
