import { getIcon } from '../utils/Icons.js';

export default class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Cria container para os toasts se não existir
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Exibe um toast
   * @param {string} message - Texto
   * @param {'success'|'error'|'info'} type - Tipo
   * @param {number} duration - Tempo em ms
   */
  show(message, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    
    // Cores baseadas no tipo
    const colors = {
      success: 'bg-green-600 border-green-500 text-white',
      error: 'bg-red-600 border-red-500 text-white',
      info: 'bg-blue-600 border-blue-500 text-white'
    };

    const icon = {
      success: getIcon('check-circle', 'w-5 h-5'),
      error: getIcon('x-circle', 'w-5 h-5'),
      info: getIcon('info-circle', 'w-5 h-5')
    };

    el.className = `${colors[type]} border px-4 py-3 rounded shadow-lg flex items-center gap-3 min-w-[300px] transform transition-all duration-300 translate-y-2 opacity-0`;
    el.innerHTML = `
      <div>${icon[type]}</div>
      <span class="font-medium text-sm">${message}</span>
    `;

    this.container.appendChild(el);

    // Animação de entrada
    requestAnimationFrame(() => {
      el.classList.remove('translate-y-2', 'opacity-0');
    });

    // Remove após duração
    setTimeout(() => {
      el.classList.add('translate-y-2', 'opacity-0');
      el.addEventListener('transitionend', () => el.remove());
    }, duration);
  }
}

// Singleton export
export const toast = new Toast();