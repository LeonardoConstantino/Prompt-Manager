import eventBus from '../utils/eventBus.js';
import { formatDate } from '../utils/helpers.js';
import TextDiff from '../lib/TextDiff.js';
import { getIcon } from '../utils/Icons.js';

export default class VersionHistory {
  constructor() {
    // Escuta pedido para abrir histórico
    eventBus.on('history:open', ({ promptId }) => {
      // Solicita as versões ao App (que pegará do Repository)
      eventBus.emit('ui:request-versions', { promptId });
    });

    // Recebe a lista de versões para renderizar
    eventBus.on('history:list-loaded', ({ promptId, versions }) => {
      this.render(promptId, versions);
    });
  }

  render(promptId, versions) {
    if (!versions || versions.length === 0) {
      alert('Nenhuma versão anterior encontrada.');
      return;
    }

    // Gera HTML da lista
    const listHtml = `
      <div class="space-y-4">
        ${versions.map((version, index) => {
          const isLatest = index === 0;
          
          // Lógica de Diff Formatado
          let diffPreview = '';
          if (version.diff) {
            // Obtém string formatada da classe TextDiff
            const formattedDiff = TextDiff.format(version.diff);
            
            // Renderiza apenas se houver conteúdo no diff
            if (formattedDiff && formattedDiff.trim() !== '') {
              diffPreview = `
                <details class="group mt-2">
                  <summary class="text-xs text-blue-400 cursor-pointer hover:text-blue-300 select-none flex items-center gap-1">
                    ${getIcon('chevron-right', 'w-3 h-3 transition-transform group-open:rotate-90')}
                    Ver alterações
                  </summary>
                  <pre class="mt-2 text-[10px] leading-tight font-mono bg-gray-900 p-2 rounded border border-gray-700 overflow-x-auto whitespace-pre text-gray-300">${this.colorizeDiff(formattedDiff)}</pre>
                </details>
              `;
            }
          } else if (isLatest) {
             diffPreview = `<p class="text-xs text-gray-500 mt-2 italic">Versão atual em uso.</p>`;
          } else {
             diffPreview = `<p class="text-xs text-gray-500 mt-2 italic">Snapshot completo (Sem diff).</p>`;
          }

          return `
            <div class="border border-gray-600 rounded-lg p-3 bg-gray-750 hover:bg-gray-700 transition-colors flex flex-col">
              <div class="flex justify-between items-start">
                <div>
                  <span class="text-sm font-bold text-blue-400">${formatDate(version.timestamp, true)}</span>
                  ${isLatest ? '<span class="ml-2 text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Atual</span>' : ''}
                </div>
                <div class="flex gap-2">
                   ${!isLatest ? `
                    <button class="btn-restore text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded shadow-sm" data-id="${version.id}">
                      Restaurar
                    </button>
                   ` : ''}
                   ${versions.length > 1 ? `
                    <button class="btn-delete-ver text-xs bg-red-900 hover:bg-red-800 text-red-200 px-2 py-1 rounded shadow-sm" data-id="${version.id}" title="Apagar versão">
                      ${getIcon('close', 'w-3 h-3')}
                    </button>
                   ` : ''}
                </div>
              </div>
              
              <p class="text-sm text-gray-300 mt-1">"${version.note || 'Sem notas'}"</p>
              
              ${diffPreview}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Abre o Modal com o conteúdo gerado
    eventBus.emit('modal:open', {
      title: 'Histórico de Versões',
      content: listHtml
    });

    // Pequeno delay para garantir que o modal renderizou antes de atrelar eventos aos botões dinâmicos
    setTimeout(() => this.attachItemListeners(promptId), 50);
  }

  // Helper visual simples para colorir a string retornada pelo TextDiff.format
  colorizeDiff(text) {
    // Escapa HTML primeiro para segurança
    const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Aplica cores nas linhas que começam com + ou -
    return safeText.split('\n').map(line => {
      if (line.startsWith('+')) return `<span class="text-green-400">${line}</span>`;
      if (line.startsWith('-')) return `<span class="text-red-400">${line}</span>`;
      return `<span class="text-gray-500">${line}</span>`;
    }).join('\n');
  }

  attachItemListeners(promptId) {
    const modal = document.getElementById('modal-container');
    
    // Listeners de Restaurar
    modal.querySelectorAll('.btn-restore').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Restaurar esta versão substituirá o conteúdo atual. Deseja continuar?')) {
          eventBus.emit('version:restore', { promptId, versionId: btn.dataset.id });
          eventBus.emit('modal:close');
        }
      };
    });

    // Listeners de Deletar
    modal.querySelectorAll('.btn-delete-ver').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Tem certeza que deseja apagar este registro de histórico?')) {
          eventBus.emit('version:delete', { promptId, versionId: btn.dataset.id });
          // Não fecha o modal, apenas atualiza a lista
          // O App deve reemitir 'ui:request-versions' após deletar
        }
      };
    });
  }
}