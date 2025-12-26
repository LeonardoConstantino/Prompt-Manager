import { getIcon } from '../utils/Icons.js';

export default class ContextMenu {
  constructor() {
    this.menu = null;
    this.activeTargetId = null; // Para saber qual item está sob o menu
    this.init();
  }

  init() {
    this.menu = document.createElement('div');
    this.menu.id = 'app-context-menu';

    // Estilo Ajustado para nosso Tema Dark
    this.menu.className = `
      fixed z-[200] hidden min-w-[180px] py-1.5
      bg-bg-surface/95 backdrop-blur-md
      border border-border-subtle rounded-lg
      shadow-xl shadow-black/20
      flex flex-col animate-scale-in origin-top-left
    `;
    document.body.appendChild(this.menu);

    // Fechar ao clicar fora, rolar ou pressionar ESC
    const hideMenu = () => this.hide();
    document.addEventListener('click', hideMenu);
    document.addEventListener('scroll', hideMenu, true); // true para capturar scroll em sub-elementos
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideMenu();
    });

    // Previne menu nativo do browser dentro do nosso menu customizado
    this.menu.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  show(x, y, actions = []) {
    this.menu.innerHTML = '';

    actions.forEach((action) => {
      if (action.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'h-px bg-border-subtle my-1.5 mx-2';
        this.menu.appendChild(sep);
        return;
      }

      const btn = document.createElement('button');
      btn.className = `
        w-full text-left px-3 py-2 text-xs font-medium text-text-main
        hover:bg-accent/10 hover:text-accent
        flex items-center gap-2 transition-colors
      `;

      // Ícone + Texto (Adicionei flex-1 no texto para alinhamento)
      btn.innerHTML = `
        <span class="text-text-muted group-hover:text-accent transition-colors">
            ${getIcon(action.icon, 'w-3.5 h-3.5 opacity-70')}
        </span>
        <span class="flex-1">${action.label}</span>
      `;

      // Estilo Destrutivo (Delete)
      if (action.danger) {
        btn.className = `
            w-full text-left px-3 py-2 text-xs font-medium text-red-500/80
            hover:bg-red-500/10 hover:text-red-500
            flex items-center gap-2 transition-colors
            group
        `;
        btn.innerHTML = `
            <span class="text-red-500 group-hover:text-white transition-colors">
                ${getIcon(action.icon, 'w-3.5 h-3.5 opacity-70')}
            </span>
            <span class="flex-1">${action.label}</span>
        `;
      }

      btn.onclick = (e) => {
        e.stopPropagation(); // Impede seleção do card abaixo
        this.hide();
        action.onClick();
      };

      this.menu.appendChild(btn);
    });

    // Posicionamento inteligente
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.classList.remove('hidden');

    // Ajuste de colisão com a borda direita/inferior
    const rect = this.menu.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    if (rect.right > winWidth) {
      this.menu.style.left = `${winWidth - rect.width - 10}px`;
      // Inverte origem da animação se inverter lado
      this.menu.classList.replace('origin-top-left', 'origin-top-right');
    } else {
      this.menu.classList.replace('origin-top-right', 'origin-top-left');
    }

    if (rect.bottom > winHeight) {
      this.menu.style.top = `${y - rect.height}px`;
      this.menu.classList.replace('origin-top-left', 'origin-bottom-left');
    }
  }

  hide() {
    if (!this.menu.classList.contains('hidden')) {
      this.menu.classList.add('hidden');
    }
  }
}
