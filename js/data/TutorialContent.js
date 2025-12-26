export const TUTORIAL_SECTIONS = [
  {
    id: 'variables',
    title: 'Variáveis Dinâmicas',
    icon: 'code',
    content:
      'Transforme prompts estáticos em templates reutilizáveis. Use chaves duplas como <code>{{idioma}}</code> ou <code>{{texto}}</code> para criar campos de preenchimento automático ao copiar.',
    imagePlaceholder: 'Exemplo: Modal de preenchimento de variáveis',
  },
  {
    id: 'versions',
    title: 'Viajante do Tempo',
    icon: 'clock',
    content:
      'Nunca perca uma ideia. Toda vez que você salva uma edição, criamos uma nova versão. Use o Histórico para comparar alterações (Diff) e restaurar versões antigas.',
    imagePlaceholder: 'Exemplo: Visualização de Diff colorido',
  },
  {
    id: 'click-run',
    title: 'Click-to-Run',
    icon: 'lightning',
    content:
      'Integração direta com suas IAs favoritas. Configure URLs nas Configurações e use os botões de ação rápida para copiar o prompt e abrir o ChatGPT ou Claude em uma nova aba instantaneamente.',
    imagePlaceholder: 'Exemplo: Botões de ação na barra de ferramentas',
  },
  {
    id: 'tags',
    title: 'Organização com Tags',
    icon: 'tag',
    content:
      'Filtre sua biblioteca rapidamente. Clique no ícone de tag na barra lateral para ativar o "Modo Nuvem" e combinar múltiplos filtros para encontrar exatamente o que precisa.',
    imagePlaceholder: 'Exemplo: Nuvem de tags ativa na sidebar',
  },
];

export const FAQ_ITEMS = [
  {
    q: 'Onde meus dados são salvos?',
    a: 'Tudo fica salvo localmente no seu navegador usando IndexedDB. Nada é enviado para servidores externos. Seus prompts são 100% privados.',
  },
  {
    q: 'Posso usar Markdown?',
    a: 'Sim! O editor suporta Markdown completo, incluindo blocos de código com syntax highlighting.',
  },
  {
    q: 'Como faço backup?',
    a: 'Use o botão de Exportar na barra superior regularmente. Isso gera um arquivo JSON que você pode guardar ou importar em outro computador.',
  },
];

export const PRO_TIPS = [
  '⚡ <strong>Power User:</strong> Use <strong>Ctrl+N</strong> para criar, <strong>Ctrl+S</strong> para salvar e <strong>Ctrl+E</strong> para editar o prompt selecionado.',
  '🔍 <strong>Navegação Rápida:</strong> Pressione <strong>/</strong> para focar na busca e use as <strong>Setas do Teclado</strong> para navegar pela lista sem usar o mouse.',
  '🎯 <strong>Variáveis:</strong> Use chaves duplas como <code>{{tópico}}</code> para que o sistema peça o preenchimento automático ao copiar.',
  '🚀 <strong>Automação:</strong> Configure links <strong>Click-to-Run</strong> nas configurações para abrir o ChatGPT ou Claude automaticamente após copiar.'
];
