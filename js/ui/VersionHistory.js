import eventBus from '../utils/eventBus.js';
import { formatDate } from '../utils/helpers.js';
import TextDiff from '../lib/TextDiff.js';
import { getIcon } from '../utils/Icons.js';
import { confirmModal } from './ConfirmModal.js';

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
      // Gera um Empty State visualmente rico
      const emptyStateHtml = `
        <div class="flex flex-col items-center justify-center py-12 text-center select-none animate-fade-in">
          <!-- Ícone com Círculo Decorativo -->
          <div class="mb-4 p-4 rounded-full bg-bg-app border border-border-subtle shadow-sm">
             ${getIcon('clock', 'w-10 h-10 text-text-muted opacity-50')}
          </div>
          
          <h3 class="text-lg font-bold text-text-main mb-2">Histórico Vazio</h3>
          
          <p class="text-sm text-text-muted max-w-xs leading-relaxed mx-auto">
            Este prompt ainda não possui versões anteriores. 
            O histórico é criado automaticamente sempre que você edita e salva um prompt existente.
          </p>
          
          <div class="mt-6">
             <button id="btn-modal-close-empty" class="btn btn-secondary text-xs" onclick="document.getElementById('btn-modal-close').click()">
                Voltar para o Editor
             </button>
          </div>
        </div>
      `;

      eventBus.emit('modal:open', {
        title: 'Histórico de Versões',
        content: emptyStateHtml,
      });
      return;
    }

    // Gera HTML da lista
    const listHtml = `
      <div class="space-y-4">
        ${versions
          .map((version, index) => {
            const isLatest = index === 0;

            // Lógica de Diff
            let diffContent = '';
            const formattedDiff = version.diff
              ? TextDiff.format(version.diff)
              : null;
            const hasDiff = formattedDiff && formattedDiff.trim() !== '';

            if (hasDiff) {
              diffContent = `
                <details class="group mt-3">
                  <summary class="text-xs font-medium text-accent cursor-pointer hover:text-accent-hover select-none flex items-center gap-1 transition-colors w-max">
                    <span class="bg-accent/10 p-0.5 rounded transition-transform group-open:rotate-90">
                        ${getIcon('chevron-right', 'w-3 h-3')}
                    </span>
                    <span>Ver alterações no código</span>
                  </summary>
                  
                  <!-- Área de Código / Diff -->
                  <div class="mt-2 relative rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
                      <div class="absolute top-2 right-2 flex gap-1">
                          <span class="w-2 h-2 rounded-full bg-red-500/50"></span>
                          <span class="w-2 h-2 rounded-full bg-green-500/50"></span>
                      </div>
                      <pre class="text-[10px] leading-relaxed font-mono p-3 overflow-x-auto whitespace-pre text-text-muted select-text custom-scrollbar">${this.colorizeDiff(
                        formattedDiff
                      )}</pre>
                  </div>
                </details>
              `;
            } else if (isLatest) {
              diffContent = `<div class="mt-3 text-xs text-text-muted flex items-center gap-2 opacity-70">
                ${getIcon(
                  'check-circle',
                  'w-3 h-3'
                )} Versão atual (sem alterações pendentes)
             </div>`;
            } else {
              diffContent = `<div class="mt-3 text-xs text-text-muted italic opacity-60">Snapshot completo (Diff não disponível).</div>`;
            }

            // Renderização do Card
            return `
            <div class="group/card relative border border-border-subtle rounded-xl p-4 bg-bg-app hover:border-accent/30 hover:shadow-sm transition-all duration-300">
              
              <!-- Cabeçalho do Card -->
              <div class="flex justify-between items-start mb-2">
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                      <span class="text-xs font-bold font-mono text-text-main">
                        ${formatDate(version.timestamp, true)}
                      </span>
                      ${
                        isLatest
                          ? `<span class="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium select-none">Atual</span>`
                          : `<span class="text-[10px] text-text-muted font-mono opacity-60">${formatDate(
                              version.timestamp,
                              false,
                              true
                            )}</span>`
                      }
                  </div>
                </div>

                <!-- Ações -->
                <div class="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
                   ${
                     !isLatest
                       ? `
                    <button class="btn-restore flex items-center gap-1.5 text-xs bg-bg-surface hover:bg-bg-surface-hover border border-border-subtle hover:border-accent text-text-main px-3 py-1.5 rounded-md transition-all shadow-sm" data-id="${
                      version.id
                    }">
                      ${getIcon('refresh', 'w-3 h-3 text-text-muted')} 
                      <span>Restaurar</span>
                    </button>
                   `
                       : ''
                   }
                   
                   ${
                     versions.length > 1
                       ? `
                    <button class="btn-delete-ver p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" data-id="${
                      version.id
                    }" title="Apagar esta versão">
                      ${getIcon('trash', 'w-3.5 h-3.5')}
                    </button>
                   `
                       : ''
                   }
                </div>
              </div>
              
              <!-- Nota da Versão -->
              <div class="flex items-start gap-2">
                 <span class="mt-0.5 text-accent opacity-70">${getIcon(
                   'info-circle',
                   'w-3 h-3'
                 )}</span>
                 <p class="text-sm text-text-main italic opacity-90 leading-snug">
                    "${version.note || 'Alteração sem nota'}"
                 </p>
              </div>
              
              ${diffContent}
            </div>
          `;
          })
          .join('')}
      </div>
    `;

    // Abre o Modal
    eventBus.emit('modal:open', {
      title: 'Histórico de Versões',
      content: listHtml,
    });

    setTimeout(() => this.attachItemListeners(promptId), 50);
  }

  /**
 * Formata o diff textual para HTML colorido
 * Aceita o formato retornado por TextDiff.format()
 * @param {string} text - Texto do diff formatado
 * @returns {string} HTML colorido
 */
