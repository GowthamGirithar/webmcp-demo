/**
 * WebMCP — Imperative Style
 *
 * Tools are registered programmatically via:
 *   navigator.modelContext.registerTool({ name, description, inputSchema, execute })
 *
 * This gives full control: dynamic state, complex logic, conditional tool exposure.
 */

// ─── In-memory notes store ────────────────────────────────────────────────────
const notes = new Map();   // id → { id, title, body, createdAt }
let nextId = 1;

// ─── UI helpers ───────────────────────────────────────────────────────────────
function renderNotes() {
  const list = document.getElementById('notesList');
  list.innerHTML = '';

  if (notes.size === 0) {
    list.innerHTML = '<li class="empty">No notes yet. Add one above or ask an AI agent.</li>';
    return;
  }

  for (const note of [...notes.values()].reverse()) {
    const li = document.createElement('li');
    li.className = 'note-item';
    li.innerHTML = `
      <div class="note-content">
        <span class="note-id">#${note.id}</span>
        <strong class="note-title">${escHtml(note.title)}</strong>
        <p class="note-body">${escHtml(note.body)}</p>
        <span class="note-date">${new Date(note.createdAt).toLocaleString()}</span>
      </div>
      <button class="delete-btn" onclick="handleDelete(${note.id})">Delete</button>
    `;
    list.appendChild(li);
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Core operations (shared between UI and WebMCP tools) ─────────────────────
function opAddNote(title, body) {
  const id = nextId++;
  notes.set(id, { id, title, body, createdAt: new Date().toISOString() });
  renderNotes();
  return id;
}

function opDeleteNote(id) {
  const note = notes.get(id);
  if (!note) return null;
  notes.delete(id);
  renderNotes();
  return note;
}

function opClearNotes() {
  const count = notes.size;
  notes.clear();
  renderNotes();
  return count;
}

// ─── UI event handlers ────────────────────────────────────────────────────────
document.getElementById('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('titleInput').value.trim();
  const body  = document.getElementById('bodyInput').value.trim();
  const id = opAddNote(title, body);
  showToast(`Note #${id} added`, 'success');
  e.target.reset();
  document.getElementById('titleInput').focus();
});

window.handleDelete = (id) => {
  const note = opDeleteNote(id);
  if (note) showToast(`Note #${id} deleted`, 'info');
};

document.getElementById('clearBtn').addEventListener('click', () => {
  if (notes.size === 0) { showToast('Nothing to clear', 'info'); return; }
  const count = opClearNotes();
  showToast(`Cleared ${count} note(s)`, 'info');
});

// ─── WebMCP: Imperative tool registration ────────────────────────────────────
if ('modelContext' in navigator) {
  /**
   * Tool 1 — add_note
   * AI agent calls this to create a note.
   */
  navigator.modelContext.registerTool({
    name: 'add_note',
    description: 'Add a new note with a title and a body text. Returns the new note ID.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short title for the note (required)'
        },
        body: {
          type: 'string',
          description: 'The note content / body text (required)'
        }
      },
      required: ['title', 'body']
    },
    execute: ({ title, body }) => {
      const id = opAddNote(title, body);
      showToast(`[Agent] Added note #${id}`, 'agent');
      return `Note #${id} "${title}" created successfully.`;
    }
  });

  /**
   * Tool 2 — list_notes
   * AI agent calls this to read all notes.
   */
  navigator.modelContext.registerTool({
    name: 'list_notes',
    description: 'List all existing notes. Returns a formatted summary of every note.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: () => {
      if (notes.size === 0) return 'No notes found.';
      return [...notes.values()]
        .map(n => `#${n.id} | ${n.title}: ${n.body}`)
        .join('\n');
    }
  });

  /**
   * Tool 3 — delete_note
   * AI agent calls this to remove a specific note by ID.
   */
  navigator.modelContext.registerTool({
    name: 'delete_note',
    description: 'Delete a specific note by its numeric ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The integer ID of the note to delete'
        }
      },
      required: ['id']
    },
    execute: ({ id }) => {
      const note = opDeleteNote(id);
      if (!note) return `No note found with ID ${id}.`;
      showToast(`[Agent] Deleted note #${id}`, 'agent');
      return `Note #${id} "${note.title}" deleted.`;
    }
  });

  /**
   * Tool 4 — clear_notes
   * AI agent calls this to wipe all notes at once.
   */
  navigator.modelContext.registerTool({
    name: 'clear_notes',
    description: 'Delete all notes at once. Returns the number of notes removed.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: () => {
      const count = opClearNotes();
      showToast(`[Agent] Cleared ${count} note(s)`, 'agent');
      return `Cleared ${count} note(s).`;
    }
  });

  console.log('[WebMCP] 4 tools registered imperatively:', [
    'add_note', 'list_notes', 'delete_note', 'clear_notes'
  ]);

  document.getElementById('mcpStatus').textContent = '4 tools registered';
  document.getElementById('mcpStatus').className = 'status-badge active';

} else {
  console.warn('[WebMCP] navigator.modelContext not available.');
  console.warn('Enable WebMCP in Chrome: chrome://flags → search "WebMCP"');

  document.getElementById('mcpStatus').textContent = 'Not available — enable in chrome://flags';
  document.getElementById('mcpStatus').className = 'status-badge inactive';
}

// Initial render
renderNotes();
