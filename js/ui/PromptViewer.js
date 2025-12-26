import eventBus from '../utils/eventBus.js';
import { MarkdownParser } from '../utils/markdown.js';
import { getIcon } from '../utils/Icons.js';
import { toast } from '../utils/Toast.js';
import VariableFiller from './VariableFiller.js';
import { confirmModal } from './ConfirmModal.js';
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

    eventBus.on('ui:trigger-edit', () => {
      if (this.currentPrompt) {
        eventBus.emit('prompt:edit', { id: this.currentPrompt.id });
      }
    });

    eventBus.on('ui:trigger-delete', () => {
      if (this.currentPrompt) {
        // Reutiliza lógica do botão
        const btnDelete = this.container.querySelector('#btn-delete');
        if (btnDelete) btnDelete.click();
      }
    });
  }

  update(prompt) {
    this.currentPrompt = prompt;
    this.render();
  }

  renderPlaceholder() {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center select-none animate-fade-in">
        
        <!-- Círculo decorativo para o ícone -->
        <div class="mb-6 p-5 rounded-full bg-bg-surface border border-border-subtle shadow-sm">
            ${getIcon('placeholder', 'w-12 h-12 text-text-muted opacity-40')}
        </div>
        
        <h2 class="text-lg font-medium text-text-main tracking-tight">Nenhum prompt selecionado</h2>
        
        <p class="text-sm text-text-muted mt-2 max-w-xs leading-relaxed">
          Selecione um item na barra lateral para ver os detalhes, editar ou executar ações.
        </p>
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
        <button 
            class="btn btn-secondary py-1.5 px-3 text-xs gap-2 group shadow-sm" 
            data-url="${link.url}" 
            title="Copiar e abrir ${link.name}"
        >
            <!-- Ícone muda de cor no hover do botão -->
            ${getIcon(
              'external-link',
              'w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors duration-200'
            )}
            
            <span class="font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                ${link.name}
            </span>
        </button>
    `
      )
      .join('');

    this.container.innerHTML = `
      <div class="flex flex-col h-full bg-bg-app transition-colors duration-300">
        
        <!-- HEADER: Painel de Controle (Surface) -->
        <div class="px-8 py-6 border-b border-border-subtle bg-bg-surface shadow-sm z-10">
          <div class="flex justify-between items-start mb-5 gap-4">
            <!-- Título com tracking ajustado para modernidade -->
            <h1 class="text-3xl font-bold text-text-main tracking-tight leading-tight">${name}</h1>
            
            <!-- Grupo de Ações Principais -->
            <div class="flex items-center gap-2 shrink-0">
              <button id="btn-edit" class="btn btn-primary shadow-lg shadow-accent/20">
                 ${getIcon('edit', 'w-4 h-4')} <span>Editar</span>
              </button>
              
              <button id="btn-history" class="btn btn-secondary">
                 ${getIcon('clock', 'w-4 h-4')} <span>Histórico</span>
              </button>
              
              <!-- Botão Deletar: Estilo 'Danger Ghost' -->
              <button id="btn-delete" class="btn border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-colors" title="Deletar Prompt">
                 ${getIcon('trash', 'w-4 h-4')}
              </button>
            </div>
          </div>
          
          <!-- Descrição: Leitura confortável -->
          <p class="text-text-muted text-base leading-relaxed mb-5 max-w-4xl">
            ${
              description ||
              '<span class="italic opacity-50">Nenhuma descrição fornecida.</span>'
            }
          </p>
          
          <!-- Meta Dados: Tags e Data -->
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap gap-2">
              ${tags
                .map((tag) => {
                  const colors = getCategoryColor(tag);
                  // Usando o estilo 'Badge' atualizado (sem borda extra aqui, pois getCategoryColor já traz borda)
                  return `<span class="text-xs ${colors.bg} ${colors.text} px-2.5 py-0.5 rounded-md font-medium select-none cursor-default">${tag}</span>`;
                })
                .join('')}
            </div>
            
            <div class="text-xs font-mono text-text-muted flex items-center gap-2 opacity-80">
                ${getIcon('calendar', 'w-3 h-3')}
                <span>Atualizado: ${formatDate(updatedAt, true)}</span>
            </div>
          </div>
        </div>

        <!-- TOOLBAR: Barra de Ferramentas Técnica -->
        <!-- Sticky top para ficar visível ao rolar o conteúdo longo -->
        <div class="px-8 py-2 bg-bg-app/95 backdrop-blur border-b border-border-subtle flex flex-wrap gap-4 justify-between items-center sticky top-0 z-20">
          <div class="flex items-center gap-3">
             ${
               runButtonsHtml.length > 0
                 ? `<span class="text-[10px] uppercase font-bold text-text-muted tracking-widest select-none">Executar</span>
             <!-- Separador vertical -->
             <div class="h-4 w-px bg-border-subtle"></div>
             ${runButtonsHtml}`
                 : '<span class="text-xs text-text-muted italic select-none">Nenhuma integração Click-to-Run configurada.</span>'
             }
          </div>
          
          <div class="flex items-center gap-1">
            <button id="btn-copy" class="btn btn-ghost px-3 py-1.5 text-xs gap-2 text-accent hover:bg-accent/20 transition-colors font-medium">
               ${getIcon('copy', 'w-4 h-4')} <span>Copiar Texto</span>
            </button>

            <button id="btn-download" class="btn btn-ghost px-3 py-1.5 text-xs gap-2 opacity-80 hover:opacity-100">
                ${getIcon('download', 'w-4 h-4')} <span>Baixar .md</span>
            </button>
          </div>
        </div>

        <!-- CONTENT: Área de Leitura -->
        <!-- Adicionei max-w-4xl e mx-auto para evitar linhas de texto muito longas que cansam a leitura -->
        <div class="flex-1 overflow-y-auto p-8 md:px-12 bg-bg-app w-full scroll-smooth">
          <article class="prompt-content max-w-5xl mx-auto text-text-main leading-7">
             ${htmlContent}
          </article>
          
          <!-- Espaço extra no final para scroll confortável -->
          <div class="h-20"></div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    this.container.querySelector('#btn-edit').onclick = () => {
      eventBus.emit('prompt:edit', { id: this.currentPrompt.id });
    };

    this.container.querySelector('#btn-delete').onclick = async () => {
      const confirmed = await confirmModal.ask(
          'Excluir Prompt?',
          'Esta ação é irreversível. O prompt e todo o histórico de versões serão apagados permanentemente.',
          { variant: 'danger', confirmText: 'Sim, excluir' }
      );

      if (confirmed) {
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
