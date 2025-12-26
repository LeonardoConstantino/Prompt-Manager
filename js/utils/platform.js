export let metaKey = 'Ctrl'; // Label para exibição
export let metaKeyName = 'Control'; // Nome para eventos de teclado (event.key)
export let isMac = false;
export let isMobile = false

/**
 * Detecta o sistema operacional e ajusta as variáveis globais
 * Deve ser chamado no init() da aplicação
 */
export const detectOS = () => {
  if (typeof navigator !== 'undefined') {
    // Verifica se é Mac (macOS, iPhone, iPad)
    // navigator.platform é deprecated mas ainda o método mais confiável cross-browser para isso
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();
    
    isMac = platform.includes('mac') || userAgent.includes('mac os');

    if (isMac) {
      metaKey = '⌘';        // Símbolo bonito para UI
      metaKeyName = 'Meta'; // Nome técnico do evento JS
    } else {
      metaKey = 'Ctrl';
      metaKeyName = 'Control';
    }
  }
};

/**
 * Verifica se o dispositivo atual é um dispositivo móvel.
 */
export const detectIsMobile = () => {
  // Verifica se o user agent contém 'Mobi' ou 'Android' ou se a largura da janela é menor ou igual a 768 pixels.
  isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768
}