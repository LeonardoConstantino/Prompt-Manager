import GlobalLoader from './ui/GlobalLoader.js';
import { detectOS, isMac, detectIsMobile, isMobile } from './utils/platform.js';
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
import KeyboardShortcutManager from './lib/KeyboardShortcutManager.js';
import { toast } from './utils/Toast.js';

class App {
  constructor() {
    detectOS();
    detectIsMobile();
    this.setupMobileMenu();
    // Componentes principais
    this.loader = new GlobalLoader();
    this.repository = new PromptRepository();
    this.backupManager = new BackupManager();
    // Instancia o Gerenciador de Atalhos
    this.shortcuts = new KeyboardShortcutManager({
      debug: false,
      enableSequences: true,
      enableLongPress: true,
    });

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
    this.shortcuts.init();
    const metaKey = isMac ? 'meta' : 'ctrl';

    // --- 1. CRUD & ARQUIVO ---

    // Novo Prompt (Ctrl+N ou Cmd+N)
    const newPromptHandler = (e) => {
      e.preventDefault();
      eventBus.emit('prompt:create');
    };
    this.shortcuts.register(`${metaKey}+n`, newPromptHandler, {
      description: 'Novo Prompt',
    });

    // Salvar (Ctrl+S ou Cmd+S)
    const saveHandler = (e) => {
      e.preventDefault();
      eventBus.emit('ui:trigger-save');
    };
    this.shortcuts.register(`${metaKey}+s`, saveHandler, {
      description: 'Salvar',
    });

    // --- 2. NAVEGAÇÃO & UI ---

    // Focar Busca (Ctrl+K, Cmd+K ou /)
    const searchHandler = (e) => {
      e.preventDefault();
      eventBus.emit('ui:focus-search');
    };
    this.shortcuts.register(`${metaKey}+k`, searchHandler, {
      description: 'Focar Busca',
    });
    this.shortcuts.register('/', searchHandler, {
      context: 'no-input', // Só funciona se não estiver digitando
      description: 'Focar Busca',
    });

    // Cancelar / Fechar (Esc)
    this.shortcuts.register(
      'escape',
      () => {
        eventBus.emit('modal:close');
        eventBus.emit('editor:cancel');
        document.activeElement.blur();
      },
      { description: 'Fechar Modais' }
    );

    //"Zen Mode" (Modo Foco)
    this.shortcuts.register(
      '\\',
      () => {
        const nav = document.querySelector('.app-navbar');
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('hidden');
        nav.classList.toggle('hidden');

        // Feedback visual (Toast rápido)
        const isHidden = sidebar.classList.contains('hidden');
        toast.show(
          isHidden ? 'Modo Zen: Ativado' : 'Modo Zen: Desativado',
          'info',
          1500
        );
      },
      { description: 'Alternar Modo Foco' }
    );

    // --- 3. CONTEXTO DE ITEM (Só funciona se não estiver digitando) ---

    // Editar (Ctrl+E)
    this.shortcuts.register(
      `${metaKey}+e`,
      (e) => {
        e.preventDefault();
        eventBus.emit('ui:trigger-edit');
      },
      { context: 'no-input', description: 'Editar Prompt' }
    );

    // Navegação (Setas)
    this.shortcuts.register(
      'arrowdown',
      (e) => {
        e.preventDefault();
        eventBus.emit('ui:navigate-list', { direction: 'next' });
      },
      { context: 'no-input', description: 'Navegar para baixo' }
    );

    this.shortcuts.register(
      'arrowup',
      (e) => {
        e.preventDefault();
        eventBus.emit('ui:navigate-list', { direction: 'prev' });
      },
      { context: 'no-input', description: 'Navegar para cima' }
    );

    // Deletar (Delete)
    this.shortcuts.register(
      'delete',
      () => {
        eventBus.emit('ui:trigger-delete');
      },
      { context: 'no-input', description: 'Deletar Prompt' }
    );

    // --- 4. EASTER EGGS 🐰🥚 ---

    // Konami Code -> Ativa Modo Matrix
    this.shortcuts.registerKonamiCode(() => {
      this.toggleMatrixMode();
    });

    this.shortcuts.registerFibonacciSequence(() => {
      const prompt = {
        name: 'PROMPT UNIVERSAL ONESHOT (GENÉRICO · PODEROSO · CROSS-LLM)',
        content: `Você é {{papel: especialista ou função desejada}}.

OBJETIVO PRINCIPAL:
{{tarefa: o que deve ser feito em uma frase}}

CONTEXTO ESSENCIAL:
{{contexto: informações mínimas relevantes ou "nenhum"}}

RESTRIÇÕES E CRITÉRIOS:
{{restrições: limites, público-alvo, tom, formato ou "nenhuma"}}

FORMATO DA RESPOSTA:
{{formato: texto, lista, passos, Markdown, JSON, tabela, etc.}}

---

PROTOCOLO DE EXECUÇÃO (Progressão Fibonacci):

[1] COMPREENSÃO  
Entenda completamente o objetivo e o contexto.

[1] DEFINIÇÃO  
Identifique requisitos, restrições e critérios de sucesso.

[2] DECOMPOSIÇÃO  
Quebre o problema em partes lógicas e gerenciáveis.

[3] EXPLORAÇÃO  
Avalie múltiplas abordagens, soluções ou perspectivas possíveis.

[5] SÍNTESE E VALIDAÇÃO  
Integre a melhor solução, valide precisão, coerência e alinhamento com o pedido, e refine para máxima clareza e utilidade.

---

CONTROLES DE QUALIDADE:
- Não invente informações.
- Declare incertezas explicitamente.
- Evite vieses desnecessários.
- Priorize clareza, utilidade e objetividade.

AUTO-VERIFICAÇÃO FINAL:
✔ Objetivo atendido  
✔ Restrições respeitadas  
✔ Formato correto  
✔ Resposta adequada ao público-alvo  

Produza **apenas a resposta final**, sem mencionar o processo interno.
`,
        description:
          'Um PROMPT ONESHOT UNIVERSAL, projetado para qualquer LLM, com arquitetura modular implícita, variáveis mínimas, alto poder de generalização e pronto para qualquer tipo de tarefa (análise, criação, decisão, código, estratégia, texto, etc.).',
        isFavorite: true,
        tags: ['genérico', 'oneshot', 'cross llm', 'Fibonacci Egg'],
      };

      const content = `
  <div class="flex flex-col items-center text-center space-y-6 animate-fade-in p-2">
    
    <!-- Ícone Animado (Cor Dourada/Amber para representar Ouro/Raro) -->
    <div class="relative">
        <div class="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
        <div class="relative p-4 bg-bg-app rounded-full border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <!-- Ícone espiral customizado ou sparkles -->
            <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
        </div>
    </div>

    <!-- Título e Texto -->
    <div class="space-y-2">
        <h3 class="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-500 to-amber-200 tracking-tight">
            Sequência Desbloqueada
        </h3>
        <p class="text-sm text-text-muted">
            Você descobriu o segredo da natureza. <br>
            <span class="font-mono text-amber-500/80 text-xs tracking-widest mt-1 block">1 · 1 · 2 · 3 · 5 · 8 · 13 · 21...</span>
        </p>
    </div>

    <!-- O Prêmio: Card do Prompt -->
    <div class="w-full bg-bg-app/50 border border-amber-500/20 rounded-xl overflow-hidden text-left relative group">
        <!-- Label "Special Item" -->
        <div class="absolute top-0 right-0 bg-amber-500/10 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg border-b border-l border-amber-500/20">
            SPECIAL ITEM
        </div>

        <div class="p-4 pt-6">
            <p class="text-xs text-text-muted mb-2 font-medium">Sua recompensa (Prompt "Golden Ratio"):</p>
            
            <!-- Área de Código -->
            <div class="bg-black/30 rounded-lg p-3 border border-border-subtle font-mono text-xs text-amber-100/90 wrap-break-word leading-relaxed select-all">
                ${prompt.content.replace(/\n/g, '<br>')}
            </div>
            <small class="text-amber-300/80 italic text-[10px] mt-2 block">Prompt adicionado a sua biblioteca.</small>
        </div>

    <p class="text-[10px] text-text-muted opacity-50 italic">
        "A matemática é o alfabeto com o qual Deus escreveu o universo." — Galileu
    </p>
  </div>
`;

      toast.show('You found the Fibonacci Easter Egg! 🐇', 'success', 5000);
      setTimeout(() => {
        eventBus.emit('prompt:save', {
          id: null,
          data: prompt,
          saveVersion: false,
        });
      }, 500);
      eventBus.emit('modal:open', {
        title: 'Fibonacci Easter Egg',
        content: content,
      });
    });

    // "GOD" Mode -> Libera log de debug (exemplo)
    this.shortcuts.registerSequence(
      ['g', 'o', 'd'],
      () => {
        toast.show('👑 God Mode: Console Logging Enabled', 'info');
        console.log('Current State:', this.repository._getData());
      },
      { context: 'no-input', description: 'Ativar God Mode' }
    );

    this.shortcuts.registerSequence(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '1', '0'],
      (event, info) => {
        console.log('info :', info);
        console.log('event :', event);

        toast.show('Parabéns voce sabe contar!', 'info', 5000);
      },
      { context: 'no-input', description: 'Sabe contar' }
    );