colorizeDiff(text) {
  if (!text) return '';

  // Escapa HTML para segurança
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return safeText
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      // Cabeçalho principal (=== DIFF REPORT ===)
      if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
        // return `<div class="text-lg font-bold text-blue-600 dark:text-blue-400 py-2 border-b-2 border-blue-500/30 mb-3">${line}</div>`;
        return ``;
      }

      // Seções (📝 MODIFICAÇÕES:, ❌ REMOÇÕES:, ✅ ADIÇÕES:, 📊 ESTATÍSTICAS:)
      if (
        trimmed.startsWith('📝') || 
        trimmed.startsWith('❌') || 
        trimmed.startsWith('✅') || 
        trimmed.startsWith('📊')
      ) {
        const colorClass = 
          trimmed.startsWith('📝') ? 'text-amber-600 dark:text-amber-400' :
          trimmed.startsWith('❌') ? 'text-red-600 dark:text-red-400' :
          trimmed.startsWith('✅') ? 'text-emerald-600 dark:text-emerald-400' :
          'text-indigo-600 dark:text-indigo-400';
        
        return `<div class="font-semibold ${colorClass} mt-3 mb-2 text-sm">${line}</div>`;
      }

      // Linhas de modificação: "  Linha X:"
      if (trimmed.startsWith('Linha ') && trimmed.endsWith(':')) {
        return `<div class="text-gray-600 dark:text-gray-400 text-xs font-medium mt-1 pl-4">${line}</div>`;
      }

      // Linhas removidas (começam com "    - " ou "  Linha X: ")
      if (line.includes('    - ')) {
        return `<div class="block w-full px-3 py-0.5 bg-red-500/10 text-red-700 dark:text-red-400 border-l-2 border-red-500/50 pl-6 font-mono text-xs">${line}</div>`;
      }

      // Linhas adicionadas (começam com "    + ")
      if (line.includes('    + ')) {
        return `<div class="block w-full px-3 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500/50 pl-6 font-mono text-xs font-medium">${line}</div>`;
      }

      // Linhas de remoção completa (formato: "  Linha X: conteúdo")
      // Detecta quando está na seção de REMOÇÕES
      if (line.match(/^\s{2}Linha \d+:. .+/)) {
        return `<div class="block w-full px-3 py-0.5 bg-red-500/10 text-red-700 dark:text-red-400 border-l-2 border-red-500/50 pl-6 font-mono text-xs">${line}</div>`;
      }

      // Linhas de adição completa (formato: "  Linha X: conteúdo")
      // Detecta quando está na seção de ADIÇÕES
      if (line.match(/^\s{2}Linha \d+: .+/)) {
        return `<div class="block w-full px-3 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500/50 pl-6 font-mono text-xs font-medium">${line}</div>`;
      }

      // Estatísticas (linhas que começam com espaços e dois pontos)
      if (line.match(/^\s{2}.+:/)) {
        return `<div class="text-gray-700 dark:text-gray-300 text-xs pl-6 py-0.5 font-mono">${line}</div>`;
      }

      // Linhas vazias
      if (trimmed === '') {
        return '<div class="h-2"></div>';
      }

      // Linha padrão (contexto)
      return `<div class="text-gray-600 dark:text-gray-400 text-xs pl-4 opacity-70">${line}</div>`;
    })
    .join('');
}

  attachItemListeners(promptId) {
    const modal = document.getElementById('modal-container');

    // Listeners de Restaurar
    modal.querySelectorAll('.btn-restore').forEach((btn) => {
      btn.onclick = async () => {
        const confirmed = await confirmModal.ask(
            'Restaurar Versão?',
            'O conteúdo atual será substituído pelo conteúdo desta versão. Uma nova versão de backup do estado atual será criada automaticamente.',
            { variant: 'warning', confirmText: 'Restaurar' }
        );
        if (confirmed) {
          eventBus.emit('version:restore', {
            promptId,
            versionId: btn.dataset.id,
          });
          eventBus.emit('modal:close');
        }
      };
    });

    // Listeners de Deletar
    modal.querySelectorAll('.btn-delete-ver').forEach((btn) => {
      btn.onclick = async() => {
        const confirmed = await confirmModal.ask(
            'Apagar Versão?',
            'Este ponto do histórico deixará de existir. Isso não afeta o prompt atual.',
            { variant: 'danger', confirmText: 'Apagar' }
        );
        if (confirmed) {
          eventBus.emit('version:delete', {
            promptId,
            versionId: btn.dataset.id,
          });
          // Não fecha o modal, apenas atualiza a lista
          // O App deve reemitir 'ui:request-versions' após deletar
        }
      };
    });
  }
}
