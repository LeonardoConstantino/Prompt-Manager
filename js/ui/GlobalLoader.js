import eventBus from '../utils/eventBus.js';

export default class GlobalLoader {
  constructor() {
    this.overlay = null;
    this.progressBar = null;
    this.progressContainer = null;
    this.activeRequests = 0;

    this.init();

    // Listeners Globais
    eventBus.on('app:loading:start', ({ type } = { type: 'background' }) =>
      this.start(type)
    );
    eventBus.on('app:loading:end', () => this.end());
  }

  init() {
    // 1. Criar Barra de Progresso (Top Bar)
    this.progressContainer = document.createElement('div');
    this.progressContainer.className =
      'fixed top-0 left-0 w-full h-1 z-[9999] pointer-events-none opacity-0 transition-opacity duration-300';
    this.progressContainer.innerHTML = `
      <div id="global-progress-bar" class="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] w-0 transition-all duration-300 ease-out"></div>
    `;
    document.body.appendChild(this.progressContainer);
    this.progressBar = this.progressContainer.querySelector(
      '#global-progress-bar'
    );

    // 2. Criar Overlay de Inicialização (Boot)
    this.overlay = document.createElement('div');
    this.overlay.id = 'initial-loader';
    this.overlay.className =
      'fixed inset-0 bg-gray-900 z-[10000] flex items-center justify-center transition-opacity duration-500';
    this.overlay.innerHTML = `
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 class="text-gray-400 text-sm font-medium tracking-wider animate-pulse">CARREGANDO...</h2>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  /**
   * Inicia o loading
   * @param {'boot'|'background'} type
   */
  start(type = 'background') {
    this.activeRequests++;

    if (type === 'boot') {
      // Garante que o overlay esteja visível
      this.overlay.classList.remove('hidden', 'opacity-0');
    } else {
      // Barra de progresso topo
      this.progressContainer.classList.remove('opacity-0');
      // Truque visual: começa em 10% e vai andando devagar até 90%
      this.progressBar.style.width = '30%';
      setTimeout(() => {
        if (this.activeRequests > 0) this.progressBar.style.width = '70%';
      }, 300);
    }
  }

  end() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (this.activeRequests === 0) {
      // Finaliza Boot Overlay
      if (!this.overlay.classList.contains('hidden')) {
        this.overlay.classList.add('opacity-0');
        setTimeout(() => this.overlay.classList.add('hidden'), 500);
      }

      // Finaliza Barra de Progresso
      this.progressBar.style.width = '100%';
      setTimeout(() => {
        this.progressContainer.classList.add('opacity-0');
        // Reseta largura para próxima vez
        setTimeout(() => {
          this.progressBar.style.width = '0';
        }, 300);
      }, 200);
    }
  }
}
