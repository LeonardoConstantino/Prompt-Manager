import eventBus from '../utils/eventBus.js';
import {MarkdownParser} from '../utils/markdown.js';

export default class PromptEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.editMode = false;
    this.currentId = null;
    this.isDirty = false;
    this.markdown = new MarkdownParser();
    
    // Registra estado global de edição
    window.appState = window.appState || {};
    window.appState.isEditing = false;

    // Proteção de fechamento de aba
    window.addEventListener('beforeunload', (e) => {
        if (this.isDirty && !this.container.classList.contains('hidden')) {
            e.preventDefault();
            e.returnValue = ''; // Padrão browser
        }
    });


    // Listeners
    eventBus.on('prompt:create', () => this.open());
    eventBus.on('prompt:edit', ({ id }) => {
      eventBus.emit('ui:request-edit-data', { id });
    });
    
    // Recebe dados do App Controller
    eventBus.on('editor:load', ({ prompt }) => this.open(prompt));
  }

  // Wrapper para verificar se pode descartar alterações
  checkDirty(callback) {
      if (this.isDirty && !this.container.classList.contains('hidden')) {
          if (confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
              this.isDirty = false;
              window.appState.isEditing = false;
              callback();
          }
      } else {
          callback();
      }
  }

  open(prompt = null) {
    this.editMode = !!prompt;
    this.currentId = prompt ? prompt.id : null;
    
    const data = prompt || { name: '', description: '', tags: [], content: '' };
    const tagsString = data.tags.join(', ');
    
    this.isDirty = false;
    window.appState.isEditing = true;
    
    // Serializa estado inicial para comparação
    this.initialState = JSON.stringify({
        name: prompt?.name || '',
        desc: prompt?.description || '',
        tags: prompt?.tags || [],
        content: prompt?.content || ''
    });

    this.container.classList.remove('hidden');
    
    this.container.innerHTML = `
      <div class="absolute inset-0 bg-gray-900 z-10 flex flex-col h-full">
        <div class="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-white">${this.editMode ? 'Editar Prompt' : 'Novo Prompt'}</h2>
          <div class="flex gap-2">
            <button id="btn-cancel" class="px-4 py-2 text-gray-300 hover:text-white">Cancelar</button>
            <button id="btn-save" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium">Salvar</button>
          </div>
        </div>
        
        <div class="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          <div class="grid grid-cols-2 gap-4">
            <input type="text" id="edit-name" value="${data.name}" placeholder="Nome do Prompt" class="bg-gray-800 border border-gray-600 rounded p-2 text-white w-full">
            <input type="text" id="edit-tags" value="${tagsString}" placeholder="Tags (separadas por vírgula)" class="bg-gray-800 border border-gray-600 rounded p-2 text-white w-full">
          </div>
          <input type="text" id="edit-desc" value="${data.description}" placeholder="Descrição curta" class="bg-gray-800 border border-gray-600 rounded p-2 text-white w-full">
          
          <div class="flex-1 flex gap-4 overflow-hidden">
            <!-- Editor -->
            <div class="w-1/2 flex flex-col">
              <label class="text-xs text-gray-400 mb-1">Markdown Entrada</label>
              <textarea id="edit-content" class="flex-1 bg-gray-800 border border-gray-600 rounded p-4 text-white font-mono resize-none focus:outline-none focus:border-blue-500">${data.content}</textarea>
            </div>
            
            <!-- Preview -->
            <div class="w-1/2 flex flex-col">
              <label class="text-xs text-gray-400 mb-1">Preview</label>
              <div id="preview-area" class="flex-1 bg-gray-900 border border-gray-700 rounded p-4 overflow-y-auto text-gray-300">
                ${this.markdown.parse(data.content)}
              </div>
            </div>
          </div>

          ${this.editMode ? `
          <div class="mt-2">
             <input type="text" id="version-note" placeholder="Nota da versão (opcional)" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white">
          </div>
          ` : ''}
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    const textarea = this.container.querySelector('#edit-content');
    const preview = this.container.querySelector('#preview-area');
    
    // Live Preview
    let debounceTimer;
    textarea.addEventListener('input', () => {
      const text = textarea.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
          preview.innerHTML = this.markdown.parse(text);
      }, 300);
      // preview.innerHTML = this.markdown.parse(textarea.value);
    });

    this.container.querySelector('#btn-cancel').onclick = () => {
      this.close();
    };

    this.container.querySelector('#btn-save').onclick = () => {
      this.save();
    };
    
    const inputs = this.container.querySelectorAll('input, textarea');
    inputs.forEach(el => {
        el.addEventListener('input', () => {
            this.checkChanges();
        });
    });

    this.container.querySelector('#btn-cancel').onclick = () => {
        this.checkDirty(() => this.close());
    };
    
    // Salvar limpa o dirty state
    this.container.querySelector('#btn-save').onclick = () => {
        this.isDirty = false; 
        window.appState.isEditing = false;
        this.save();
    };
  }

  save() {
    const name = this.container.querySelector('#edit-name').value;
    const desc = this.container.querySelector('#edit-desc').value;
    const tagsStr = this.container.querySelector('#edit-tags').value;
    const content = this.container.querySelector('#edit-content').value;
    const noteInput = this.container.querySelector('#version-note');
    const note = noteInput ? noteInput.value : '';

    if (!name || !content) {
      alert('Nome e Conteúdo são obrigatórios.');
      return;
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    const payload = {
      data: { name, description: desc, tags, content },
      saveVersion: this.editMode, // Se editando, salva versão
      note
    };

    if (this.editMode) {
      payload.id = this.currentId;
    }

    eventBus.emit('prompt:save', payload);
    this.close();
  }

  checkChanges() {
    const currentState = JSON.stringify({
        name: this.container.querySelector('#edit-name').value,
        desc: this.container.querySelector('#edit-desc').value,
        tags: this.container.querySelector('#edit-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        content: this.container.querySelector('#edit-content').value
    });

    const changed = currentState !== this.initialState;
    this.isDirty = changed;
    
    // Feedback Visual no botão Cancelar ou título
    const title = this.container.querySelector('h2');
    if (changed && !title.textContent.endsWith('*')) {
        title.textContent += ' *';
    } else if (!changed && title.textContent.endsWith('*')) {
        title.textContent = title.textContent.slice(0, -2);
    }
  }

  close() {
    this.container.innerHTML = '';
    this.container.classList.add('hidden');
    eventBus.emit('editor:cancel');
  }
}