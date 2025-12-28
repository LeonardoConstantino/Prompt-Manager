/**
 * Funções utilitárias gerais
 */

/**
 * Gera UUID v4
 * @returns {string} UUID único
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Copia texto para clipboard
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);

    // Fallback para navegadores antigos
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

/**
 * Download de arquivo
 * @param {string} content - Conteúdo do arquivo
 * @param {string} filename - Nome do arquivo
 * @param {string} type - MIME type
 */
export function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @typedef {Object} FormatDateOptions
 * @property {boolean} [includeTime=false] - Adiciona HH:mm ao formato absoluto
 * @property {boolean} [isRelative=false] - Retorna "há 2 dias" ao invés de "28/12/2025"
 * @property {string} [locale='pt-BR'] - Código BCP 47 (ex: 'en-US', 'es-ES')
 */

/**
 * Formata data ISO para formato legível ou relativo
 * @param {string} isoString - Data ISO 8601
 * @param {Partial<FormatDateOptions>} [options={}] - Configurações de formatação
 * @returns {string} Data formatada (ex: "28/12/2025", "28/12/2025, 14:30", "há 3 horas")
 * @throws {Error} Se isoString ausente ou inválida
 *
 * @example
 * formatDate('2025-12-28T10:00:00Z') // "28/12/2025"
 * formatDate('2025-12-28T10:00:00Z', { includeTime: true }) // "28/12/2025, 10:00"
 * formatDate('2025-12-27T10:00:00Z', { isRelative: true }) // "ontem"
 */
