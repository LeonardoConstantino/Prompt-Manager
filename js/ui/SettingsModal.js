import eventBus from '../utils/eventBus.js';
import { toast } from '../utils/Toast.js';
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
    const linksHtml = this.currentConfig.clickToRun
      .map(
        (link, index) => `
        <div class="flex gap-2 items-center mb-2">
            <input type="text" value="${link.name}" data-idx="${index}" class="link-name w-1/3 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" placeholder="Nome">
            <input type="text" value="${link.url}" data-idx="${index}" class="link-url flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-300 font-mono" placeholder="https://...">
            <button class="btn-remove-link text-red-400 hover:text-red-300 p-1" data-idx="${index}">✕</button>
        </div>
    `
      )
      .join('');

    const content = `
      <div class="space-y-6">
        <!-- Tema -->
        <div>
          <h4 class="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Aparência</h4>
          <div class="flex gap-4">
            <label class="cursor-pointer">
              <input type="radio" name="theme" value="dark" class="peer sr-only" ${
                theme === 'dark' ? 'checked' : ''
              }>
              <div class="w-32 p-3 rounded-lg border border-gray-600 bg-gray-800 peer-checked:border-blue-500 peer-checked:ring-1 peer-checked:ring-blue-500 transition-all text-center">
                <div class="text-gray-200 font-medium">Escuro</div>
              </div>
            </label>
            
            <label class="cursor-pointer">
              <input type="radio" name="theme" value="light" class="peer sr-only" ${
                theme === 'light' ? 'checked' : ''
              }>
              <div class="w-32 p-3 rounded-lg border border-gray-600 bg-gray-200 peer-checked:border-blue-500 peer-checked:ring-1 peer-checked:ring-blue-500 transition-all text-center">
                <div class="text-gray-800 font-medium">Claro</div>
              </div>
            </label>
          </div>
          <p class="text-xs text-gray-500 mt-2">Nota: O modo claro requer ajustes nas classes CSS do Tailwind.</p>
        </div>

        <!-- Fonte -->
        <div>
          <h4 class="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Editor e Leitura</h4>
          <div class="flex items-center gap-4">
            <span class="text-xs text-gray-400">Aa</span>
            <input type="range" id="font-size-range" min="12" max="24" step="1" value="${fontSize}" 
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
            <span class="text-xs text-gray-400 text-xl">Aa</span>
          </div>
          <div class="flex justify-between mt-2">
            <span class="text-xs text-gray-500">Tamanho atual: <span id="font-size-display" class="font-bold text-blue-400">${fontSize}px</span></span>
          </div>
        </div>

        <!-- Seção Click-to-Run -->
        <div class="pt-4 border-t border-gray-700">
            <h4 class="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Integrações (Click-to-Run)</h4>
            <p class="text-xs text-gray-500 mb-3">Defina links para abrir após copiar o prompt.</p>
            
            <div id="links-container">
                ${linksHtml}
            </div>
            
            <button id="btn-add-link" class="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                ${getIcon('plus', 'w-4 h-4')}
                <span>Adicionar Integração</span>
            </button>
        </div>

        <!-- Botão Salvar -->
        <div class="pt-4 border-t border-gray-700">
          <button id="btn-save-settings" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors">
            Salvar Preferências
          </button>
        </div>
      </div>
    `;

    eventBus.emit('modal:open', {
      title: 'Configurações',
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
      div.className = 'flex gap-2 items-center mb-2';
      div.innerHTML = `
            <input type="text" class="link-name w-1/3 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" placeholder="Nome">
            <input type="text" class="link-url flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-300 font-mono" placeholder="https://...">
            <button class="btn-remove-link text-red-400 hover:text-red-300 p-1">${getIcon(
              'close',
              'w-4 h-4'
            )}</button>
        `;

      // Remove handler for new item
      div.querySelector('.btn-remove-link').onclick = () => div.remove();
      linksContainer.appendChild(div);
    };

    // Remove handlers for existing items
    modal.querySelectorAll('.btn-remove-link').forEach((btn) => {
      btn.onclick = (e) => e.target.parentElement.remove();
    });

    // Live Preview do número
    range.oninput = (e) => {
      display.textContent = `${e.target.value}px`;
      // Opcional: Aplicar preview em tempo real emitindo evento
      eventBus.emit('settings:preview-font', e.target.value);
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

      toast.show('Preferências salvas com sucesso!', 'success');
    };
  }
}
