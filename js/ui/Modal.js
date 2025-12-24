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
    // Garante que o container esteja oculto inicialmente
    this.container.className = 'fixed inset-0 z-50 hidden overflow-y-auto';
    this.container.setAttribute('aria-modal', 'true');
  }

  open({ title, content, onClose }) {
    this.onCloseCallback = onClose;

    this.container.innerHTML = `
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Backdrop -->
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-900 opacity-75" id="modal-backdrop"></div>
        </div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <!-- Modal Panel -->
        <div class="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-700">
          
          <!-- Header -->
          <div class="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-700 flex justify-between items-center">
            <h3 class="text-lg leading-6 font-medium text-white" id="modal-title">
              ${title || 'Prompt Manager'}
            </h3>
            <button type="button" id="btn-modal-close-x" class="text-gray-400 hover:text-white focus:outline-none">
                ${getIcon('close', 'w-5 h-5')}
            </button>
          </div>

          <!-- Body -->
          <div class="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 text-gray-300 max-h-[60vh] overflow-y-auto">
            ${content}
          </div>

          <!-- Footer -->
          <div class="bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="button" id="btn-modal-close" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Fechar
            </button>
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