    this.shortcuts.registerLongPress(
      'm',
      () => {
        toast.show('EU JA SOU MUDO!!!', 'error', 5000);
      },
      { context: 'no-input', description: 'Easter Egg: Long Press Mudo' }
    );

    this.shortcuts.registerSequence(
      ['m', 'e', 'm', 'e'],
      () => {
        this.togglememeTheme();
      },
      { context: 'no-input', description: 'Easter Egg: Tema Meme' }
    );

    this.shortcuts.registerSequence(
      ['c', 'o', 'd', 'e', 'p', 'r', 'o'],
      () => {
        this.togglCodeProMode();
      },
      { context: 'no-input', description: 'Easter Egg: CodePro Mode' }
    );
  }

  /**
   * Easter Egg: The Matrix / Terminal Mode
   * "Wake up, Neo..."
   */
  toggleMatrixMode() {
    const ID = 'matrix-theme-style';
    const existing = document.getElementById(ID);

    // Desativar
    if (existing) {
      existing.remove();
      document.body.classList.remove('matrix-active');
      toast.show('Back to reality.', 'info');
      return;
    }

    // Ativar
    toast.show('🐇 Follow the white rabbit...', 'success', 5000);
    document.body.classList.add('matrix-active');

    const style = document.createElement('style');
    style.id = ID;
    style.innerHTML = `
        /* === 1. Sobrescrita Radical de Variáveis (Deep Nebula -> Matrix) === */
        :root {
            --matrix-primary: #00ff41;
            --matrix-dark: #008f11;
            --matrix-bg: #0d0208;
            
            /* Mapeando para o sistema existente */
            --bg-app: var(--matrix-bg) !important;
            --bg-surface: #000000 !important;
            --bg-surface-hover: #001a00 !important;
            
            --text-main: var(--matrix-primary) !important;
            --text-muted: var(--matrix-dark) !important;
            
            --border-subtle: var(--matrix-dark) !important;
            
            --accent: var(--matrix-primary) !important;
            --accent-hover: #fff !important;
            --accent-text: #000 !important;
        }

        /* === 2. Tipografia e Glow (Efeito Fósforo) === */
        * {
            /* VT323 é a fonte pixelada perfeita para esse efeito */
            font-family: 'VT323', monospace !important;
            
            text-shadow: 0 0 2px var(--matrix-dark), 0 0 5px var(--matrix-primary) !important;
            border-radius: 0 !important;
        }

        /* === 3. Componentes Específicos === */
        /* Inputs parecendo terminais */
        input, textarea, .input-surface {
            background-color: #000 !important;
            border: 1px solid var(--matrix-dark) !important;
            color: var(--matrix-primary) !important;
            box-shadow: inset 0 0 10px rgba(0, 255, 65, 0.1) !important;
        }
        
        /* Ajuste fino para inputs não ficarem gigantes */
        input, textarea, button {
            font-size: 1.2em !important; 
            letter-spacing: 1px;
        }
        
        /* Botões Invertidos no Hover */
        button:hover, .btn:hover {
            background-color: var(--matrix-primary) !important;
            color: #000 !important;
            text-shadow: none !important;
            box-shadow: 0 0 15px var(--matrix-primary) !important;
        }

        /* Scrollbar Hack */
        ::-webkit-scrollbar-thumb {
            background: var(--matrix-dark) !important;
            border: 1px solid var(--matrix-primary) !important;
        }

        /* === 4. FX: CRT Scanline & Flicker (A Mágica) === */
        body::before {
            content: " ";
            display: block;
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            z-index: 99998;
            background-size: 100% 2px, 3px 100%;
            pointer-events: none;
        }

        body::after {
            content: " ";
            display: block;
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: rgba(18, 16, 16, 0.1);
            opacity: 0;
            z-index: 99999;
            pointer-events: none;
            animation: flicker 0.15s infinite, scanline 6s linear infinite;
        }

        @keyframes flicker {
            0% { opacity: 0.02; }
            50% { opacity: 0.05; }
            100% { opacity: 0.02; }
        }

        @keyframes scanline {
            0% { transform: translateY(-100vh); background: rgba(0, 255, 65, 0.1); }
            50% { background: rgba(0, 255, 65, 0.05); }
            100% { transform: translateY(100vh); background: rgba(0, 255, 65, 0.1); }
        }

        /* === 5. Seleção de Texto === */
        ::selection {
            background: var(--matrix-primary) !important;
            color: #000 !important;
            text-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
  }

  togglememeTheme() {
    const ID = 'meme-theme-style';
    const existing = document.getElementById(ID);

    // Desativar
    if (existing) {
      existing.remove();
      document.body.classList.remove('meme-active');
      toast.show('Acabou a diversão.', 'info');
      return;
    }

    // Ativar
    toast.show('Divirta-se quem puder!', 'success', 5000);
    document.body.classList.add('meme-active');
    const style = document.createElement('style');
    style.id = ID;
    style.innerHTML = `
      body { /* Aplica a fonte aleatória */
        font-family: ${[
          '"Comic Sans MS"',
          '"Chalkboard"',
          '"Brush Script MT"',
          'cursive',
          'sans-serif',
        ]
          .sort(() => 0.5 - Math.random())
          .join(', ')} !important;
      }

      /* Sobrescreve o tema Deep Nebula */
      :root {
          --meme-bg: ${
            ['#f0f8ff', '#ffffe0', '#f0fff0', '#fff0f5', '#ffe4e1', '#fffafa'][
              Math.floor(Math.random() * 6)
            ]
          }; /* Cores pastéis aleatórias */
          --meme-bg-surface: ${
            ['#f8f8ff', '#fffff0', '#f5fffa', '#fff0f5', '#fffafa', '#fffff0'][
              Math.floor(Math.random() * 6)
            ]
          };
          --meme-text-main: ${
            ['#00008b', '#8b0000', '#006400', '#800080', '#4b0082'][
              Math.floor(Math.random() * 5)
            ]
          }; /* Cores de texto berrantes */
          --meme-text-muted: ${
            ['#556b2f', '#a0522d', '#8b4513', '#6a5acd'][
              Math.floor(Math.random() * 4)
            ]
          };
          --meme-accent: ${
            ['#FF1493', '#FFD700', '#00CED1', '#DA70D6', '#32CD32'][
              Math.floor(Math.random() * 5)
            ]
          }; /* Cores de destaque mal combinadas */
          --meme-border-subtle: var(--meme-accent);
          --meme-input-bg: #fff; /* Inputs brancos para contrate berrante */
      }

      /* Aplica em todo o sistema */
      .md-container,
      body, #sidebar, #viewer, #editor-overlay, #modal-container, #custom-confirm-modal, #toast-container, #sidebar-footer,
      .app-navbar, .input-surface, .btn, .btn-primary, .btn-secondary, .btn-icon,
      .prompt-content, .md-container pre {
          background-color: var(--meme-bg); /* Fundo principal */
      }
      
      /* Container do Modal */
      #custom-confirm-modal .bg-bg-surface, 
      #custom-confirm-modal .bg-bg-app\/50,
      #custom-confirm-modal #confirm-panel,
      #custom-confirm-modal .bg-bg-surface\/95,
      #custom-confirm-modal .bg-bg-app\/50,
      #custom-confirm-modal #confirm-backdrop {
          background-color: var(--meme-bg-surface) !important;
      }
      
      /* Texto Principal */
      h1, h2, h3, h4, h5, h6, p, span, div, a, button, input, textarea, label, li, body, 
      .text-text-main, .app-logo, .text-text-muted, .prompt-content, .md-container p, .md-container code, .md-container blockquote, .md-container li::marker {
          color: var(--meme-text-main) !important;
      }
      
      /* Texto Muted */
      .text-text-muted, .md-container .md-blockquote {
          color: var(--meme-text-muted) !important;
      }
      
      /* Bordas */
      .border, #sidebar, main, .app-navbar, .input-surface, .btn, .btn-primary, .btn-secondary, .btn-icon, .md-container, .md-container pre, .md-container blockquote, .md-container img, .md-container hr {
          border-color: var(--meme-border-subtle) !important;
      }
      
      /* Botão Primário / Accent */
      .btn-primary, .btn-primary:hover, .btn-primary:active, #btn-save, #btn-new-prompt {
          background-color: var(--meme-accent) !important;
          color: #000 !important; /* Texto preto em cima do accent berrante */
          text-shadow: none !important;
      }
      
      /* Links */
      .md-container a {
          color: var(--meme-accent) !important;
          border-bottom-color: var(--meme-accent) !important;
      }

      /* Cursor e Scrollbar */
      * {
          cursor: crosshair !important; /* Cursor aleatório */
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-[\${var(--meme-accent)}]"><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h11"></path><path d="M9 13h6m-6 0l-3 3m3-3 3 3"></path></svg>') 12 12, auto; /* Cursor customizado */
      }
      ::-webkit-scrollbar-thumb {
          background: var(--meme-accent) !important;
          border: 1px solid var(--meme-border-subtle) !important;
      }

      /* Efeito Scanline e Flicker */
      body::before, body::after {
          content: "";
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          pointer-events: none; z-index: 99999;
      }
      body::before { /* Scanlines */
          background: linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.3) 50%), linear-gradient(90deg, rgba(255,255,0,0.1), rgba(255,0,255,0.1), rgba(0,255,255,0.1));
          background-size: 100% 2px, 3px 100%;
          animation: scanline-meme 7s linear infinite;
      }
      body::after { /* Flicker */
          background: rgba(255,255,255, 0.03);
          animation: flicker-meme 0.1s infinite alternate;
      }

      @keyframes scanline-meme {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
      }
      @keyframes flicker-meme {
          0% { opacity: 0.02; }
          50% { opacity: 0.08; }
          100% { opacity: 0.02; }
      }
      
      /* Anula o blur dos modais, pois no caos tudo se mistura */
      .backdrop-blur-sm { backdrop-filter: none !important; }
    `;
    document.head.appendChild(style);
  }

  togglCodeProMode() {
    const ID = 'codepro-theme-style';
    const existing = document.getElementById(ID);

    // Desativar
    if (existing) {
      existing.remove();
      document.body.classList.remove('codepro-active');
      toast.show('CodePro Mode desativado.', 'info');
      return;
    }

    // Ativar
    toast.show('CodePro Mode ativado!', 'success', 5000);
    document.body.classList.add('codepro-active');
    const style = document.createElement('style');
    style.id = ID;
    style.innerHTML = `
      /* Sobrescrive o tema Deep Nebula */
      :root {
          /* Cores baseadas no tema "Dark+ (default dark)" do VS Code */
          --vscode-bg-app: #1e1e1e;         /* Fundo Geral */
          --vscode-bg-surface: #252526;     /* Superficies (Sidebar, Header) */
          --vscode-bg-surface-hover: #2a2a2c; /* Hover de superficies */
          --vscode-border-subtle: #333333;  /* Bordas finas */
          
          --vscode-text-main: #d4d4d4;      /* Texto principal */
          --vscode-text-muted: #8a8a8a;     /* Texto secundário */
          
          /* Accent: Usaremos o nosso Violeta, mas mais apagado */
          --vscode-accent: #c586c0;         /* Violeta do VS Code */
          --vscode-accent-hover: #d480d4;
          --vscode-accent-text: #fff;
          
          /* Cores para Inputs/Botões */
          --vscode-input-bg: #2d2d2d;
          --vscode-button-bg: #37373d;
          --vscode-button-hover-bg: #3f3f41;
          --vscode-button-primary-bg: var(--vscode-accent);
          
          /* Fontes */
          --font-sans: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; /* Sans-serif comum e legível */
          --font-mono: 'Consolas', 'Monaco', 'Courier New', monospace;   /* Fonte mono clássica */
      }

      /* Aplica em componentes chave */
      body, .md-container, #sidebar, main, .app-navbar, #custom-confirm-modal #confirm-panel, #custom-confirm-modal .bg-bg-surface\/95, .btn-primary, #btn-save {
          background-color: var(--vscode-bg-app) !important;
      }
      
      /* Aplica em elementos da sidebar e header */
      #sidebar, .app-navbar, .btn-secondary, #custom-confirm-modal .bg-bg-surface, #custom-confirm-modal .bg-bg-app\/50 {
          background-color: var(--vscode-bg-surface) !important;
      }
      
      /* Bordas */
      .border, .input-surface, .btn, .btn-secondary, #sidebar, main, .app-navbar, #custom-confirm-modal, #custom-confirm-modal .border-border-subtle, #custom-confirm-modal .bg-bg-app\/50 {
          border-color: var(--vscode-border-subtle) !important;
      }
      
      /* Texts */
      h1, h2, h3, h4, p, span, button, input, textarea, label, li, 
      .text-text-main, .text-text-muted, .app-logo, .prompt-content, .md-container p, .md-container code, .md-container blockquote,
      .btn-primary, #btn-save, .btn-icon {
          color: var(--vscode-text-main) !important;
      }
      .text-text-muted, .md-container .md-blockquote {
          color: var(--vscode-text-muted) !important;
      }

      /* Botões e Inputs */
      .input-surface, input, textarea, button, .btn, .btn-secondary {
          background-color: var(--vscode-input-bg) !important;
          border-color: var(--vscode-border-subtle) !important;
          color: var(--vscode-text-main) !important;
      }
      
      .btn-primary, #btn-save, #btn-new-prompt {
          background-color: var(--vscode-button-primary-bg) !important;
          color: var(--vscode-accent-text) !important;
          border: none !important; /* Botão primário do VSCode não tem borda */
      }
      .btn-primary:hover {
          background-color: var(--vscode-accent-hover) !important;
      }

      /* Links */
      .md-container a {
          color: var(--vscode-accent) !important;
      }
      .md-container a:hover {
          color: var(--vscode-accent-hover) !important;
          border-bottom-color: var(--vscode-accent-hover) !important;
      }
      
      /* Hover de botões em geral */
      button:hover, .btn:hover, .btn-secondary:hover, .btn-icon:hover {
          background-color: var(--vscode-button-hover-bg) !important;
      }

      /* Scrollbar */
      ::-webkit-scrollbar-thumb {
          background: var(--vscode-border-subtle) !important;
      }
      
      /* Remover animações de foco do Deep Nebula para ter a aparência nativa do VS Code */
      .input-surface:focus, .input-surface:focus-within {
          border-color: var(--vscode-border-subtle) !important;
          ring: none !important;
          box-shadow: none !important;
      }
      
      /* Para o Editor: Mudar fundo e fonte explicitamente */
      #edit-content, #preview-area {
          background-color: var(--vscode-bg-app) !important;
          font-family: var(--font-mono) !important;
          color: var(--vscode-text-main) !important;
          font-size: 15px; /* Tamanho padrão do editor */
      }
      #preview-area {
          padding: 1rem; /* Padding para o preview */
      }
      .prompt-content {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.7;
      }
      
      /* Remover glows e animações que não combinam */
      .shadow-lg, .shadow-md, .group-hover\:shadow-md, .shadow-accent\/20, .animate-fade-in, .animate-scale-in, .animate-pulse, .group-hover\:rotate-90, .group-hover\:opacity-100, .group-hover\:border-accent\/50, .group-hover\:bg-accent\/10, .group-hover\:text-accent, .group-hover\:text-red-500, .group-hover\:bg-red-500\/10, .group-hover\:scale-110, .group-hover\:border-accent\/30, .group-hover\:bg-bg-app\/50, .group-hover\:border-gray-600, .animate-fade-in-up, .group-hover\:text-white, .group-hover\:bg-gray-700, .group-hover\:bg-yellow-600, .group-hover\:text-red-200, .group-hover\:text-white, .group-hover\:text-emerald-500, .group-hover\:bg-emerald-500\/10, .group-hover\:text-amber-400, .group-hover\:underline, .group-hover\:text-text-main, .group-hover\:border-accent\/30, .group-hover\:shadow-sm, .group-hover\:opacity-60, .group-hover\:bg-bg-app\/50, .group-hover\:border-accent\/30, .group-hover\:transition-colors, .animate-ping {
          box-shadow: none !important;
          animation: none !important;
          filter: none !important;
          opacity: inherit !important; /* Reseta opacidade */
      }
      
      /* Remove o blur dos modais */
      .backdrop-blur-sm { backdrop-filter: none !important; }
    `;
    document.head.appendChild(style);
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

    eventBus.on('prompt:duplicate', async ({ id }) => {
      try {
        await this.repository.duplicatePrompt(id);
        toast.show('Prompt duplicado com sucesso', 'success');
        // O evento prompt:created já cuida de atualizar a lista
      } catch (err) {
        toast.show('Erro ao duplicar: ' + err.message, 'error');
      }
    });

    eventBus.on('ui:request-shortcuts', (callback) => {
      // O método listShortcuts já retorna o formato correto
      const list = this.shortcuts.listShortcuts();
      callback(list);
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

  setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const viewer = document.getElementById('viewer'); // Opcional, para gestos

    const toggleMenu = (forceClose = false) => {
      const isClosed = sidebar.classList.contains('-translate-x-full');

      if (isClosed && !forceClose) {
        // ABRIR
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
        // Pequeno delay para permitir transição de opacidade do CSS
        setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
      } else {
        // FECHAR
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300); // Espera a animação
      }
    };

    // 1. Botão Hambúrguer
    if (btn) btn.onclick = () => toggleMenu();

    // 2. Clicar no fundo escuro fecha o menu
    if (backdrop) backdrop.onclick = () => toggleMenu(true);

    // 3. (CRUCIAL) Ao selecionar um item na lista da sidebar, fecha o menu
    // Vamos usar 'event delegation' no sidebar para pegar cliques em itens
    sidebar.addEventListener('click', (e) => {
      // Se clicou em algo que parece um item de prompt (ajuste o seletor conforme seu HTML gerado)
      if (e.target.closest('.group') || e.target.closest('div[data-id]')) {
        // Só fecha se estivermos no mobile (checando se o botão mobile está visível)
        if (window.getComputedStyle(btn).display !== 'none') {
          toggleMenu(true);
        }
      }
    });
  }
}

// Inicialização
const app = new App();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
