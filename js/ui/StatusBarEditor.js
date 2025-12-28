import { getIcon } from '../utils/Icons.js';

const TOKEN_WARNING_THRESHOLD = 0.8;

/**
 * Obtem HTML do status bar
 *
 * @param {{ chars: number; words: number; estTokens: number; }} stats - Estatísticas do editor
 * @param {number} tokenWarningLimit - Limite de contexto para warn (padrão: 4096)
 * @returns {string} - Marcação HTML do status bar
 */
export const getStatusBarEditor = (
  stats = { chars: 0, words: 0, estTokens: 0 },
  tokenWarningLimit = 4096
) => {
  const { chars, words, estTokens } = stats;
  const getTokenClasses = () => {
    const base = 'font-bold tabular-nums transition-all duration-300';

    if (estTokens > tokenWarningLimit) {
      return `${base} text-red-600 dark:text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]`;
    }
    if (estTokens > tokenWarningLimit * TOKEN_WARNING_THRESHOLD) {
      return `${base} text-amber-600 dark:text-amber-400`;
    }
    return `${base} text-accent`;
  };

  return `<!-- Status Bar do Editor -->
<div class="flex items-center gap-4 px-3 text-[10px] font-mono text-text-muted border-l border-border-subtle pl-6 mb-2 select-none">
    
    <!-- Caracteres -->
    <div title="Total de caracteres" class="flex items-center gap-1 hover:text-text-main transition-colors cursor-default">
        <span id="stat-chars" class="font-bold text-text-main tabular-nums">${chars}</span> 
        <span class="opacity-70">chars</span>
    </div>

    <!-- Palavras -->
    <div title="Total de palavras" class="flex items-center gap-1 hover:text-text-main transition-colors cursor-default">
        <span id="stat-words" class="font-bold text-text-main tabular-nums">${words}</span> 
        <span class="opacity-70">palavras</span>
    </div>

    <!-- Tokens (Com destaque) -->
    <div title="Estimativa: 1 token ≈ 4 caracteres" class="group relative cursor-help flex items-center gap-1 transition-colors">
        <!-- Ícone sutil de 'chip' -->
        ${getIcon(
            'chip',
            'w-3 h-3 opacity-50 group-hover:text-accent transition-colors'
        )}
        
        <span id="stat-tokens" class="${getTokenClasses()}">${estTokens}</span> 
        <span class="text-accent/70 group-hover:text-accent transition-colors">tok (est.)</span>
    </div>
</div>`;
};
