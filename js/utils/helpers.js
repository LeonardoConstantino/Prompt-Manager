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
 * Formata data ISO para formato legível usando API Intl
 * @param {string} isoString - Data em formato ISO
 * @param {boolean} includeTime - Incluir horário (padrão: false)
 * @param {boolean} isRelative - Retornar tempo relativo (padrão: false)
 * @param {string} locale - Código de localidade (padrão: 'pt-BR')
 * @returns {string} Data formatada
 */
export function formatDate(isoString, includeTime = false, isRelative = false, locale = 'pt-BR') {
  // Validação de entrada
  if (!isoString) {
    throw new Error('isoString é obrigatório');
  }

  const date = new Date(isoString);

  // Validação de data válida
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }

  // Modo relativo: retorna tempo relativo à data atual
  if (isRelative) {
    return formatRelativeTime(date, locale);
  }

  // Modo absoluto: formata data usando Intl.DateTimeFormat
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  // Adiciona horário se solicitado
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false; // Formato 24h
  }

  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
}

/**
 * Formata tempo relativo usando Intl.RelativeTimeFormat
 * @param {Date} date - Data a ser formatada
 * @param {string} locale - Código de localidade
 * @returns {string} Tempo relativo formatado
 */
function formatRelativeTime(date, locale = 'pt-BR') {
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInSeconds = Math.round(diffInMs / 1000);
  const diffInMinutes = Math.round(diffInSeconds / 60);
  const diffInHours = Math.round(diffInMinutes / 60);
  const diffInDays = Math.round(diffInHours / 24);
  const diffInMonths = Math.round(diffInDays / 30);
  const diffInYears = Math.round(diffInDays / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, {
  localeMatcher: "best fit", // outros valores: "lookup"
  numeric: "always", // outros valores: "auto"
  style: "long", // outros valores: "short" ou "narrow"
});

  // Determina a unidade mais apropriada baseada na diferença
  if (Math.abs(diffInYears) >= 1) {
    return rtf.format(diffInYears, 'year');
  } else if (Math.abs(diffInMonths) >= 1) {
    return rtf.format(diffInMonths, 'month');
  } else if (Math.abs(diffInDays) >= 1) {
    return rtf.format(diffInDays, 'day');
  } else if (Math.abs(diffInHours) >= 1) {
    return rtf.format(diffInHours, 'hour');
  } else if (Math.abs(diffInMinutes) >= 1) {
    return rtf.format(diffInMinutes, 'minute');
  } else {
    return rtf.format(diffInSeconds, 'second');
  }
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
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-200',
    },
    {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-200',
    },
    {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-800 dark:text-purple-200',
    },
    {
      bg: 'bg-pink-100 dark:bg-pink-900',
      text: 'text-pink-800 dark:text-pink-200',
    },
    {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
    {
      bg: 'bg-indigo-100 dark:bg-indigo-900',
      text: 'text-indigo-800 dark:text-indigo-200',
    },
    {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-200',
    },
    {
      bg: 'bg-teal-100 dark:bg-teal-900',
      text: 'text-teal-800 dark:text-teal-200',
    },
    {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-200',
    },
    {
      bg: 'bg-cyan-100 dark:bg-cyan-900',
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