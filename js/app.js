import GlobalLoader from './ui/GlobalLoader.js';
import BackupManager from './core/BackupManager.js';
import PromptRepository from './core/PromptRepository.js';
import PromptList from './ui/PromptList.js';
import PromptViewer from './ui/PromptViewer.js';
import PromptEditor from './ui/PromptEditor.js';
import VersionHistory from './ui/VersionHistory.js';
import Modal from './ui/Modal.js';
import SettingsModal from './ui/SettingsModal.js';
import HelpModal from './ui/HelpModal.js';
import { confirmModal } from './ui/ConfirmModal.js';
import eventBus from './utils/eventBus.js';
import { toast } from './utils/Toast.js';

class App {
  constructor() {
    // Componentes principais
    this.loader = new GlobalLoader();
    this.repository = new PromptRepository();
    this.backupManager = new BackupManager();

    // Instancia Componentes
    this.promptList = new PromptList('sidebar');
    this.promptViewer = new PromptViewer('viewer');
    this.promptEditor = new PromptEditor('editor-overlay');
    this.modal = new Modal('modal-container');
    this.settingsModal = new SettingsModal();
    this.versionHistory = new VersionHistory();
    this.helpModal = new HelpModal();
  }

  async init() {
    try {
      await this.repository.initialize();

      this.promptList.init();

      // Carregamento inicial de dados
      this.refreshPrompts();
      this.applyConfig();

      this.setupEventOrchestration();
      this.setupKeyboardShortcuts();

      await this.updateStatusBar();

      eventBus.emit('app:loading:end', { type: 'boot' });

      // Colocamos um pequeno delay para não aparecer "em cima" da animação de saída do loader
      setTimeout(() => this.checkFirstRun(), 800);

      console.log('App initialized successfully');
    } catch (error) {
      // Se der erro fatal no boot, removemos o loader para mostrar o erro
      eventBus.emit('app:loading:end', { type: 'boot' });
      console.error('Initialization failed:', error);
      this.renderFatalError(error);
    }
  }

