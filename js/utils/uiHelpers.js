import { getIcon } from './Icons.js'; // Reutiliza seus ícones centralizados

/**
 * Anima um botão com feedback de estado (Sucesso/Erro) sem quebrar o layout.
 *
 * @param {HTMLElement} element - O elemento a ser animado (botão ou ícone)
 * @param {Partial<{text: string, icon: string, type: 'success'|'error', duration: number}>} options - Configurações opcionais
 * options.text - Texto temporário (ex: "Copiado!")
 * options.icon - Nome do ícone no Icons.js (ex: 'check-circle')
 * options.type - Tipo de feedback visual
 * options.duration - Duração em ms (default: 2000)
 */
export const animateButtonFeedback = (
  element,
  {
    text = 'Sucesso!',
    icon = 'check-circle',
    type = 'success',
    duration = 2000,
  } = {}
) => {
  // Garante que pegamos o botão, mesmo se passar o ícone
  const btn = element?.closest('button') || element;

  if (!btn) {
    console.error('animateButtonFeedback: Elemento inválido', element);
    return;
  }
  // 1. Debounce: Evita cliques duplos/animações sobrepostas
  if (btn.dataset?.animating) return;
  btn.dataset.animating = 'true';

  // 2. Snapshot do Estado Original
  const originalHTML = btn.innerHTML;
  const originalWidth = btn.getBoundingClientRect().width;
  const originalClasses = [...btn.classList]; // Cópia do array de classes

  // 3. Travar Largura (Evita Layout Shift)
  // Força o botão a manter a largura exata do estado anterior
  btn.style.width = `${originalWidth}px`;
  // Garante que o conteúdo centralize se o texto for menor
  btn.style.justifyContent = 'center';

  // 4. Definir Estilos baseados no Tipo
  const styles = {
    success: [
      'bg-emerald-500/10',
      'text-emerald-500',
      'border-emerald-500/20',
      '!border',
    ],
    error: ['bg-red-500/10', 'text-red-500', 'border-red-500/20', '!border'],
  };

  // Classes conflitantes comuns que queremos remover temporariamente
  // (Adapte conforme suas classes padrão: bg-gray-*, hover:*, etc)
  const conflictingClasses = [
    'btn-ghost',
    'text-accent',
    'hover:bg-accent/20',
    'hover:bg-gray-600',
    'hover:bg-blue-700',
    'hover:text-white',
    'bg-gray-700',
    'bg-blue-600',
    'text-gray-200',
    'text-gray-400',
  ];

  // 5. Aplicar Transformação
  btn.classList.remove(...conflictingClasses);
  btn.classList.add(
    ...styles[type],
    'transition-all',
    'duration-200',
    'scale-105'
  ); // Scale dá um "pop"

  // Troca conteúdo (Ícone + Texto)
  btn.innerHTML = `
    ${getIcon(icon, 'w-4 h-4 mr-1.5 animate-bounce')} 
    <span class="font-medium">${text}</span>
  `;

  // 6. Reverter (Cleanup)
  setTimeout(() => {
    // Fade out suave (opcional, requer CSS extra, aqui faremos direto)

    // Restaura classes originais
    btn.className = ''; // Limpa tudo
    btn.classList.add(...originalClasses); // Re-adiciona originais

    // Restaura conteúdo e remove estilos inline
    btn.innerHTML = originalHTML;
    btn.style.width = '';
    btn.style.justifyContent = '';

    delete btn.dataset.animating;
  }, duration);
};
