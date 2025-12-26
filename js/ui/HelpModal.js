import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';
import { isMac } from '../utils/platform.js';
import {
  TUTORIAL_SECTIONS,
  FAQ_ITEMS,
  PRO_TIPS,
} from '../data/TutorialContent.js';

export default class HelpModal {
  constructor() {
    this.shortcutsList = [];

    // Escuta pedido de abertura
    eventBus.on('help:open', () => {
      // Pede a lista atualizada de atalhos ao App
      eventBus.emit('ui:request-shortcuts', (list) => {
        this.shortcutsList = list;
        this.open();
      });
    });
  }

  open() {
    // Formata a lista de atalhos em HTML
    const shortcutsHtml =
      this.shortcutsList.length > 0
        ? this._renderShortcutsTable(this.shortcutsList)
        : '<div class="col-span-2 text-center py-4 text-xs text-text-muted italic opacity-50">Nenhum atalho registrado.</div>';

    const content = `
      <div class="space-y-10 text-text-muted animate-fade-in">
        
        <!-- Header / Intro -->
        <div class="text-center border-b border-border-subtle pb-8">
            <div class="inline-flex p-4 rounded-full bg-accent/5 mb-4 shadow-[0_0_15px_-5px_var(--accent)]">
                ${getIcon('book-open', 'w-8 h-8 text-accent')}
            </div>
            <h3 class="text-2xl font-bold text-text-main mb-2 tracking-tight">
                Bem-vindo ao <span class="text-accent">Prompt Manager</span>
            </h3>
            <p class="text-sm leading-relaxed max-w-md mx-auto">
                Sua central de engenharia de prompt. Organize, versiona e otimize seu fluxo de trabalho com IA.
            </p>
        </div>

        <!-- Tabela de Atalhos de Teclado -->
    <div class="rounded-xl border border-border-subtle bg-bg-app/50 overflow-hidden">
        <!-- Header da Tabela -->
        <div class="px-4 py-3 border-b border-border-subtle bg-bg-surface/80 flex items-center gap-2">
            ${getIcon('keyboard', 'w-4 h-4 text-accent')}
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Atalhos de Teclado</h4>
        </div>
        
        <!-- Grid de Atalhos -->
        <div class="p-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            ${shortcutsHtml}
        </div>
    </div>

        <!-- Seção: Funcionalidades (Grid) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${TUTORIAL_SECTIONS.map((section) =>
              this._renderSection(section)
            ).join('')}
        </div>

        <!-- Seção: Dicas Pro (Banner Estilizado) -->
        <div class="relative overflow-hidden rounded-xl border border-accent/20 bg-linear-to-r from-accent/10 to-transparent p-5">
            <div class="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                ${getIcon('lightbulb', 'w-24 h-24')}
            </div>
            
            <h4 class="flex items-center gap-2 font-bold text-accent mb-4 uppercase text-[10px] tracking-widest">
                ${getIcon('sparkles', 'w-4 h-4')} Dicas de Produtividade
            </h4>
            <ul class="space-y-3 relative z-10">
                ${PRO_TIPS.map(
                  (tip) => `
                    <li class="flex items-start gap-3 text-sm text-text-main">
                        <span class="text-accent mt-0.5 bg-accent/10 rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px]">
                            ${getIcon('check-circle', 'w-2 h-2')}
                        </span>
                        <span class="opacity-90">${tip}</span>
                    </li>
                `
                ).join('')}
            </ul>
        </div>

        <!-- Seção: Perguntas Frequentes -->
        <div>
            <h4 class="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-4 flex items-center gap-2">
                ${getIcon('help', 'w-4 h-4')} Perguntas Frequentes
            </h4>
            <div class="grid gap-3">
                ${FAQ_ITEMS.map(
                  (item) => `
                    <div class="bg-bg-app rounded-lg p-4 border border-border-subtle hover:border-accent/30 transition-colors">
                        <p class="font-bold text-text-main text-sm mb-2 flex items-start gap-2">
                            <span class="text-accent">Q:</span> ${item.q}
                        </p>
                        <p class="text-sm text-text-muted leading-relaxed pl-5 border-l-2 border-border-subtle">
                            ${item.a}
                        </p>
                    </div>
                `
                ).join('')}
            </div>
        </div>
      </div>
    `;

    eventBus.emit('modal:open', {
      title: 'Guia & Ajuda',
      content: content,
    });
  }

