import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';

export default class Modal {
  constructor(containerId = 'modal-container') {
    this.container = document.getElementById(containerId);
    this.init();

    // Listeners globais
    eventBus.on('modal:open', (payload) => this.open(payload));
    eventBus.on('modal:close', () => this.close());
  }

  init() {
    // Adicionei 'z-[60]' para garantir que fique acima de tudo (editor, navbar, etc)
    this.container.className = 'fixed inset-0 z-[60] hidden overflow-y-auto';
    this.container.setAttribute('aria-modal', 'true');
    this.container.setAttribute('role', 'dialog');
  }

  open({ title, content, onClose }) {
    this.onCloseCallback = onClose;

    this.container.innerHTML = `
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          
          <!-- Backdrop: Escuro com Blur (Glassmorphism) -->
          <div class="fixed inset-0 transition-opacity cursor-pointer" aria-hidden="true">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" id="modal-backdrop"></div>
          </div>

          <!-- Espaçador para centralização vertical -->
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <!-- Modal Panel -->
          <!-- animate-scale-in: Sugestão de animação suave de entrada -->
          <div class="inline-block align-bottom bg-bg-surface border border-border-subtle rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative">
            
            <!-- Header -->
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-surface">
              <h3 class="text-lg font-bold text-text-main tracking-tight leading-6" id="modal-title">
                ${title || 'Prompt Manager'}
              </h3>
              
              <!-- Botão X: Hover vermelho sutil -->
              <button type="button" id="btn-modal-close-x" class="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors focus:outline-none">
                  ${getIcon('close', 'w-5 h-5')}
              </button>
            </div>

            <!-- Body -->
            <!-- Adicionei 'prose-sm' caso o conteúdo seja texto longo, para melhor formatação -->
            <div class="px-6 py-6 text-text-muted max-h-[60vh] overflow-y-auto custom-scrollbar leading-relaxed">
              ${content}
            </div>

            <!-- Footer -->
            <!-- bg-bg-app/50 cria uma diferenciação sutil do corpo do modal -->
            <div class="px-6 py-4 bg-bg-app/50 border-t border-border-subtle sm:flex sm:flex-row-reverse gap-3">
              <!-- Botão Fechar Padronizado -->
              <button type="button" id="btn-modal-close" class="btn btn-secondary w-full sm:w-auto justify-center shadow-sm">
                Fechar
              </button>
              
              <!-- O JS pode injetar botões de ação extra aqui se necessário -->
            </div>
          </div>
        </div>
      `;

    this.container.classList.remove('hidden');
    this.attachListeners();
  }

  close() {
    this.container.classList.add('hidden');
    this.container.innerHTML = ''; // Limpa memória
    if (this.onCloseCallback) this.onCloseCallback();
  }

  attachListeners() {
    const closeFn = () => this.close();

    // Fecha ao clicar no backdrop, no X ou no botão Fechar
    this.container.querySelector('#modal-backdrop').onclick = closeFn;
    this.container.querySelector('#btn-modal-close-x').onclick = closeFn;
    this.container.querySelector('#btn-modal-close').onclick = closeFn;
  }
}
