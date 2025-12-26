import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';

export default class SettingsModal {
  constructor() {
    this.currentConfig = {};

    // Escuta pedido de abertura
    eventBus.on('settings:open', () => this.open());
  }

  open() {
    // Solicita config atual (via evento ou acesso direto se injetado,
    // aqui vamos assumir que o App vai responder ou injetamos o repo.
    // Para simplificar, vamos pedir ao App os dados atuais)
    eventBus.emit('ui:request-config', (config) => {
      this.currentConfig = config;
      // Garante estrutura
      if (!this.currentConfig.clickToRun) {
        this.currentConfig.clickToRun = [
          { name: 'ChatGPT', url: 'https://chatgpt.com' },
          { name: 'Claude', url: 'https://claude.ai' },
        ];
      }
      this.render();
    });
  }

  render() {
    const prefs = this.currentConfig.preferences || {};
    const fontSize = prefs.editorFontSize || 14;
    const theme = prefs.theme || 'dark';

    // Gerador de Links (Click-to-Run)
    const linksHtml = this.currentConfig.clickToRun
      .map(
        (link, index) => `
        <div class="group flex gap-3 items-center mb-3 animate-fade-in-up" style="animation-delay: ${
          index * 50
        }ms" data-idx-container="${index}">
            <!-- Input Nome -->
            <div class="relative w-1/3">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    ${getIcon('tag', 'w-3 h-3')}
                </div>
                <input type="text" value="${link.name}" data-idx="${index}" 
                    class="link-name input-surface w-full pl-9 h-9 text-xs font-medium rounded-lg" 
                    placeholder="Nome">
            </div>

            <!-- Input URL -->
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    ${getIcon('external-link', 'w-3 h-3')}
                </div>
                <input type="text" value="${link.url}" data-idx="${index}" 
                    class="link-url input-surface w-full pl-9 h-9 text-xs font-mono text-text-muted rounded-lg" 
                    placeholder="https://...">
            </div>

            <!-- Botão Remover -->
            <button class="btn-remove-link p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" data-idx="${index}" title="Remover">
                ${getIcon('close', 'w-4 h-4')}
            </button>
        </div>
    `
      )
      .join('');

    const content = `
      <div class="space-y-8 p-1">
        
        <!-- SEÇÃO: TEMA -->
        <div>
          <h4 class="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-4 flex items-center gap-2">
            ${getIcon('eye', 'w-3 h-3')} Aparência
          </h4>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Card Dark -->
            <label class="cursor-pointer group relative">
              <input type="radio" name="theme" value="dark" class="peer sr-only" ${
                theme === 'dark' ? 'checked' : ''
              }>
              <div class="h-20 rounded-xl border border-border-subtle bg-zinc-900 peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent peer-checked:ring-offset-2 peer-checked:ring-offset-bg-surface transition-all overflow-hidden flex flex-col justify-end p-3 hover:border-accent/50">
                <!-- Miniatura UI -->
                <div class="absolute top-3 left-3 right-3 h-2 bg-zinc-800 rounded-full opacity-50"></div>
                <div class="absolute top-7 left-3 w-1/2 h-2 bg-zinc-800 rounded-full opacity-30"></div>
                <span class="text-sm font-bold text-white relative z-10 flex items-center gap-2">
                    ${
                      theme === 'dark'
                        ? getIcon('check-circle', 'w-4 h-4 text-accent')
                        : ''
                    } Escuro
                </span>
              </div>
            </label>
            
            <!-- Card Light -->
            <label class="cursor-pointer group relative">
              <input type="radio" name="theme" value="light" class="peer sr-only" ${
                theme === 'light' ? 'checked' : ''
              }>
              <div class="h-20 rounded-xl border border-border-subtle bg-zinc-100 peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent peer-checked:ring-offset-2 peer-checked:ring-offset-bg-surface transition-all overflow-hidden flex flex-col justify-end p-3 hover:border-accent/50">
                <!-- Miniatura UI -->
                <div class="absolute top-3 left-3 right-3 h-2 bg-white border border-gray-200 rounded-full opacity-50"></div>
                <div class="absolute top-7 left-3 w-1/2 h-2 bg-white border border-gray-200 rounded-full opacity-50"></div>
                <span class="text-sm font-bold text-zinc-900 relative z-10 flex items-center gap-2">
                    ${
                      theme === 'light'
                        ? getIcon('check-circle', 'w-4 h-4 text-accent')
                        : ''
                    } Claro
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- SEÇÃO: FONTE -->
        <div>
          <h4 class="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-4 flex items-center gap-2">
            ${getIcon('edit', 'w-3 h-3')} Tipografia do Editor
          </h4>
          
          <div class="bg-bg-app rounded-xl p-4 border border-border-subtle">
              <div class="flex items-center gap-4 mb-2">
                <span class="text-xs text-text-muted font-medium">Aa</span>
                <!-- Range Slider com Accent Color -->
                <input type="range" id="font-size-range" min="12" max="24" step="1" value="${fontSize}" 
                  class="w-full h-1.5 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-hover transition-all">
                <span class="text-lg text-text-main font-bold">Aa</span>
              </div>
              
              <div class="flex justify-between items-center mt-2">
                <span class="text-xs text-text-muted">Tamanho da fonte</span>
                <span id="font-size-display" class="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">${fontSize}px</span>
              </div>
          </div>
        </div>

        <!-- SEÇÃO: INTEGRAÇÕES -->
        <div class="pt-2">
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-[10px] uppercase font-bold text-text-muted tracking-widest flex items-center gap-2">
                    ${getIcon('external-link', 'w-3 h-3')} Integrações (Click-to-Run)
                </h4>
                <button id="btn-add-link" class="text-[10px] font-bold text-accent hover:text-accent-hover hover:underline flex items-center gap-1 transition-colors">
                    ${getIcon('plus', 'w-3 h-3')} ADICIONAR
                </button>
            </div>
            
            <p class="text-xs text-text-muted mb-4 leading-relaxed bg-bg-app p-3 rounded-lg border border-border-subtle">
                Configure URLs externas que podem receber o conteúdo do prompt. Use para abrir diretamente no ChatGPT, MidJourney Web, etc.
            </p>
            
            <div id="links-container" class="space-y-1">
                ${
                  linksHtml.length
                    ? linksHtml
                    : '<div class="text-center text-xs text-text-muted py-4 italic opacity-50">Nenhuma integração configurada</div>'
                }
            </div>
        </div>

        <!-- RODAPÉ FIXO -->
        <div class="pt-6 mt-4 border-t border-border-subtle">
          <button id="btn-save-settings" class="btn btn-primary w-full justify-center shadow-lg shadow-accent/20 py-2.5">
            Salvar Preferências
          </button>
        </div>
      </div>
    `;

    eventBus.emit('modal:open', {
      title: 'Configurações do Sistema',
      content: content,
    });

    setTimeout(() => this.attachListeners(), 50);
  }

