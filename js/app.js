import GlobalLoader from './ui/GlobalLoader.js';
import BackupManager from './core/BackupManager.js';
import PromptRepository from './core/PromptRepository.js';
import PromptList from './ui/PromptList.js';
import PromptViewer from './ui/PromptViewer.js';
import PromptEditor from './ui/PromptEditor.js';
import VersionHistory from './ui/VersionHistory.js';
import Modal from './ui/Modal.js';
import SettingsModal from './ui/SettingsModal.js';
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
  }

  async init() {
    try {
      await this.repository.initialize();

      this.promptList.init();

      // Carregamento inicial de dados
      this.refreshPrompts();
      this.applyConfig();

      this.setupEventOrchestration();

      console.log('App initialized successfully');
    } catch (error) {
       // Se der erro fatal no boot, removemos o loader para mostrar o erro
       eventBus.emit('app:loading:end', { type: 'boot' });
      console.error('Initialization failed:', error);
      document.body.innerHTML = `<div class="p-4 text-red-500">Erro fatal: ${error.message}</div>`;
    }
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
            toast.show(newState ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success', 1500);
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
        toast.show(`Backup restaurado com sucesso! ${count} prompts carregados.`, 'success');

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

    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        if (
          confirm(
            'Importar um backup substituirá TODOS os prompts atuais. Deseja continuar?'
          )
        ) {
          eventBus.emit('backup:request-import', { file: e.target.files[0] });
        }
        e.target.value = ''; // Reset para permitir re-importar mesmo arquivo
      }
    };

    
    // --- CONFIGURAÇÕES ---
    
    document.getElementById('btn-settings').onclick = () => eventBus.emit('settings:open');
    
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
        } catch(err) {
            toast.show('Erro ao salvar pref.', 'error');
        }
    });

    // Preview de fonte em tempo real
    eventBus.on('settings:preview-font', (size) => {
        document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
    });

    // Quando a config muda (salva ou sync de outra aba), reaplica estilos
    eventBus.on('config:updated', (config) => {
        this.applyConfig();
    });
  }

  // Método central para aplicar estilos baseados na config
  applyConfig() {
    const config = this.repository.getConfig();
    const prefs = config.preferences;

    // 1. Aplica Tamanho da Fonte
    const fontSize = prefs.editorFontSize || 14;
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
    
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
}

// Inicialização
const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
