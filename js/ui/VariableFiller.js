import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';

export default class VariableFiller {
  constructor() {
    this.modalId = 'variable-modal';
  }

  /**
   * Verifica variáveis e solicita preenchimento se necessário
   * @param {string} content - Conteúdo do prompt
   * @param {Function} onComplete - Callback (finalText) => void
   */
  async process(content, onComplete) {
    // Regex para identificar {{ variavel }}
    const regex = /{{\s*([^}]+)\s*}}/g;
    const matches = [...new Set([...content.matchAll(regex)].map(m => m[1].trim()))];

    if (matches.length === 0) {
      await onComplete(content);
      return;
    }

    this.openModal(matches, content, onComplete);
  }

  openModal(variables, content, onComplete) {
    const formHtml = variables.map(v => `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-400 mb-1 capitalize">${v}</label>
        <textarea name="${v}" rows="2" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500"></textarea>
      </div>
    `).join('');

    const contentHtml = `
      <div class="p-1">
        <p class="text-sm text-gray-300 mb-4">Este prompt contém variáveis. Preencha os valores antes de usar:</p>
        <form id="vars-form">
          ${formHtml}
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" id="btn-cancel-vars" class="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg flex items-center gap-2">
              ${getIcon('copy', 'w-4 h-4')}
              <span>Copiar & Usar</span>
            </button>
          </div>
        </form>
      </div>
    `;

    // Usa o sistema de Modal existente
    eventBus.emit('modal:open', {
      title: 'Preencher Variáveis',
      content: contentHtml
    });

    // Listeners do form
    setTimeout(() => {
      const modal = document.getElementById('modal-container');
      const form = modal.querySelector('#vars-form');
      const cancel = modal.querySelector('#btn-cancel-vars');

      // Focar no primeiro input
      const firstInput = form.querySelector('textarea');
      if (firstInput) firstInput.focus();

      cancel.onclick = () => eventBus.emit('modal:close');

      form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        let finalContent = content;

        // Substituição
        for (const [key, value] of formData.entries()) {
            // Regex global para substituir todas as ocorrências da variável
            const vRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
            finalContent = finalContent.replace(vRegex, value);
        }

        eventBus.emit('modal:close', {});
        onComplete(finalContent);
      };
    }, 50);
  }
}