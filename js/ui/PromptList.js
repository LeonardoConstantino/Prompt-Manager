import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';
import { formatDate, getCategoryColor } from '../utils/helpers.js';
import { confirmModal } from './ConfirmModal.js';
import { metaKey } from '../app.js';

export default class PromptList {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.prompts = [];
    this.allTags = []; // Lista de todas as tags disponíveis
    this.selectedTags = new Set(); // Tags ativas no filtro
    this.selectedId = null;
    this.searchQuery = '';
    this.filterFavorites = false;

    // Bindings
    this.handleSearch = this.handleSearch.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleCreateClick = this.handleCreateClick.bind(this);

    // Listeners
    eventBus.on('prompt:updated', () => this.refresh());

    // Novo: Listener para sincronia de abas (Repository emite isso quando Storage muda)
    eventBus.on('data:sync', () => {
      // Atualiza a lista silenciosamente
      this.refresh();
    });

    // Focar Busca
    eventBus.on('ui:focus-search', () => {
      const input = this.container.querySelector('#search-input');
      if (input) {
        input.focus();
        input.select();
      }
    });

    // Navegação via Setas
    eventBus.on('ui:navigate-list', ({ direction }) =>
      this.handleNavigation(direction)
    );
  }

  init() {
    this.renderInitialStructure();
    this.attachGlobalListeners();
    this.updateStatusBar();
  }

  // Novo Método para lidar com setas
  handleNavigation(direction) {
    // Se não tiver prompts ou filtro ativo retornar nada
    // Nota: Precisamos acessar a lista filtrada atual.
    // Dica Pro: No renderList, salve this.renderedPrompts = filtered;

    if (!this.renderedPrompts || this.renderedPrompts.length === 0) return;

    const currentIndex = this.renderedPrompts.findIndex(
      (p) => p.id === this.selectedId
    );
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Limites
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= this.renderedPrompts.length)
      newIndex = this.renderedPrompts.length - 1;

    // Se mudou o índice
    if (newIndex !== currentIndex) {
      const targetPrompt = this.renderedPrompts[newIndex];
      this.selectedId = targetPrompt.id;

      // Atualiza UI (Render e Scroll)
      this.renderList();

      // Emite seleção
      eventBus.emit('prompt:selected', { id: targetPrompt.id });

      // Scroll automático para manter o item visível
      setTimeout(() => {
        const el = this.container.querySelector(
          `[data-id="${targetPrompt.id}"]`
        ); // Adicione data-id no renderList
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }
  }

  renderInitialStructure() {
    this.container.innerHTML = `
      <div class="flex flex-col h-full bg-bg-surface border-r border-border-subtle">
        
        <!-- Header da Sidebar -->
        <div class="p-4 space-y-3 border-b border-border-subtle bg-bg-surface/50">
          
          <!-- 1. Botão Principal (Novo Prompt) -->
          <button id="btn-new-prompt" 
            class="btn btn-primary w-full justify-center py-2.5 font-medium text-sm tracking-wide rounded-lg transition-all active:scale-95 group shadow-lg shadow-accent/20" title="Novo Prompt (${metaKey}+N)">
            <span class="transform group-hover:rotate-90 transition-transform duration-300">
                ${getIcon('plus', 'w-5 h-5 mr-1')}
            </span>
            <span>Novo Prompt</span>
          </button>
          
          <!-- 2. Linha de Busca e Filtros -->
          <div class="flex items-center gap-2 h-10">
            
            <!-- A. Input de Busca (Ocupa o espaço restante com flex-1) -->
            <div class="relative flex-1  h-10 min-w-0">
                <input type="text" id="search-input" placeholder="Buscar..." 
                  class="w-full h-full input-surface rounded-lg px-3 pl-9 text-sm transition-shadow focus:shadow-md">
                
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-muted">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>
            
            <!-- B. Grupo de Botões (Largura fixa, não encolhe) -->
            <div class="flex items-center gap-1 shrink-0">
                
                <!-- Botão Favoritos -->
                <button id="btn-filter-fav" 
                  class="w-10 h-10 flex items-center justify-center input-surface rounded-lg text-text-muted hover:text-yellow-500 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all" 
                  title="Filtrar Favoritos">
                   ${getIcon('star-outline', 'w-5 h-5')}
                </button>
                
                <!-- Botão Tags -->
                <button id="btn-toggle-tags" 
                  class="w-10 h-10 flex items-center justify-center input-surface rounded-lg text-text-muted hover:text-accent hover:border-accent/50 hover:bg-accent/10 transition-all" 
                  title="Filtrar por Tags">
                    ${getIcon('tag', 'w-5 h-5')}
                </button>
            </div>

          </div>

          <!-- Área de Chips (Tags) -->
          <div id="tag-filter-area" class="hidden flex flex-wrap gap-1.5 pt-2 animate-fade-in border-t border-border-subtle/50 mt-2">
             <!-- Tags injetadas via JS -->
          </div>
        </div>

        <!-- Lista (Fundo sutilmente diferente se necessário) -->
        <div id="prompt-list-items" class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <!-- O JS vai popular isso -->
        </div>
        
        <!-- Rodapé da Sidebar (Status Bar) -->
<div id="sidebar-footer" 
     class="h-8 px-3 flex justify-between items-center text-[10px] font-mono text-text-muted border-t border-border-subtle bg-bg-app/80 backdrop-blur-md select-none z-10 transition-colors">
    
    <!-- Esquerda: Contadores -->
    <div class="flex items-center gap-3">
        <!-- Contador Geral -->
        <div class="flex items-center gap-1.5 hover:text-text-main transition-colors cursor-default">
            ${getIcon('database', 'w-3 h-3 opacity-70')}
            <span id="status-count">0 Prompts</span>
        </div>

        <!-- Separador e Filtro (Badge Style) -->
        <div id="status-filtered-container" class="flex items-center gap-1 animate-fade-in">
            <span class="w-px h-3 bg-border-subtle"id="status-sep"></span>
            <span id="status-filtered" class="text-accent font-bold bg-accent/10 px-1.5 rounded-[3px]">
                <!-- JS injeta: "Tag: JS" -->
            </span>
        </div>
    </div>

    <!-- Direita: Storage & Versão -->
    <div class="flex items-center gap-3">
        <!-- Storage Indicator -->
        <div id="status-storage" 
             class="flex items-center gap-1.5 cursor-help hover:text-text-main transition-colors group" 
             title="Uso do IndexedDB">
            
            <!-- Bolinha de status: Emerald para bom, Amber para alerta -->
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 group-hover:bg-emerald-400 transition-colors"></span>
            </span>
            
            <span class="opacity-80 group-hover:opacity-100">... KB</span>
        </div>
    </div>
</div>
      </div>
    `;
  }

  updateStatusBar(filteredCount = null) {
    const total = this.prompts.length;
    const elCount = this.container.querySelector('#status-count');
    const elFiltered = this.container.querySelector('#status-filtered');
    const elSep = this.container.querySelector('#status-sep');

    // Atualiza contadores
    elCount.textContent = `${total} Prompt${total !== 1 ? 's' : ''}`;

    if (filteredCount !== null && filteredCount !== total) {
      elFiltered.textContent = `${filteredCount} visíveis`;
      elFiltered.classList.remove('hidden');
      elSep.classList.remove('hidden');
    } else {
      elFiltered.classList.add('hidden');
      elSep.classList.add('hidden');
    }

    // Atualiza Storage (Dispara evento para pedir o tamanho atualizado)
    // Fazemos isso via evento para desacoplar a UI da lógica de cálculo de bytes
    eventBus.emit('ui:request-storage-stats', {});
  }

  // Método para atualizar a lista de todas as tags disponíveis
  setTags(tags) {
    this.allTags = tags;
    this.renderTagCloud();
  }

  renderTagCloud() {
    const container = this.container.querySelector('#tag-filter-area');
    container.innerHTML = '';

    if (this.allTags.length === 0) {
      container.innerHTML =
        '<span class="text-xs text-center text-text-muted">Sem tags cadastradas.</span>';
      return;
    }

    this.allTags.forEach((tag) => {
      const isSelected = this.selectedTags.has(tag);
      const colors = getCategoryColor(tag);
      const btn = document.createElement('button');
      btn.className = `text-[10px] px-2 py-1 rounded-full border transition-all ${
        isSelected
          ? `${colors.bg} ${colors.text} shadow-sm`
          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
      }`;
      btn.textContent = `#${tag}`;

      btn.onclick = () => {
        if (this.selectedTags.has(tag)) {
          this.selectedTags.delete(tag);
        } else {
          this.selectedTags.add(tag);
        }
        this.renderTagCloud(); // Re-render para atualizar estilos
        this.renderList(); // Filtra a lista principal
      };

      container.appendChild(btn);
    });

    // Botão limpar filtros (só aparece se houver seleção)
    if (this.selectedTags.size > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'text-[10px] px-2 py-1 text-red-400 hover:underline';
      clearBtn.textContent = 'Limpar';
      clearBtn.onclick = () => {
        this.selectedTags.clear();
        this.renderTagCloud();
        this.renderList();
      };
      container.appendChild(clearBtn);
    }
  }

  attachGlobalListeners() {
    const btnNew = this.container.querySelector('#btn-new-prompt');
    const inputSearch = this.container.querySelector('#search-input');

    // Listener Toggle da Área de Tags
    const btnTags = this.container.querySelector('#btn-toggle-tags');
    const tagArea = this.container.querySelector('#tag-filter-area');

    btnTags.onclick = () => {
      tagArea.classList.toggle('hidden');
      btnTags.classList.toggle('bg-gray-600');
      btnTags.classList.toggle('text-purple-400');
    };

    btnNew.addEventListener('click', this.handleCreateClick);

    let debounceTimer;
    inputSearch.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(this.handleSearch, 300);
      // this.handleSearch();
    });

    // Listener Filtro Favoritos
    const btnFav = this.container.querySelector('#btn-filter-fav');
    btnFav.onclick = () => {
      this.filterFavorites = !this.filterFavorites;
      btnFav.classList.toggle('text-yellow-400', this.filterFavorites);
      btnFav.classList.toggle('bg-gray-600', this.filterFavorites);
      this.renderList(); // Re-renderiza localmente
    };

    // Escutar atualizações do repositório
    eventBus.on('prompt:created', () => this.refresh());
    eventBus.on('prompt:updated', () => this.refresh());
    eventBus.on('prompt:deleted', () => this.refresh());
    eventBus.on('data:imported', () => this.refresh());
  }

  setPrompts(prompts) {
    this.prompts = prompts;
    this.renderList();
  }

  refresh() {
    // Solicita ao app que busque os dados atualizados
    eventBus.emit('ui:request-refresh');
  }

  handleSearch() {
    eventBus.emit('ui:search', { query: this.searchQuery });
  }

  handleCreateClick() {
    this.selectedId = null;
    this.renderList(); // Remove seleção visual
    eventBus.emit('prompt:create');
  }

  handleSelect(id) {
    this.selectedId = id;
    this.renderList(); // Atualiza visual (highlight)
    eventBus.emit('prompt:selected', { id });
  }

  renderList() {
    const listContainer = this.container.querySelector('#prompt-list-items');
    listContainer.innerHTML = '';

    // LÓGICA DE FILTRAGEM AVANÇADA
    let filtered = this.prompts.filter((p) => {
      // 1. Busca Texto
      const matchesQuery = (p.name + p.description)
        .toLowerCase()
        .includes(this.searchQuery.toLowerCase());

      // 2. Filtro Favoritos
      const matchesFav = this.filterFavorites ? p.isFavorite : true;

      // 3. Filtro Tags (AND logic: Prompt deve ter TODAS as tags selecionadas)
      const matchesTags =
        this.selectedTags.size === 0 ||
        Array.from(this.selectedTags).every((t) => p.tags.includes(t));

      return matchesQuery && matchesFav && matchesTags;
    });

    // Ordenação: Favoritos primeiro, depois atualizado recentemente
    filtered.sort((a, b) => {
      if (a.isFavorite === b.isFavorite) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return a.isFavorite ? -1 : 1;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div class="text-center text-gray-500 mt-10 text-sm italic">Nenhum prompt encontrado</div>`;
      return;
    }

    // Salva a lista renderizada para navegação via setas
    this.renderedPrompts = filtered;

    filtered.forEach((prompt) => {
      const el = document.createElement('div');
      el.setAttribute('data-id', prompt.id);
      const isSelected = this.selectedId === prompt.id;

      // 1. Definição de Estilos Dinâmicos (Semânticos)
      // Selecionado: Fundo com tintura do acento, borda sólida e brilho
      const selectedClass =
        'bg-accent/10 border-accent shadow-[0_0_15px_-5px_var(--accent)] z-10';

      // Padrão: Fundo "recuado" (app bg), borda sutil. Hover traz brilho na borda.
      const defaultClass =
        'bg-bg-app border-border-subtle hover:border-accent/50 hover:bg-bg-surface-hover hover:shadow-md';

      el.className = `group relative p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
        isSelected ? selectedClass : defaultClass
      }`;

      // 2. Ícone de Estrela
      // Mantemos o amarelo pois é padrão universal, mas ajustamos o estado "inativo"
      const starIcon = prompt.isFavorite
        ? getIcon('star-solid', 'w-4 h-4 text-yellow-500 drop-shadow-sm')
        : getIcon(
            'star-outline',
            'w-4 h-4 text-text-muted group-hover:text-yellow-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100' // Só aparece no hover para limpar o visual
          );

      // Lógica para manter a estrela visível se for favorito, senão só no hover (opcional, removi a opacidade 0 se preferir sempre visivel, mas deixei cleaner)
      // Se preferir sempre visível, remova 'opacity-0 group-hover:opacity-100' acima.

      el.innerHTML = `
        <div class="flex justify-between items-start mb-1.5">
            <!-- Título: text-text-main para alto contraste -->
            <h3 class="font-bold text-text-main truncate pr-7 text-sm tracking-tight">${
              prompt.name
            }</h3>
            
            <!-- Botão Favorito: Área de clique melhorada -->
            <div class="fav-btn absolute top-2 right-2 p-1.5 rounded-md hover:bg-bg-surface transition-colors" data-id="${
              prompt.id
            }">
                ${starIcon}
            </div>
        </div>

        <!-- Descrição: text-text-muted -->
        <p class="text-xs text-text-muted truncate mb-3 min-h-[1rem] leading-relaxed opacity-90">${
          prompt.description ||
          '<span class="italic opacity-50">Sem descrição</span>'
        }</p>

        <!-- Tags -->
        <div class="flex gap-1.5 flex-wrap">
          ${prompt.tags
            .slice(0, 3)
            .map((tag) => {
              const colors = getCategoryColor(tag);
              return `<span class="text-[10px] ${colors.bg} ${colors.text} border border-white/5 px-2 py-0.5 rounded-md tracking-wide font-medium shadow-sm">${tag}</span>`;
            })
            .join('')}
            ${
              prompt.tags.length > 3
                ? `<span class="text-[10px] text-text-muted py-0.5">+${
                    prompt.tags.length - 3
                  }</span>`
                : ''
            }
        </div>

        <!-- Rodapé: Data -->
        <div class="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle/50">
             <div class="text-[10px] text-text-muted font-mono opacity-70">
              ${formatDate(prompt.updatedAt, true)} ~ ${formatDate(
        prompt.updatedAt,
        false,
        true
      )}
            </div>
             <!-- Opcional: Indicador visual se for selecionado -->
             ${
               isSelected
                 ? '<div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>'
                 : ''
             }
        </div>
      `;

      // Click no Card (Selecionar)
      el.onclick = async (e) => {
        if (!e.target.closest('.fav-btn')) {
          // Verifica Dirty State Globalmente antes de trocar
          if (window.appState && window.appState.isEditing) {
            const confirmed = await confirmModal.ask(
              'Trocar de Prompt?',
              'Você está editando o prompt atual. Deseja descartar as alterações e mudar?',
              { variant: 'danger', confirmText: 'Descartar e Trocar' }
            );
            if (!confirmed) {
              return; // Cancela troca
            }
            // Se aceitou, reseta a flag manualmente (hack seguro)
            // O ideal seria emitir um evento 'editor:force-close', mas isso funciona
            window.appState.isEditing = false;
            // Precisamos avisar o editor para limpar sua flag interna também
            eventBus.emit('editor:cancel');
          }

          this.selectedId = prompt.id;
          this.renderList();
          eventBus.emit('prompt:selected', { id: prompt.id });
        }
      };

      // Click no Favorito (Toggle)
      const favBtn = el.querySelector('.fav-btn');
      favBtn.onclick = (e) => {
        e.stopPropagation(); // Impede seleção do card
        eventBus.emit('prompt:toggle-fav', { id: prompt.id });
      };

      listContainer.appendChild(el);
    });

    // CHAMADA DA STATUS BAR
    this.updateStatusBar(filtered.length);
  }
}
