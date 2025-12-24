import eventBus from '../utils/eventBus.js';
import { MarkdownParser } from '../utils/markdown.js';
import { getIcon } from '../utils/Icons.js';
import { toast } from '../utils/Toast.js';
import VariableFiller from './VariableFiller.js';
import {
  copyToClipboard,
  downloadFile,
  formatDate,
  getCategoryColor,
} from '../utils/helpers.js';

export default class PromptViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentPrompt = null;
    this.variableFiller = new VariableFiller();
    this.clickToRunLinks = []; // Inicializa array de links
    this.renderPlaceholder();

    this.markdown = new MarkdownParser();

    // Listeners
    eventBus.on('prompt:selected', ({ id }) => {
      // Em uma aplicação real, o repository seria injetado ou buscado via evento.
      // Aqui simplificamos emitindo um pedido para o App Controller buscar o dado.
      eventBus.emit('ui:request-details', { id });
    });

    // Evento para quando o App carregar os detalhes do prompt
    eventBus.on('viewer:load-prompt', ({ prompt, config }) => {
      this.clickToRunLinks =
        config && config.clickToRun ? config.clickToRun : [];
      this.update(prompt);
    });

    // Recebe configurações atualizadas para renderizar os botões corretos
    eventBus.on('config:updated', (config) => {
      this.clickToRunLinks = config.clickToRun || [];
      if (this.currentPrompt) this.render(); // Re-renderiza para mostrar novos botões
    });

    // Inicializa config
    eventBus.emit('ui:request-config', (cfg) => {
      this.clickToRunLinks = cfg && cfg.clickToRun ? cfg.clickToRun : [];
    });

    eventBus.on('prompt:updated', ({ prompt }) => {
      if (this.currentPrompt && this.currentPrompt.id === prompt.id) {
        this.update(prompt);
      }
    });

    eventBus.on('prompt:deleted', () => {
      this.currentPrompt = null;
      this.renderPlaceholder();
    });
  }

  update(prompt) {
    this.currentPrompt = prompt;
    this.render();
  }

  renderPlaceholder() {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-gray-500">
        ${getIcon('placeholder', 'w-16 h-16 mb-4 opacity-50')}
        <p class="text-lg">Selecione um prompt para visualizar</p>
      </div>
    `;
  }

  render() {
    if (!this.currentPrompt) return;

    const { name, description, tags, content, updatedAt } = this.currentPrompt;
    const htmlContent = this.markdown.parse(content);
    const safeLinks = Array.isArray(this.clickToRunLinks)
      ? this.clickToRunLinks
      : [];

    // Gera botões de Run dinamicamente
    const runButtonsHtml = safeLinks
      .map(
        (link) => `
        <button class="btn-run px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 text-xs rounded flex items-center gap-1 transition-colors" data-url="${
          link.url
        }" title="Copiar e abrir ${link.name}">
            ${getIcon('external-link', 'w-4 h-4')}
            ${link.name}
        </button>
    `
      )
      .join('');

    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="p-6 border-b border-gray-700 bg-gray-800">
          <div class="flex justify-between items-start mb-4">
            <h1 class="text-2xl font-bold text-white">${name}</h1>
            <div class="flex gap-2">
              <button id="btn-edit" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded">Editar</button>
              <button id="btn-history" class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded">Histórico</button>
              <button id="btn-delete" class="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-100 text-sm rounded">Deletar</button>
            </div>
          </div>
          <p class="text-gray-400 mb-3">${description}</p>
          <div class="flex flex-wrap gap-2 mb-2">
            ${tags
              .map((tag) => {
                const colors = getCategoryColor(tag);

                return `<span class="text-[10px] ${colors.bg} ${colors.text} px-1.5 py-0.5 rounded-full tracking-wide font-mono">#${tag}</span>`;
              })
              .join('')}
          </div>
          <div class="text-xs text-gray-500">Atualizado em: ${formatDate(
            updatedAt,
            true
          )}</div>
        </div>

        <!-- Toolbar -->
        <div class="px-6 py-2 bg-gray-900 border-b border-gray-700 flex gap-2 justify-between items-center">
          <div class="flex gap-2">
             ${runButtonsHtml}
          </div>
          <div class="flex gap-2">
            <button id="btn-copy" class="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-gray-800">
               ${getIcon('copy', 'w-4 h-4')} <span>Copiar</span>
            </button>
            <button id="btn-download" class="text-xs flex items-center gap-1 text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800">
                ${getIcon('download', 'w-4 h-4')} <span>Baixar .md</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 bg-gray-900 text-gray-300 leading-relaxed prompt-content">
          ${htmlContent}
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    this.container.querySelector('#btn-edit').onclick = () => {
      eventBus.emit('prompt:edit', { id: this.currentPrompt.id });
    };

    this.container.querySelector('#btn-delete').onclick = () => {
      if (confirm('Tem certeza que deseja deletar este prompt?')) {
        eventBus.emit('prompt:delete', { id: this.currentPrompt.id });
      }
    };

    this.container.querySelector('#btn-history').onclick = () => {
      eventBus.emit('history:open', { promptId: this.currentPrompt.id });
    };

    // Lógica Centralizada de Cópia (Com Variáveis)
    const handleCopy = async (urlToOpen = null) => {
      const finalContent = async (finalText) => {
        await copyToClipboard(finalText);
        if (urlToOpen) {
          toast.show('Copiado! Abrindo link...', 'success');
          window.open(urlToOpen, '_blank');
        } else {
          toast.show('Copiado para área de transferência!', 'success');
        }
      };

      await this.variableFiller.process(
        this.currentPrompt.content,
        finalContent
      );
    };

    this.container.querySelector('#btn-copy').onclick = async () => {
      await handleCopy();
    };

    // Botões Click-to-Run
    this.container.querySelectorAll('.btn-run').forEach((btn) => {
      btn.onclick = () => handleCopy(btn.dataset.url);
    });

    this.container.querySelector('#btn-download').onclick = () => {
      downloadFile(
        this.currentPrompt.content,
        `${this.currentPrompt.name}.md`,
        'text/markdown'
      );
    };
  }
}