  /**
   * Verifica se é a primeira vez que o usuário abre o app
   */
  checkFirstRun() {
    // Dica Pro: Use versionamento na chave.
    // Se no futuro você mudar muito o tutorial, mude para 'pm_intro_seen_v2'
    // e o modal aparecerá novamente para todos.
    const STORAGE_KEY = 'prompt_manager_intro_seen_v1';

    const hasSeen = localStorage.getItem(STORAGE_KEY);

    if (!hasSeen) {
      eventBus.emit('help:open');
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignora atalhos se o foco estiver em inputs (exceto atalhos globais com Ctrl/Cmd)
      const isInputFocused = ['INPUT', 'TEXTAREA'].includes(
        document.activeElement.tagName
      );
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // --- ATALHOS GLOBAIS (Funcionam sempre) ---

      // Ctrl/Cmd + N: Novo Prompt
      if (isCtrlOrMeta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        eventBus.emit('prompt:create');
      }

      // Ctrl/Cmd + S: Salvar (Apenas se editor estiver aberto)
      if (isCtrlOrMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Emite evento genérico, o componente decide se salva
        eventBus.emit('ui:trigger-save');
      }

      // Ctrl/Cmd + K ou /: Focar na Busca
      if (
        (isCtrlOrMeta && e.key.toLowerCase() === 'k') ||
        (!isInputFocused && e.key === '/')
      ) {
        e.preventDefault();
        eventBus.emit('ui:focus-search');
      }

      // Escape: Cancelar/Fechar
      if (e.key === 'Escape') {
        // Prioridade: Fechar Modais > Fechar Editor > Limpar Busca
        eventBus.emit('modal:close');
        eventBus.emit('editor:cancel');
        document.activeElement.blur(); // Tira foco de inputs
      }

      // --- ATALHOS DE CONTEXTO (Apenas se não estiver digitando) ---
      if (!isInputFocused) {
        // Ctrl/Cmd + E: Editar prompt selecionado
        if (isCtrlOrMeta && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          // Pega o ID do prompt atualmente selecionado na lista (precisamos expor isso ou pedir à lista)
          eventBus.emit('ui:trigger-edit');
        }

        // Setas: Navegação na Lista
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          eventBus.emit('ui:navigate-list', { direction: 'next' });
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          eventBus.emit('ui:navigate-list', { direction: 'prev' });
        }

        // Delete: Apagar prompt selecionado
        if (e.key === 'Delete') {
          eventBus.emit('ui:trigger-delete');
        }
      }
    });
  }

  setupEventOrchestration() {
    // UI pede lista de versões
    eventBus.on('ui:request-versions', ({ promptId }) => {
      const versions = this.repository.getVersions(promptId);
      eventBus.emit('history:list-loaded', { promptId, versions });
    });

    // UI pede restauração
    eventBus.on('version:restore', async ({ promptId, versionId }) => {
      try {
        await this.repository.applyVersion(promptId, versionId);
        // O applyVersion já emite 'prompt:updated', que atualiza o Viewer
        toast.show('Versão restaurada com sucesso.', 'success');
      } catch (err) {
        console.error(err);
        toast.show('Erro ao restaurar versão: ' + err.message, 'error');
      }
    });

    // UI pede delete de versão
    eventBus.on('version:delete', async ({ promptId, versionId }) => {
      try {
        await this.repository.deleteVersion(promptId, versionId);
        // Atualiza a lista de versões aberta no modal
        const versions = this.repository.getVersions(promptId);
        eventBus.emit('history:list-loaded', { promptId, versions });
      } catch (err) {
        toast.show(err.message, 'error');
      }
    });
    // UI solicita busca
    eventBus.on('ui:search', ({ query }) => {
      const results = this.repository.searchPrompts(query);
      this.promptList.setPrompts(results);
    });

    eventBus.on('prompt:toggle-fav', async ({ id }) => {
      try {
        const newState = await this.repository.toggleFavorite(id);
        toast.show(
          newState ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
          'success',
          1500
        );
        this.refreshPrompts();
      } catch (err) {
        toast.show('Erro ao atualizar favorito', 'error');
      }
    });

    // UI solicita refresh geral
    eventBus.on('ui:request-refresh', () => {
      this.refreshPrompts();
    });

    // UI solicita detalhes de um prompt
    eventBus.on('ui:request-details', ({ id }) => {
      const prompt = this.repository.getPromptById(id);
      if (prompt) {
        this.promptViewer.update(prompt);
      }
    });

    // UI solicita dados para edição
    eventBus.on('ui:request-edit-data', ({ id }) => {
      const prompt = this.repository.getPromptById(id);
      if (prompt) {
        eventBus.emit('editor:load', { prompt });
      }
    });

    // Editor solicita salvamento
    eventBus.on('prompt:save', async ({ id, data, saveVersion, note }) => {
      try {
        if (id) await this.repository.updatePrompt(id, data, saveVersion, note);
        else await this.repository.createPrompt(data);

        toast.show('Prompt salvo com sucesso!', 'success');
        // Editor fecha via evento próprio emitido pelo componente ou controle aqui
      } catch (err) {
        toast.show('Erro ao salvar: ' + err.message, 'error');
      }
    });

    // Delete
    eventBus.on('prompt:delete', async ({ id }) => {
      await this.repository.deletePrompt(id);
      toast.show('Prompt removido.', 'info');
    });

    // --- LISTENERS DE BACKUP ---

    eventBus.on('backup:request-export', async () => {
      try {
        await this.backupManager.exportData(this.repository);
        toast.show('Backup exportado com sucesso!', 'success');
      } catch (err) {
        toast.show('Erro no backup: ' + err.message, 'error');
      }
    });

    eventBus.on('backup:request-import', async ({ file }) => {
      try {
        const count = await this.backupManager.importData(
          this.repository,
          file
        );
        toast.show(
          `Backup restaurado com sucesso! ${count} prompts carregados.`,
          'success'
        );

        // Recarrega a interface
        this.refreshPrompts();
        // Se houver um prompt aberto no viewer, limpa ele pois pode não existir mais
        eventBus.emit('prompt:deleted', {});

        toast.show('Backup importado com sucesso!', 'success');
      } catch (err) {
        toast.show('Erro na importação: ' + err.message, 'error');
      }
    });

    eventBus.on('data:sync', () => {
      console.log('🔄 Dados sincronizados via BroadcastChannel');
      this.refreshPrompts();
      // Se o prompt aberto foi deletado remotamente, limpa o viewer
      // (Lógica simples: recarrega lista, viewer atualiza se tentar interagir)
    });

    // NOVO: Intercepta ui:request-details para carregar config junto
    eventBus.on('ui:request-details', ({ id }) => {
      const prompt = this.repository.getPromptById(id);
      const config = this.repository.getConfig(); // Pega a config atualizada
      if (prompt) {
        // Envia prompt E config para o viewer
        eventBus.emit('viewer:load-prompt', { prompt, config });
      }
    });

    // Lógica da Navbar
    document.getElementById('btn-export').onclick = () => {
      eventBus.emit('backup:request-export');
    };

    const fileInput = document.getElementById('file-import');
    document.getElementById('btn-import').onclick = () => {
      fileInput.click(); // Abre diálogo do sistema
    };

    fileInput.onchange = async (e) => {
      if (e.target.files.length > 0) {
        const confirmed = await confirmModal.ask(
          'Importar Backup?',
          'ATENÇÃO: Isso irá SUBSTITUIR TODOS os prompts e configurações atuais pelos dados do arquivo. Esta ação não pode ser desfeita.',
          { variant: 'danger', confirmText: 'Sim, Substituir Tudo' }
        );
        if (confirmed) {
          eventBus.emit('backup:request-import', { file: e.target.files[0] });
        }
        e.target.value = ''; // Reset para permitir re-importar mesmo arquivo
      }
    };

    // --- CONFIGURAÇÕES ---

    document.getElementById('btn-settings').onclick = () =>
      eventBus.emit('settings:open');

    // UI pede para abrir settings
    eventBus.on('settings:open', () => this.settingsModal.open());

    // Modal pede config atual
    eventBus.on('ui:request-config', (callback) => {
      callback(this.repository.getConfig());
    });

    // Modal salva config
    eventBus.on('settings:save', async (newConfig) => {
      try {
        await this.repository.updateConfig(newConfig);
        toast.show('Preferências salvas', 'success');
      } catch (err) {
        toast.show('Erro ao salvar pref.', 'error');
      }
    });

    // Preview de fonte em tempo real
    eventBus.on('settings:preview-font', (size) => {
      document.documentElement.style.setProperty(
        '--editor-font-size',
        `${size}px`
      );
    });

    // Quando a config muda (salva ou sync de outra aba), reaplica estilos
    eventBus.on('config:updated', (config) => {
      this.applyConfig();
    });

    // Atualização da Status Bar (Storage)
    eventBus.on('ui:request-storage-stats', async () => {
      await this.updateStatusBar();
    });

    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) {
      btnHelp.onclick = () => eventBus.emit('help:open');
    }
  }

  async updateStatusBar() {
    try {
      // Assume que repo.getStorageStats() chama storage.getStorageSize()
      // Retorna { used, quota, percentage }
      const stats = await this.repository.getStorageSize();

      // Formata bytes para KB/MB
      const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      const sizeStr = stats ? formatBytes(stats.used) : 'Unknown';

      // Atualiza diretamente o DOM (ou emita um evento de volta 'ui:update-stats')
      // Para ser rápido, vamos atualizar o DOM se o elemento existir
      const elStorage = document.getElementById('status-storage');
      if (elStorage) {
        // Mantém a bolinha verde (indicador de saúde) + texto
        elStorage.innerHTML = `
                    <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 group-hover:bg-emerald-400 transition-colors"></span>
            </span>
            
            <span class="opacity-80 group-hover:opacity-100">${sizeStr}</span>
                `;
      }
    } catch (err) {
      console.warn('Failed to get storage stats', err);
    }
  }

  // Método central para aplicar estilos baseados na config
  applyConfig() {
    const config = this.repository.getConfig();
    const prefs = config.preferences;

    // 1. Aplica Tamanho da Fonte
    const fontSize = prefs.editorFontSize || 14;
    document.documentElement.style.setProperty(
      '--editor-font-size',
      `${fontSize}px`
    );

    // Injeta estilo dinâmico se não existir (para usar a variável CSS)
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.innerHTML = `
            .prompt-content, textarea#edit-content, #preview-area {
                font-size: var(--editor-font-size) !important;
                line-height: 1.6;
            }
        `;
      document.head.appendChild(style);
    }

    // 2. Aplica Tema
    if (prefs.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode-active'); // Hook para CSS extra
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode-active');
    }
  }

  refreshPrompts() {
    const prompts = this.repository.getAllPrompts();
    // Atualiza lista de tags na UI
    const allTags = this.repository.getAllTags();
    this.promptList.setTags(allTags);
    // Ordenar por updated mais recente
    prompts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    this.promptList.setPrompts(prompts);
  }

  /**
   * Renderiza uma tela de erro fatal personalizada
   * @param {Error} err O erro a ser exibido
   */
  renderFatalError(err) {
    // Tenta pegar a mensagem de forma segura
    const msg = err?.message || String(err) || 'Erro desconhecido';
    const stack = err?.stack || '';

    // Ícone de Alerta (Inline SVG para não depender do helper de ícones que pode ter falhado)
    const alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

    document.body.innerHTML = `
      <div class="h-screen w-screen bg-[#09090b] text-[#e4e4e7] flex items-center justify-center p-6 font-sans antialiased overflow-hidden relative selection:bg-red-500/30">
        
        <!-- Background Noise/Glow (Decorativo) -->
        <div class="absolute top-[-20%] left-[-10%] w-125 h-125 bg-red-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div class="absolute bottom-[-20%] right-[-10%] w-125 h-125 bg-purple-900/30 rounded-full blur-[120px] pointer-events-none"></div>

        <!-- Card de Erro -->
        <div class="relative max-w-lg w-full bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            
            <!-- Barra de Topo com Gradiente de Perigo -->
            <div class="h-1.5 w-full bg-linear-to-r from-red-600 via-orange-500 to-red-600"></div>

            <div class="p-8">
                <!-- Cabeçalho -->
                <div class="flex items-center gap-4 mb-6">
                    <div class="p-3 bg-red-500/10 rounded-xl border border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.5)]">
                        ${alertIcon}
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-white">Falha Crítica</h1>
                        <p class="text-sm text-[#a1a1aa]">O sistema encontrou um erro irrecuperável.</p>
                    </div>
                </div>

                <!-- Caixa de Código do Erro -->
                <div class="bg-black rounded-lg border border-red-900/30 p-4 mb-6 overflow-x-auto relative group">
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span class="text-[10px] text-red-400 font-mono uppercase bg-red-900/50 px-2 py-0.5 rounded">Log</span>
                    </div>
                    <code class="block font-mono text-xs text-red-400 wrap-break-word leading-relaxed">
                        <span class="select-all">${msg}</span>
                    </code>
                    ${
                      stack
                        ? `<details class="mt-2"><summary class="text-[10px] text-[#52525b] cursor-pointer hover:text-[#a1a1aa] transition-colors list-none">Ver Stack Trace</summary><pre class="mt-2 text-[10px] text-[#52525b] whitespace-pre-wrap select-all">${stack}</pre></details>`
                        : ''
                    }
                </div>

                <!-- Botões de Ação -->
                <div class="flex flex-col gap-3">
                    <button onclick="window.location.reload()" 
                        class="w-full py-3 bg-white text-black text-sm font-bold rounded-lg hover:bg-[#d4d4d8] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12q0-3.35 2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.188-2.2T12 6Q9.5 6 7.75 7.75T6 12q0 2.5 1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20Z"/></svg>
                        Reiniciar Aplicação
                    </button>
                    
                    <div class="flex gap-3">
                         <button onclick="navigator.clipboard.writeText(\`${msg}\\n\\n${stack}\`).then(() => this.innerText = 'Copiado!')" 
                            class="flex-1 py-2.5 bg-[#27272a] text-[#a1a1aa] text-xs font-medium rounded-lg border border-[#3f3f46] hover:text-white hover:border-[#52525b] transition-all">
                            Copiar Relatório
                        </button>
                        <button onclick="localStorage.clear(); window.location.reload()" 
                            class="flex-1 py-2.5 bg-[#27272a] text-[#a1a1aa] text-xs font-medium rounded-lg border border-[#3f3f46] hover:text-red-400 hover:border-red-900/50 transition-all" title="Use se reiniciar não resolver">
                            Resetar Dados Locais
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Rodapé Técnico -->
            <div class="bg-[#0f0f11] p-3 text-center border-t border-[#27272a]">
                <p class="text-[10px] text-[#3f3f46] font-mono">
                    Prompt Manager v1.0 &bull; Deep Nebula UI
                </p>
            </div>
        </div>
      </div>
    `;
  }
}

export let metaKey = 'Ctrl'; // Padrão, será ajustado no load

// Inicialização
const app = new App();
window.addEventListener('DOMContentLoaded', () => {
  metaKey = navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl';

  app.init();
});
