import eventBus from '../utils/eventBus.js';
import { getIcon } from '../utils/Icons.js';

export default class VariableFiller {
  constructor() {
    this.modalId = 'variable-modal';
  }

  /**
   * Helper para escapar caracteres especiais em Regex
   * (Isso previne que ?, ., (, ) ou aspas quebrem a busca)
   * @param {string} string - String a ser escapada
   * @returns {string} - String escapada
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Verifica variáveis e solicita preenchimento se necessário
   * @param {string} content - Conteúdo do prompt
   * @param {Function} onComplete - Callback (finalText) => void
   */
  async process(content, onComplete) {
    // 1. Extração
    const regex = /{{\s*([^}]+)\s*}}/g;
    
    // Extrai apenas os textos únicos das variáveis
    const rawVariables = [...new Set([...content.matchAll(regex)].map(m => m[1].trim()))];

    if (rawVariables.length === 0) {
      await onComplete(content);
      return;
    }

    // 2. Mapeamento Seguro
    // Criamos um objeto para cada variável que separa o ID técnico do Label visual
    const variableMap = rawVariables.map((rawText, index) => ({
      id: `var_${index}`, // ID seguro para HTML (ex: var_0)
      label: rawText      // Texto original para exibição (pode ter aspas, pontos, etc)
    }));

    this.openModal(variableMap, content, onComplete);
  }

  openModal(variableMap, content, onComplete) {
    // Gera os campos do formulário
    const formHtml = variableMap.map(v => `
      <div class="mb-5 group">
        <!-- Label com efeito de foco -->
        <label class="flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2 ml-1 select-none group-focus-within:text-accent transition-colors">
            ${getIcon('tag', 'w-3 h-3 opacity-70')}
            ${v.label}
        </label>
        
        <!-- Textarea usando classe padronizada input-surface -->
        <textarea 
            name="${v.id}" 
            rows="2" 
            placeholder="Digite o valor para [${v.label}]..."
            class="input-surface w-full p-3 rounded-lg text-sm resize-y min-h-[80px] custom-scrollbar"
        ></textarea>
      </div>
    `).join('');

    const contentHtml = `
      <div class="p-1">
        <!-- Box de Instrução -->
        <div class="flex items-start gap-3 mb-6 p-4 bg-bg-app rounded-lg border border-border-subtle">
            <span class="text-accent mt-0.5 shrink-0 animate-pulse">
                ${getIcon('info-circle', 'w-4 h-4')}
            </span>
            <p class="text-sm text-text-muted leading-relaxed">
                Este prompt possui <strong class="text-text-main">${variableMap.length} variáveis dinâmicas</strong>. 
                Os valores preenchidos abaixo substituirão os marcadores no texto final.
            </p>
        </div>

        <form id="vars-form" class="animate-fade-in-up">
          ${formHtml}
          
          <!-- Rodapé de Ações -->
          <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-border-subtle">
            <button type="button" id="btn-cancel-vars" class="btn btn-ghost text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors">
                Cancelar
            </button>
            
            <button type="submit" class="btn btn-primary shadow-lg shadow-accent/20">
              ${getIcon('copy', 'w-4 h-4 mr-2')}
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
    setTimeout(async() => {
      const modal = document.getElementById('modal-container');
      const form = modal.querySelector('#vars-form');
      const cancel = modal.querySelector('#btn-cancel-vars');

      // Focar no primeiro input
      const firstInput = form.querySelector('textarea');
      if (firstInput) firstInput.focus();

      cancel.onclick = () => eventBus.emit('modal:close', {});

      form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        let finalContent = content;

        // Iteramos sobre o MAPA ORIGINAL, não sobre o formData diretamente
        // Isso garante que sabemos qual ID corresponde a qual Texto Original
        variableMap.forEach(v => {
            const userValue = formData.get(v.id) || ''; // Pega valor pelo ID seguro (var_0)
            
            // Cria Regex escapando caracteres especiais do texto original
            // Ex: "contexto: ..." vira "contexto\:\ \.\.\." para o Regex não falhar
            const safeRaw = this.escapeRegExp(v.label);
            
            // Procura por {{ safeRaw }} ignorando espaços extras dentro das chaves
            const vRegex = new RegExp(`{{\\s*${safeRaw}\\s*}}`, 'gi');
            
            finalContent = finalContent.replace(vRegex, userValue);
        });

        eventBus.emit('modal:close', {});
        onComplete(finalContent);
      };
    }, 50);
  }
}