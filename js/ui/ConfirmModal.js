import { getIcon } from '../utils/Icons.js';

class ConfirmModal {
  constructor() {
    this.container = null;
    this.resolvePromise = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'custom-confirm-modal';
    // z-[110] garante que fique acima de Toasts e Modais normais (z-50/z-100)
    this.container.className = 'fixed inset-0 z-[110] hidden';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');

    this.container.innerHTML = `
      <!-- Backdrop: Escuro com Blur -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 opacity-0" id="confirm-backdrop"></div>
      
      <!-- Painel Centralizado -->
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="relative bg-bg-surface border border-border-subtle rounded-xl shadow-2xl max-w-md w-full p-6 transform scale-95 opacity-0 transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)" id="confirm-panel">
          
          <div class="flex items-start gap-5">
            <!-- Ícone Dinâmico (Círculo de Alerta) -->
            <div id="confirm-icon-wrapper" class="shrink-0 w-12 h-12 rounded-full flex items-center justify-center">
               <!-- Ícone injetado via JS -->
            </div>
            
            <div class="flex-1 pt-1">
              <h3 class="text-lg font-bold text-text-main mb-2 tracking-tight" id="confirm-title">Título</h3>
              <p class="text-sm text-text-muted leading-relaxed" id="confirm-message">Mensagem de confirmação.</p>
            </div>
          </div>

          <!-- Botões -->
          <div class="mt-8 flex justify-end gap-3">
            <button id="btn-confirm-cancel" class="btn btn-ghost px-4 text-text-muted hover:text-text-main">
              Cancelar
            </button>
            <button id="btn-confirm-ok" class="btn px-5 shadow-lg flex items-center gap-2">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.attachListeners();
  }

  attachListeners() {
    const cancelBtn = this.container.querySelector('#btn-confirm-cancel');
    const okBtn = this.container.querySelector('#btn-confirm-ok');
    const backdrop = this.container.querySelector('#confirm-backdrop');

    const handleClose = (result) => this.close(result);

    okBtn.onclick = () => handleClose(true);
    cancelBtn.onclick = () => handleClose(false);
    backdrop.onclick = () => handleClose(false);

    // Escape Key Handler Global
    this.keydownHandler = (e) => {
      if (e.key === 'Escape' && !this.container.classList.contains('hidden')) {
        e.stopPropagation();
        handleClose(false);
      }
    };
    document.addEventListener('keydown', this.keydownHandler, true);
  }

  /**
   * Abre o modal de confirmação
   * @param {string} title
   * @param {string} message
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  ask(title, message, { variant = 'danger', confirmText = 'Confirmar' } = {}) {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.renderContent(title, message, { variant, confirmText });
      this.show();
    });
  }

  renderContent(title, message, { variant, confirmText }) {
    const titleEl = this.container.querySelector('#confirm-title');
    const msgEl = this.container.querySelector('#confirm-message');
    const okBtn = this.container.querySelector('#btn-confirm-ok');
    const iconWrapper = this.container.querySelector('#confirm-icon-wrapper');

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmText;

    // Configuração Visual baseada na variante
    // Usamos cores semânticas (Emerald/Red/Amber) mas com estilo moderno (bg-opacity)
    const styles = {
      danger: {
        // Botão vermelho vibrante
        btn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
        // Ícone com fundo suave
        iconBg: 'bg-red-500/10 text-red-600 dark:text-red-500',
        iconName: 'alert-triangle',
      },
      warning: {
        btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
        iconName: 'alert-circle',
      },
      info: {
        btn: 'bg-accent hover:bg-accent-hover text-white shadow-accent/20',
        iconBg: 'bg-accent/10 text-accent',
        iconName: 'info-circle',
      },
    };

    // Fallback para danger se variant não existir
    const style = styles[variant] || styles.danger;

    // Aplica classes
    okBtn.className = `btn px-5 shadow-lg flex items-center gap-2 transition-all active:scale-95 ${style.btn}`;
    iconWrapper.className = `flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${style.iconBg}`;

    // Tenta pegar o ícone específico, senão usa um fallback seguro
    try {
      iconWrapper.innerHTML = getIcon(style.iconName, 'w-6 h-6');
    } catch (e) {
      // Fallback caso o ícone específico não exista no seu Icons.js
      iconWrapper.innerHTML = getIcon('info', 'w-6 h-6');
    }
  }

  show() {
    this.container.classList.remove('hidden');

    // Foca no botão cancelar para acessibilidade (evita deletar acidentalmente ao apertar Enter)
    const cancelBtn = this.container.querySelector('#btn-confirm-cancel');

    requestAnimationFrame(() => {
      this.container
        .querySelector('#confirm-backdrop')
        .classList.remove('opacity-0');
      const panel = this.container.querySelector('#confirm-panel');
      panel.classList.remove('scale-95', 'opacity-0');
      panel.classList.add('scale-100', 'opacity-100');

      cancelBtn.focus();
    });
  }

  close(result) {
    const backdrop = this.container.querySelector('#confirm-backdrop');
    const panel = this.container.querySelector('#confirm-panel');

    backdrop.classList.add('opacity-0');
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
      this.container.classList.add('hidden');
      if (this.resolvePromise) {
        this.resolvePromise(result);
        this.resolvePromise = null;
      }
    }, 200);
  }
}

export const confirmModal = new ConfirmModal();
