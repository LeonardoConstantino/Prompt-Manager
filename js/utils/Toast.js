import { getIcon } from '../utils/Icons.js';

export default class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Container fixo no canto inferior direito
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      // z-[100] garante que fique acima até dos modais
      this.container.className =
        'fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Exibe um toast moderno
   * @param {string} message - Texto
   * @param {'success'|'error'|'info'} type - Tipo
   * @param {number} duration - Tempo em ms
   */
  show(message, type = 'info', duration = 3000) {
    const el = document.createElement('div');

    // Configuração de Estilos por Tipo
    const styles = {
      success: {
        icon: getIcon('check-circle', 'w-5 h-5'),
        colors:
          'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        progress: 'bg-emerald-500',
      },
      error: {
        icon: getIcon('x-circle', 'w-5 h-5'),
        colors:
          'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
        progress: 'bg-red-500',
      },
      info: {
        icon: getIcon('info-circle', 'w-5 h-5'),
        colors:
          'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
        progress: 'bg-blue-500',
      },
    };

    const style = styles[type];

    // Layout: Glassmorphism + Borda Colorida Sutil
    // pointer-events-auto: Habilita clique no toast (o container é none para não bloquear a tela)
    el.className = `
      pointer-events-auto relative overflow-hidden
      flex items-center gap-3 p-4 pr-10
      min-w-[320px] max-w-sm
      bg-bg-surface/95 backdrop-blur-md
      border ${style.colors.split(' ').pop()} 
      rounded-lg shadow-2xl shadow-black/20
      transform transition-all duration-300 ease-out translate-y-4 opacity-0 scale-95
      cursor-pointer group
    `;

    el.innerHTML = `
      <!-- Ícone Colorido com Fundo Circular -->
      <div class="shrink-0 p-2 rounded-full ${style.colors
        .split(' ')
        .slice(0, 2)
        .join(' ')}">
        ${style.icon}
      </div>
      
      <!-- Mensagem -->
      <span class="font-medium text-sm text-text-main leading-snug select-none">
        ${message}
      </span>

      <!-- Botão Fechar (Aparece no hover) -->
      <button class="absolute top-2 right-2 text-text-muted hover:text-text-main opacity-0 group-hover:opacity-100 transition-opacity">
        ${getIcon('close', 'w-3 h-3')}
      </button>

      <!-- Barra de Progresso (Feedback de tempo) -->
      <div class="absolute bottom-0 left-0 h-0.5 ${
        style.progress
      } opacity-50 transition-all linear w-full" style="transition-duration: ${duration}ms;"></div>
    `;

    // Clique para fechar antecipadamente
    el.addEventListener('click', () => this.dismiss(el));

    this.container.appendChild(el);

    // Animação de Entrada
    requestAnimationFrame(() => {
      // Remove estados iniciais para animar para o estado final
      el.classList.remove('translate-y-4', 'opacity-0', 'scale-95');

      // Inicia a animação da barra de progresso (diminuindo a largura)
      const progressBar = el.querySelector('div:last-child');
      if (progressBar) progressBar.style.width = '0%';
    });

    // Timer para remover
    const timer = setTimeout(() => {
      this.dismiss(el);
    }, duration);

    // Guarda referência do timer para poder cancelar se clicar antes
    el._timer = timer;
  }

  // Helper para remover com animação
  dismiss(el) {
    if (el._timer) clearTimeout(el._timer);

    // Animação de Saída (Slide para direita + Fade)
    el.classList.add('opacity-0', 'translate-x-full');

    // Aguarda fim da transição CSS
    el.addEventListener(
      'transitionend',
      () => {
        if (el.parentElement) el.remove();
      },
      { once: true }
    );
  }
}

export const toast = new Toast();
