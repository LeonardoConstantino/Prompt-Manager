import eventBus from '../utils/eventBus.js';
import { MarkdownParser } from '../utils/markdown.js';
import { getIcon } from '../utils/Icons.js';
import { metaKey } from '../utils/platform.js';
import { confirmModal } from './ConfirmModal.js';

export default class PromptEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.editMode = false;
    this.currentId = null;
    this.isDirty = false;
    // Definir limites para alertas visuais (Soft limits)
    this.tokenWarningLimit = 4096; // Limite comum de contexto
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

    // Listener Global de Salvar
    eventBus.on('ui:trigger-save', () => {
      // Verifica se este componente está visível
      if (!this.container.classList.contains('hidden')) {
        // Simula clique no botão salvar (reutiliza lógica de validação)
        this.save();
      }
    });
  }

  // Wrapper para verificar se pode descartar alterações
  async checkDirty(callback) {
    if (this.isDirty && !this.container.classList.contains('hidden')) {
      const confirmed = await confirmModal.ask(
        'Descartar alterações?',
        'Você tem edições não salvas. Se sair agora, o progresso será perdido.',
        { variant: 'danger', confirmText: 'Descartar' }
      );
      if (confirmed) {
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

    // this.isDirty = false;
    // window.appState.isEditing = true;

    // Serializa estado inicial para comparação
    this.initialState = JSON.stringify({
      name: prompt?.name || '',
      desc: prompt?.description || '',
      tags: prompt?.tags || [],
      content: prompt?.content || '',
    });

    this.container.classList.remove('hidden');

    this.container.innerHTML = `
      <!-- Container Fullscreen: bg-bg-app para consistência com o tema -->
      <div class="absolute inset-0 z-50 flex flex-col h-full bg-bg-app animate-fade-in">
        
        <!-- HEADER DO EDITOR -->
        <div class="h-16 px-6 border-b border-border-subtle bg-bg-surface flex justify-between items-center shadow-sm shrink-0">
          <div class="flex items-center gap-3">
             <span class="p-2 rounded-lg bg-accent/10 text-accent">
                ${getIcon(this.editMode ? 'edit' : 'plus', 'w-5 h-5')}
             </span>
             <h2 class="text-lg font-bold text-text-main tracking-tight">
                ${this.editMode ? 'Editar Prompt' : 'Criar Novo Prompt'}
             </h2>
          </div>
          
          <div class="flex gap-3">
            <button id="btn-cancel" class="btn btn-ghost text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors">
                Cancelar
            </button>
            <button id="btn-save" class="btn btn-primary px-6 shadow-lg shadow-accent/20" title="Salvar (${metaKey}+S)">
                ${getIcon('save', 'w-4 h-4 mr-2')}
                Salvar
            </button>
          </div>
        </div>
        
        <!-- CORPO DO EDITOR (Scrollável se a tela for pequena, mas fixo em desktop) -->
        <div class="flex-1 overflow-hidden flex flex-col p-6 pb-2 gap-5">
          
          <!-- Metadados: Layout Grid Otimizado -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
            <!-- Nome (ocupa 8 colunas) -->
            <div class="md:col-span-8 space-y-1">
                <label class="text-[10px] uppercase font-bold text-text-muted tracking-wider ml-1">Nome do Prompt</label>
                <input type="text" id="edit-name" value="${
                  data.name
                }" placeholder="Ex: Gerador de Imagens Cyberpunk..." 
                    class="input-surface w-full h-10 px-3 rounded-lg text-sm font-medium focus:ring-2 ring-offset-1 ring-offset-bg-app dark:ring-offset-black">
            </div>
            
            <!-- Tags (ocupa 4 colunas) -->
            <div class="md:col-span-4 space-y-1">
                <label class="text-[10px] uppercase font-bold text-text-muted tracking-wider ml-1">Tags</label>
                <div class="relative">
                    <input type="text" id="edit-tags" value="${tagsString}" placeholder="js, css, react..." 
                        class="input-surface w-full h-10 px-3 pl-8 rounded-lg text-sm font-mono text-accent">
                    <div class="absolute left-2.5 top-2.5 text-text-muted pointer-events-none">#</div>
                </div>
            </div>

            <!-- Descrição (Full width) -->
            <div class="md:col-span-12 space-y-1">
                <input type="text" id="edit-desc" value="${
                  data.description
                }" placeholder="Uma breve descrição do que este prompt faz..." 
                    class="input-surface w-full h-10 px-3 rounded-lg text-sm text-text-muted focus:text-text-main transition-colors">
            </div>
          </div>
          
          <!-- ÁREA DE EDIÇÃO SPLIT (Flex Grow) -->
          <div class="flex-1 flex gap-4 overflow-hidden min-h-0">
            
            <!-- Coluna: Editor (Markdown Input) -->
            <div class="w-1/2 flex flex-col h-full rounded-xl border border-border-subtle bg-bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-all shadow-sm">
              <div class="px-4 py-2 bg-bg-surface-hover/50 border-b border-border-subtle flex justify-between items-center">
                 <label class="text-xs font-medium text-text-muted flex items-center gap-2">
                    ${getIcon('code', 'w-3 h-3')} Markdown Source
                 </label>
                 <span class="text-[10px] text-text-muted opacity-60">Aceita GFM</span>
              </div>
              <textarea id="edit-content" 
                class="flex-1 w-full h-full p-4 bg-transparent text-text-main font-mono text-sm leading-6 resize-none outline-none custom-scrollbar placeholder:text-text-muted/30"
                placeholder="Escreva seu prompt aqui...">${
                  data.content
                }</textarea>
            </div>
            
            <!-- Coluna: Preview -->
            <div class="w-1/2 flex flex-col h-full rounded-xl border border-border-subtle bg-bg-app/50 overflow-hidden">
              <div class="px-4 py-2 bg-bg-surface-hover/50 border-b border-border-subtle flex justify-between items-center">
                 <label class="text-xs font-medium text-text-muted flex items-center gap-2">
                    ${getIcon('eye', 'w-3 h-3')} Live Preview
                 </label>
              </div>
              <div id="preview-area" class="flex-1 p-5 overflow-y-auto custom-scrollbar prompt-content prose-sm">
                ${this.markdown.parse(data.content)}
              </div>
            </div>
          </div>

          <!-- Nota de Versão (Condicional) -->
          ${
            this.editMode
              ? `
          <div class="shrink-0 animate-fade-in-up">
             <div class="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg">
                <span class="text-yellow-600 dark:text-yellow-400">${getIcon(
                  'info-circle',
                  'w-4 h-4'
                )}</span>
                <input type="text" id="version-note" placeholder="O que mudou nesta versão? (Opcional)" 
                    class="bg-transparent border-none w-full text-sm text-text-main placeholder:text-text-muted focus:ring-0 outline-none h-auto p-0">
             </div>
          </div>
          `
              : ''
          }
          </div>
          <!-- Status Bar do Editor -->
          <div class="flex items-center gap-4 px-3 text-[10px] font-mono text-text-muted border-l border-border-subtle pl-6 mb-2 select-none">
              
              <!-- Caracteres -->
              <div title="Total de caracteres" class="flex items-center gap-1 hover:text-text-main transition-colors cursor-default">
                  <span id="stat-chars" class="font-bold text-text-main tabular-nums">0</span> 
                  <span class="opacity-70">chars</span>
              </div>

              <!-- Palavras -->
              <div title="Total de palavras" class="flex items-center gap-1 hover:text-text-main transition-colors cursor-default">
                  <span id="stat-words" class="font-bold text-text-main tabular-nums">0</span> 
                  <span class="opacity-70">palavras</span>
              </div>

              <!-- Tokens (Com destaque) -->
              <div title="Estimativa: 1 token ≈ 4 caracteres" class="group relative cursor-help flex items-center gap-1 transition-colors">
                  <!-- Ícone sutil de 'chip' -->
                  ${getIcon(
                    'chip',
                    'w-3 h-3 opacity-50 group-hover:text-accent transition-colors'
                  )}
                  
                  <span id="stat-tokens" class="font-bold text-accent transition-all duration-300 tabular-nums">0</span> 
                  <span class="text-accent/70 group-hover:text-accent transition-colors">tok (est.)</span>
              </div>
        </div>
      </div>
    `;

    this.attachListeners();
    // Calcula stats iniciais
    this.updateStats();
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

        //Atualiza Estatísticas
        this.updateStats();
      }, 300);
    });

    this.container.querySelector('#btn-cancel').onclick = () => {
      this.close();
    };

    this.container.querySelector('#btn-save').onclick = () => {
      this.save();
    };

    const inputs = this.container.querySelectorAll('input, textarea');
    inputs.forEach((el) => {
      el.addEventListener('input', () => {
        this.checkChanges();
      });
    });

    this.container.querySelector('#btn-cancel').onclick = async () => {
      await this.checkDirty(() => this.close());
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

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    const payload = {
      data: { name, description: desc, tags, content },
      saveVersion: this.editMode, // Se editando, salva versão
      note,
    };

    if (this.editMode) {
      payload.id = this.currentId;
    }

    eventBus.emit('prompt:save', payload);
    this.close();
  }

  /**
   * Calcula e atualiza a barra de estatísticas
   */
  updateStats() {
    const text = this.container.querySelector('#edit-content').value || '';

    // 1. Caracteres
    const chars = text.length;

    // 2. Palavras (Split por whitespace)
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    // 3. Tokens (Estimativa heurística)
    // OpenAI rule: ~4 chars per token.
    // Para maior precisão em código/português, podemos ser conservadores e usar 3.5 ou manter 4.
    const estTokens = Math.ceil(chars / 4);

    // Atualiza DOM
    const elChars = this.container.querySelector('#stat-chars');
    const elWords = this.container.querySelector('#stat-words');
    const elTokens = this.container.querySelector('#stat-tokens');

    elChars.textContent = chars.toLocaleString();
    elWords.textContent = words.toLocaleString();
    elTokens.textContent = estTokens.toLocaleString();

    // Feedback Visual de Limite (Warning System)
    // Reseta classes base para garantir que não acumule
    elTokens.className = 'font-bold tabular-nums transition-all duration-300';

    if (estTokens > this.tokenWarningLimit) {
      // CRÍTICO: Vermelho com Glow e Pulso
      elTokens.classList.add(
        'text-red-600',
        'dark:text-red-400',
        'animate-pulse',
        'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' // Glow effect
      );
    } else if (estTokens > this.tokenWarningLimit * 0.8) {
      // ALERTA: Amber (Melhor que yellow puro em fundo branco)
      elTokens.classList.add('text-amber-600', 'dark:text-amber-400');
    } else {
      // NORMAL: Cor do Accent (Violeta)
      elTokens.classList.add('text-accent');
    }
  }

  checkChanges() {
    const currentState = JSON.stringify({
      name: this.container.querySelector('#edit-name').value,
      desc: this.container.querySelector('#edit-desc').value,
      tags: this.container
        .querySelector('#edit-tags')
        .value.split(',')
        .map((t) => t.trim())
        .filter((t) => t),
      content: this.container.querySelector('#edit-content').value,
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
