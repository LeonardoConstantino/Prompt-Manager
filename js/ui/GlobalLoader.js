import eventBus from '../utils/eventBus.js';
// Se você tiver um ícone de logo, importe aqui. Caso contrário, usaremos CSS puro.

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
    // 1. Barra de Progresso (Top Bar Laser)
    this.progressContainer = document.createElement('div');
    // z-[9999] para ficar acima de quase tudo, mas abaixo do Overlay de Boot
    this.progressContainer.className =
      'fixed top-0 left-0 w-full h-0.5 z-[9999] pointer-events-none opacity-0 transition-opacity duration-300';

    this.progressContainer.innerHTML = `
      <!-- Barra com Glow do Accent -->
      <div id="global-progress-bar" class="h-full bg-accent shadow-[0_0_15px_2px_var(--accent)] w-0 transition-all duration-300 ease-out">
        <!-- Partícula brilhante na ponta da barra (opcional, dá um toque fluido) -->
        <div class="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-white/50 to-transparent transform translate-x-full"></div>
      </div>
    `;
    document.body.appendChild(this.progressContainer);
    this.progressBar = this.progressContainer.querySelector(
      '#global-progress-bar'
    );

    // 2. Overlay de Inicialização (Boot Experience)
    this.overlay = document.createElement('div');
    this.overlay.id = 'initial-loader';
    // z-[10000] deve ser o elemento mais alto da DOM
    this.overlay.className =
      'fixed inset-0 bg-bg-app z-[10000] flex flex-col gap-6 items-center justify-center transition-all duration-700 ease-in-out';

    // Spinner Customizado (CSS puro para não depender de SVGs externos)
    this.overlay.innerHTML = `
      <div class="relative flex items-center justify-center">
        <!-- Anel Externo Ping -->
        <div class="absolute animate-ping inline-flex h-16 w-16 rounded-full bg-accent/20 opacity-75"></div>
        
        <!-- Círculo Rotativo -->
        <div class="relative w-12 h-12 rounded-full border-2 border-border-subtle border-t-accent animate-spin"></div>
        
        <!-- Núcleo -->
        <div class="absolute w-3 h-3 bg-accent rounded-full shadow-[0_0_10px_var(--accent)]"></div>
      </div>
      
      <div class="flex flex-col items-center gap-1">
        <h2 class="text-text-main text-xs font-bold tracking-[0.2em] animate-pulse">CARREGANDO</h2>
        <span class="text-[10px] text-text-muted font-mono opacity-60">Inicializando sistema...</span>
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
      this.overlay.classList.remove(
        'hidden',
        'opacity-0',
        'pointer-events-none'
      );
    } else {
      // Barra de progresso topo
      this.progressContainer.classList.remove('opacity-0');

      // Simulação de progresso orgânico
      // Começa rápido e desacelera (Curva Logarítmica fake)
      requestAnimationFrame(() => {
        this.progressBar.style.width = '30%';
      });

      setTimeout(() => {
        if (this.activeRequests > 0) this.progressBar.style.width = '60%';
      }, 400);

      setTimeout(() => {
        if (this.activeRequests > 0) this.progressBar.style.width = '85%';
      }, 1200);
    }
  }

  end() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    // Só encerra se todas as requisições acabaram
    if (this.activeRequests === 0) {
      // 1. Finaliza Boot Overlay com Fade Out Suave
      if (!this.overlay.classList.contains('hidden')) {
        this.overlay.classList.add(
          'opacity-0',
          'scale-105',
          'pointer-events-none'
        ); // Scale dá efeito de "zoom in" ao abrir o app
        setTimeout(() => this.overlay.classList.add('hidden'), 700); // Espera a transição do CSS
      }

      // 2. Finaliza Barra de Progresso
      this.progressBar.style.width = '100%';

      setTimeout(() => {
        this.progressContainer.classList.add('opacity-0');
        // Reseta largura silenciosamente para próxima vez
        setTimeout(() => {
          this.progressBar.style.width = '0';
        }, 300);
      }, 300);
    }
  }
}