export function formatDate(
  isoString,
  { includeTime = false, isRelative = false, locale = 'pt-BR' } = {}
) {
  if (!isoString) throw new Error('isoString é obrigatório');

  const date = new Date(isoString);
  if (isNaN(date.getTime())) throw new Error('Data inválida');

  if (isRelative) {
    const diffInSeconds = Math.floor((date - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    // Ordem decrescente para priorizar unidades maiores
    const units = [
      [31536000, 'year'], // 365 * 24 * 60 * 60
      [2592000, 'month'], // 30 * 24 * 60 * 60
      [86400, 'day'], // 24 * 60 * 60
      [3600, 'hour'], // 60 * 60
      [60, 'minute'],
      [1, 'second'],
    ];

    for (const [seconds, unit] of units) {
      const value = Math.trunc(diffInSeconds / seconds);
      if (Math.abs(value) >= 1) return rtf.format(value, unit);
    }

    return rtf.format(0, 'second'); // "agora" / "now"
  }

  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (includeTime)
    Object.assign(options, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Sanitiza e normaliza tags
 * @param {string[]} tags - Array de tags
 * @returns {string[]} Tags processadas
 */
export function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    ),
  ];
}

/**
 * Debounce de função
 * @param {Function} fn - Função a ser debounced
 * @param {number} delay - Delay em ms
 * @returns {Function} Função debounced
 */
export function debounce(fn, delay = 300) {
  /**
   * @type {NodeJS.Timeout|string | number | undefined} ID do timeout
   */
  let timeoutId;

  /**
   * Função debounced
   * @param  {...any} args - Argumentos da função original
   * @return {void}
   */
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Trunca texto com elipses
 * @param {string} text - Texto a truncar
 * @param {number} length - Comprimento máximo
 * @returns {string} Texto truncado
 */
export function truncate(text, length = 100) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Valida estrutura de prompt
 * @param {{name: string, content: string, description?: string}} data - Dados do prompt
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePrompt(data) {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Nome é obrigatório');
  }

  if (data.name && data.name.length > 100) {
    errors.push('Nome deve ter no máximo 100 caracteres');
  }

  if (!data.content || data.content.trim().length === 0) {
    errors.push('Conteúdo é obrigatório');
  }

  if (data.description && data.description.length > 300) {
    errors.push('Descrição deve ter no máximo 300 caracteres');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mostra toast de notificação
 * @param {string} message - Mensagem a exibir
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {number} duration - Duração em ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Remove toast anterior se existir
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-up ${
    type === 'success'
      ? 'bg-green-600'
      : type === 'error'
      ? 'bg-red-600'
      : 'bg-blue-600'
  }`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Gerar cor única baseada na categoria
 * @param {string} category - Nome da categoria
 * @returns {{ bg: string, text: string }} { bg: string, text: string }
 */
export const getCategoryColor = (category) => {
  const colors = [
    {
      bg: 'bg-blue-100/10 dark:bg-blue-900/15',
      text: 'text-blue-800 dark:text-blue-200',
    },
    {
      bg: 'bg-green-100/10 dark:bg-green-900/15',
      text: 'text-green-800 dark:text-green-200',
    },
    {
      bg: 'bg-purple-100/10 dark:bg-purple-900/15',
      text: 'text-purple-800 dark:text-purple-200',
    },
    {
      bg: 'bg-pink-100/10 dark:bg-pink-900/15',
      text: 'text-pink-800 dark:text-pink-200',
    },
    {
      bg: 'bg-yellow-100/10 dark:bg-yellow-900/15',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
    {
      bg: 'bg-indigo-100/10 dark:bg-indigo-900/15',
      text: 'text-indigo-800 dark:text-indigo-200',
    },
    {
      bg: 'bg-red-100/10 dark:bg-red-900/15',
      text: 'text-red-800 dark:text-red-200',
    },
    {
      bg: 'bg-teal-100/10 dark:bg-teal-900/15',
      text: 'text-teal-800 dark:text-teal-200',
    },
    {
      bg: 'bg-orange-100/10 dark:bg-orange-900/15',
      text: 'text-orange-800 dark:text-orange-200',
    },
    {
      bg: 'bg-cyan-100/10 dark:bg-cyan-900/15',
      text: 'text-cyan-800 dark:text-cyan-200',
    },
  ];

  // Hash simples para garantir cor consistente por categoria
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash + category.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Extrai estatísticas de um texto
 * @param {string} text - Texto que sera analisado
 * @returns {{chars:number, words:number, estTokens:number}} - Um objeto contendo quantidade de caracteres, quantidade de palavras e estimativa de tokes OpenAI rule: ~4 chars per token
 */
export const getStatsTextInfo = (text) => {
  const stats = {
    chars: 0,
    words: 0,
    estTokens: 0,
  };

  if (text.trim() === '') return stats;

  // 1. Caracteres
  stats.chars = text.length;

  // 2. Palavras (Split por whitespace)
  stats.words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  // 3. Tokens (Estimativa heurística)
  // OpenAI rule: ~4 chars per token.
  // Para maior precisão em código/português, podemos ser conservadores e usar 3.5 ou manter 4.
  stats.estTokens = Math.ceil(stats.chars / 4);

  return stats;
};

/**
 * Deep Nebula Console Experience
 * Tema: Violet/Zinc
 * Trigger: Digitar "god" (God Mode)
 */
export function generateWelcome() {
  // Cores do Tema Deep Nebula (Hardcoded para o Console)
  const theme = {
    zinc900: '#18181b',
    zinc500: '#71717a',
    zinc200: '#e4e4e7',
    violet500: '#8b5cf6',
    violet900: '#4c1d95',
  };

  const styles = {
    // Título Principal
    titulo: `font-family: monospace; font-size: 20px; font-weight: 900; color: ${theme.violet500}; text-shadow: 0 0 15px ${theme.violet900}; line-height: 1.2;`,
    
    // Subtítulo
    subtitulo: `font-family: sans-serif; font-size: 14px; color: ${theme.zinc500}; margin-bottom: 10px;`,
    
    // Caixa da Charada (Parecida com o Blockquote do App)
    charadaBox: `
      font-family: monospace;
      font-size: 13px;
      color: ${theme.zinc200};
      background: ${theme.zinc900};
      border: 1px solid ${theme.zinc500};
      border-left: 3px solid ${theme.violet500};
      padding: 10px 15px;
      border-radius: 4px;
      line-height: 1.5;
    `,
    
    // Destaques no texto
    label: `color: ${theme.violet500}; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;`,
    
    // Rodapé
    hint: `color: ${theme.zinc500}; font-style: italic; font-size: 11px; margin-top: 5px;`
  };

  const banner = `
::::::::::. :::::::..       ...     .        :::::::::::. ::::::::::::
 \`;;;\`\`\`.;;;;;;;\`\`;;;;   .;;;;;;;.  ;;,.    ;;;\`;;;\`\`\`.;;;;;;;;;;;''''
  \`]]nnn]]'  [[[,\/[[['  ,[[     \\[[,[[[[, ,[[[[,\`]]nnn]]'      [[     
   $$$""     $$$$$$c    $$$,     $$$$$$$$$$$"$$$ $$$""         $$     
   888o      888b "88bo,"888,_ _,88P888 Y88" 888o888o          88,    
   YMMMb     MMMM   "W"   "YMMMMMP" MMM  M'  "MMMYMMMb         MMM    

`;

  const mensagem = `
%c${banner}
%cSYSTEM READY. v1.0.0

%c⚡ ACESSO RESTRITO DETECTADO

%c"Eu criei tudo, vejo tudo, mas não existo.
Três letras me definem, mas sou infinito.
 Digite meu nome e o sistema será seu."%c\n\n💡 Dica: Quem programa o universo?

%c⌨️  Mantenha a janela ativa e digite a resposta.
`;

  console.log(
    mensagem,
    styles.titulo,       // Banner ASCII
    styles.subtitulo,    // System Ready
    styles.label,        // Acesso Restrito
    styles.charadaBox,   // A Charada
    styles.hint,         // Dica
    styles.subtitulo     // Instrução final
  );
}

export const presentEasterEgg = () => {
  console.clear();
  
  const theme = {
    violet500: '#8b5cf6',
    zinc200: '#e4e4e7',
    zinc500: '#71717a',
  };

  console.log(
    `%c✨ GOD MODE ACTIVATED ✨\n\n` +
    `%cPrivilégios de Administrador: %cCONCEDIDOS\n` +
    `%cRecursos Infinitos: %cATIVOS\n\n` +
    `%c"Com grandes poderes, vem a necessidade de escrever prompts melhores."\n` +
    `%c Aproveite a onipotência. O estado global da aplicação esta a sua disposição`,

    `font-size: 20px; font-weight: bold; color: ${theme.violet500}; text-shadow: 0 0 10px ${theme.violet500};`, // Título
    `color: ${theme.zinc500}; font-size: 12px;`, // Label
    `color: ${theme.zinc200}; font-weight: bold; font-size: 12px;`, // Valor
    `color: ${theme.zinc500}; font-size: 12px;`, // Label
    `color: ${theme.zinc200}; font-weight: bold; font-size: 12px;`, // Valor
    `color: ${theme.zinc200}; font-style: italic; margin-top: 10px; display: block; border-left: 2px solid ${theme.violet500}; padding-left: 10px;`, // Quote
    `color: ${theme.zinc500}; font-size: 10px; margin-top: 5px;` // Footer
  );
};