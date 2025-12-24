import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';
import { formatDate, getCategoryColor } from '../utils/helpers.js';

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
  }

  init() {
    this.renderInitialStructure();
    this.attachGlobalListeners();
  }

  renderInitialStructure() {
    this.container.innerHTML = `
      <div class="flex flex-col h-full bg-gray-800 border-r border-gray-700">
        <!-- Header Fixo -->
        <div class="p-4 border-b border-gray-700 space-y-3 bg-gray-800 z-10">
          <button id="btn-new-prompt" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors shadow-lg">
            ${getIcon('plus', 'w-5 h-5 inline-block mr-2')}
            <span>Novo Prompt</span>
          </button>
          
          <div class="flex gap-2">
            <input type="text" id="search-input" placeholder="Buscar..." 
              class="flex-1 bg-gray-900 border border-gray-600 text-gray-200 text-sm rounded focus:ring-1 focus:ring-blue-500 focus:outline-none p-2">
            
            <div class="flex flex-col gap-2">
              <button id="btn-filter-fav" class="px-2 bg-gray-700 border border-gray-600 rounded text-gray-400 hover:text-yellow-400 transition-colors" title="Favoritos">
               ${getIcon('star-outline', 'w-5 h-5')}
            </button>
            
            <!-- Botão Toggle Tags -->
            <button id="btn-toggle-tags" class="px-2 bg-gray-700 border border-gray-600 rounded text-gray-400 hover:text-purple-400 transition-colors" title="Filtrar Tags">
                ${getIcon('tag', 'w-5 h-5')}
            </button>
          </div>
            </div>

          <!-- Área de Chips de Tags (Expandível) -->
          <div id="tag-filter-area" class="hidden flex flex-wrap gap-2 pt-2 border-t border-gray-700 max-h-32 overflow-y-auto custom-scrollbar">
             <!-- Tags injetadas via JS -->
          </div>
        </div>

        <!-- Lista -->
        <div id="prompt-list-items" class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar"></div>
      </div>
    `;
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
        '<span class="text-xs text-gray-500">Sem tags cadastradas.</span>';
      return;
    }

    this.allTags.forEach((tag) => {
      const isSelected = this.selectedTags.has(tag);
      const btn = document.createElement('button');
      btn.className = `text-[10px] px-2 py-1 rounded-full border transition-all ${
        isSelected
          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
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

    filtered.forEach((prompt) => {
      const el = document.createElement('div');
      const isSelected = this.selectedId === prompt.id;

      el.className = `group relative p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
        isSelected
          ? 'bg-blue-900/40 border-blue-600 shadow-md'
          : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
      }`;

      // Ícone de Estrela (Filled ou Outline)
      const starIcon = prompt.isFavorite
        ? getIcon('star-solid', 'w-4 h-4 text-yellow-400')
        : getIcon(
            'star-outline',
            'w-4 h-4 text-gray-500 hover:text-yellow-400 transition-colors'
          );

      el.innerHTML = `
        <div class="flex justify-between items-start mb-1">
            <h3 class="font-bold text-gray-200 truncate pr-6 text-sm">${
              prompt.name
            }</h3>
            <div class="fav-btn absolute top-3 right-3 p-1 rounded-full hover:bg-gray-600/50" data-id="${
              prompt.id
            }">
                ${starIcon}
            </div>
        </div>
        <p class="text-xs text-gray-400 truncate mb-2 min-h-[1rem]">${
          prompt.description || '...'
        }</p>
        <div class="flex gap-1 flex-wrap">
          ${prompt.tags
            .slice(0, 3)
            .map((tag) => {
              const colors = getCategoryColor(tag);

              return `<span class="text-[10px] ${colors.bg} ${colors.text} px-1.5 py-0.5 rounded-full tracking-wide font-mono">#${tag}</span>`;
            })
            .join('')}
        </div>
        <div class="text-[10px] text-gray-500 mt-2">
          ${formatDate(prompt.updatedAt, true)} ~ ${formatDate(
        prompt.updatedAt,
        false,
        true
      )}
        </div>
      `;

      // Click no Card (Selecionar)
      el.onclick = (e) => {
        if (!e.target.closest('.fav-btn')) {
          // Verifica Dirty State Globalmente antes de trocar
          if (window.appState && window.appState.isEditing) {
            if (
              !confirm('Você está editando um prompt. Descartar alterações?')
            ) {
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
  }
}