  attachListeners() {
    const modal = document.getElementById('modal-container');
    const range = modal.querySelector('#font-size-range');
    const display = modal.querySelector('#font-size-display');
    const saveBtn = modal.querySelector('#btn-save-settings');
    const linksContainer = modal.querySelector('#links-container');
    const btnAdd = modal.querySelector('#btn-add-link');

    btnAdd.onclick = () => {
      const div = document.createElement('div');
      div.className = 'group flex gap-3 items-center mb-3 animate-fade-in-up';
      div.innerHTML = `
            <!-- Input Nome -->
            <div class="relative w-1/3">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    ${getIcon('tag', 'w-3 h-3')}
                </div>
                <input type="text" data-idx="${linksContainer.children.length}" 
                    class="link-name input-surface w-full pl-9 h-9 text-xs font-medium rounded-lg" 
                    placeholder="Nome">
            </div>

            <!-- Input URL -->
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    ${getIcon('external-link', 'w-3 h-3')}
                </div>
                <input type="text" data-idx="${linksContainer.children.length}" 
                    class="link-url input-surface w-full pl-9 h-9 text-xs font-mono text-text-muted rounded-lg" 
                    placeholder="https://...">
            </div>

            <!-- Botão Remover -->
            <button class="btn-remove-link p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" data-idx="${linksContainer.children.length}" title="Remover">
                ${getIcon('close', 'w-4 h-4')}
            </button>
        `;

      // Remove handler for new item
      div.querySelector('.btn-remove-link').onclick = () => div.remove();
      linksContainer.appendChild(div);
    };

    // Remove handlers for existing items
    modal.querySelectorAll('.btn-remove-link').forEach((btn) => {
      btn.onclick = (e) => e.target.closest('div[data-idx-container]').remove();
    });

    // Live Preview do número
    range.oninput = (e) => {
      display.textContent = `${e.target.value}px`;
      
      const preview = modal.querySelector('#font-size-display');
      preview.style.fontSize = `${e.target.value}px`;


      // Opcional: Aplicar preview em tempo real emitindo evento
      // eventBus.emit('settings:preview-font', e.target.value);
    };

    saveBtn.onclick = () => {
      const selectedTheme = modal.querySelector(
        'input[name="theme"]:checked'
      ).value;
      const selectedSize = parseInt(range.value, 10);

      const newLinks = [];
      modal.querySelectorAll('#links-container > div').forEach((div) => {
        const name = div.querySelector('.link-name').value.trim();
        const url = div.querySelector('.link-url').value.trim();
        if (name && url) newLinks.push({ name, url });
      });

      eventBus.emit('settings:save', {
        preferences: {
          theme: selectedTheme,
          editorFontSize: selectedSize,
        },
        clickToRun: newLinks, // Salva nova lista
      });

      eventBus.emit('modal:close', {});
    };
  }
}
