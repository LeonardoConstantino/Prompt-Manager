import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';
import {
  TUTORIAL_SECTIONS,
  FAQ_ITEMS,
  PRO_TIPS,
} from '../data/TutorialContent.js';

export default class HelpModal {
  constructor() {
    eventBus.on('help:open', () => this.open());
  }

  open() {
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

  _renderSection(section) {
    return `
      <div class="flex flex-col group p-4 rounded-xl hover:bg-bg-app/50 transition-colors border border-transparent hover:border-border-subtle">
         <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-bg-app rounded-lg text-accent border border-border-subtle group-hover:border-accent/50 group-hover:scale-110 transition-all duration-300 shadow-sm">
                ${getIcon(section.icon, 'w-5 h-5')}
            </div>
            <h4 class="font-bold text-text-main text-base">${section.title}</h4>
         </div>
         
         <p class="text-text-muted text-xs leading-relaxed mb-4 min-h-[2.5rem]">
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