  _renderShortcutsTable(rawShortcuts) {
    // 1. FILTRAGEM INTELIGENTE DE OS
    const filteredShortcuts = rawShortcuts.filter((s) => {
      // Se não tiver tecla (é só descrição), mantém
      if (!s.key) return true;

      const k = s.key.toLowerCase();

      // Se estou no Mac, não quero ver atalhos com 'ctrl' se existir uma alternativa 'meta'
      // (Assumindo que sua lista tem duplicatas para o mesmo comando)
      if (isMac && k.includes('ctrl+')) return false;

      // Se estou no Windows/Linux, não quero ver atalhos com 'meta'
      if (!isMac && k.includes('meta+')) return false;

      return true;
    });

    // 2. AGRUPAMENTO (Lógica anterior simplificada)
    const grouped = {};

    filteredShortcuts.forEach((s) => {
      if (!s.description) return;

      // Usa a sequência ou a tecla como identificador único
      const keyDef = s.type === 'sequence' ? s.sequence : s.key;

      // Cria ou atualiza o grupo
      if (!grouped[s.description]) {
        grouped[s.description] = {
          desc: s.description,
          keys: [keyDef], // Inicia array
          isSequence: s.type === 'sequence',
        };
      } else if (!grouped[s.description].keys.includes(keyDef)) {
        // Adiciona tecla alternativa apenas se não for duplicata exata
        grouped[s.description].keys.push(keyDef);
      }
    });

    // 3. RENDERIZAÇÃO
    return Object.values(grouped)
      .map((item) => {
        const keysHtml = item.keys
          .map((keyString) => {
            if (item.isSequence) return this._formatSequence(keyString);

            // Renderiza tecla a tecla
            return keyString
              .split('+')
              .map((k) => this._renderKbd(k))
              .join(
                '<span class="text-text-muted opacity-50 mx-0.5 text-[10px]">+</span>'
              );
          })
          .join(
            '<span class="text-text-muted opacity-50 mx-1.5 text-xs">ou</span>'
          );

        return `
            <div class="flex justify-between items-center py-2 px-2 border-b border-border-subtle/50 last:border-0 hover:bg-bg-surface rounded transition-colors group">
                <span class="text-xs text-text-muted group-hover:text-text-main transition-colors">${item.desc}</span>
                <div class="flex items-center gap-1 pl-4 text-right">${keysHtml}</div>
            </div>
        `;
      })
      .join('');
  }

  // Helper para renderizar uma tecla estilo 3D
  _renderKbd(key) {
    // Mapa de símbolos para ficar bonito
    const symbolMap = {
      ctrl: 'Ctrl',
      meta: '⌘',
      shift: '⇧',
      alt: 'Alt',
      enter: '↵',
      escape: 'Esc',
      delete: 'Del',
      arrowup: '↑',
      arrowdown: '↓',
      arrowleft: '←',
      arrowright: '→',
      '/': '/',
    };

    const label = symbolMap[key.toLowerCase()] || key.toUpperCase();

    return `<kbd class="min-w-5 h-5 inline-flex items-center justify-center px-1.5 bg-bg-surface border border-border-subtle border-b-2 rounded-sm text-[10px] font-mono font-medium text-text-main shadow-sm select-none whitespace-nowrap">${label}</kbd>`;
  }

  // Helper específico para sequências (setas e easter eggs)
  _formatSequence(sequenceStr) {
    // Remove as setas de texto " → " se existirem e divide
    const parts = sequenceStr
      .split(/ → | /)
      .filter((p) => p !== '→' && p !== '');

    // Se for muito longa (Konami), limita visualmente ou diminui a fonte
    const isLong = parts.length > 5;

    const html = parts
      .map((part) => this._renderKbd(part))
      .join('<span class="mx-0.5 opacity-30">›</span>');

    return `<div class="flex flex-wrap justify-end gap-y-1 ${
      isLong ? 'max-w-37.5' : ''
    }">${html}</div>`;
  }

  _renderSection(section) {
    return `
      <div class="flex flex-col group p-4 rounded-xl hover:bg-bg-app/50 transition-colors border border-transparent hover:border-border-subtle">
         <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-bg-app rounded-lg text-accent border border-border-subtle group-hover:border-accent/50 group-hover:scale-110 transition-all duration-300 shadow-sm">
                ${getIcon(section.icon, 'w-5 h-5')}
            </div>
            <h4 class="font-bold text-text-main text-base">${section.title}</h4>
         </div>
         
         <p class="text-text-muted text-xs leading-relaxed mb-4 min-h-10">
            ${section.content}
         </p>

         <!-- Image Placeholder (Wireframe Style) -->
         <div class="w-full h-28 bg-bg-app rounded-lg border-2 border-dashed border-border-subtle flex items-center justify-center relative overflow-hidden group-hover:border-accent/30 transition-colors">
            <div class="text-center opacity-40 group-hover:opacity-60 transition-opacity">
                ${getIcon('image', 'w-6 h-6 mx-auto mb-1 text-text-muted')}
                <span class="text-[9px] text-text-muted uppercase font-medium tracking-widest block px-4">
                  ${section.imagePlaceholder}
                </span>
            </div>
         </div>
      </div>
    `;
  }
}
