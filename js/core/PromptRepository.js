/**
 * Camada de acesso a dados para prompts
 * Gerencia CRUD, versões, busca e persistência
 */

/**
 * @typedef {object} Prompt
 * @property {string} id - UUID v4
 * @property {string} name - Título do prompt
 * @property {string} description - Descrição curta
 * @property {string[]} tags - Array de tags para busca/filtro
 * @property {string} content - Conteúdo markdown completo atual
 * @property {string} createdAt - ISO 8601 timestamp
 * @property {string} updatedAt - ISO 8601 timestamp
 * @property {boolean} isFavorite - Flag para favoritos (futuro)
 */

/**
 * @typedef {object} TextDiffObject
 * @property {Array<{newIndex: number, content: string}>} added - Linhas adicionadas
 * @property {Array<{oldIndex: number}>} removed - Linhas removidas
 * @property {Array<{oldIndex: number, newIndex: number, oldContent: string, newContent: string}>} modified - Linhas modificadas
 * @property {object} stats - Estatísticas do diff
 * @property {number} stats.linesAdded - Número de linhas adicionadas
 * @property {number} stats.linesRemoved - Número de linhas removidas
 * @property {number} stats.linesModified - Número de linhas modificadas
 * @property {number} stats.totalChanges - Total de mudanças (adicionadas + removidas + modificadas)
 */

/**
 * @typedef {object} Version
 * @property {string} id - UUID v4
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {TextDiffObject} diff - Resultado de TextDiff.calculate()
 * @property {string} note - Nota opcional da versão
 */

/**
 * @typedef {object} Config
 * @property {string|null} lastBackup - Timestamp do último backup
 * @property {object} preferences - Preferências do usuário
 * @property {'light'|'dark'} preferences.theme - Tema da aplicação
 * @property {number} preferences.editorFontSize - Tamanho da fonte do editor
 * @property {string[]} searchHistory - Últimas buscas (opcional)
 */

import { IndexedDBStorage } from '../lib/IndexedDBStorage.js';
import TextDiff from '../lib/TextDiff.js';
import eventBus from '../utils/eventBus.js';
import { generateUUID, sanitizeTags } from '../utils/helpers.js';

const INITIAL_DATA = {
  prompts: [],
  versions: {},
  config: {
    lastBackup: null,
    preferences: {
      theme: 'dark',
      editorFontSize: 14,
    },
    searchHistory: [],
  },
};

const MAX_VERSIONS = 50;

class PromptRepository {
  constructor() {
    this.storage = null;
    this.initialized = false;
  }

  /**
   * Wrapper para executar operações com feedback visual
   * @param {Function} operation - Função assíncrona a executar
   * @param {'boot'|'background'} type - Tipo de loading
   */
  async _executeWithLoading(operation, type = 'background') {
    eventBus.emit('app:loading:start', { type });
    try {
      // Pequeno delay artificial (opcional) para evitar "flicker" em operações muito rápidas (<50ms)
      // mas como é IndexedDB real, geralmente é instantâneo.
      // Vamos manter direto para máxima performance.
      return await operation();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    } finally {
      // Verifica se o storage ainda diz que está carregando (dupla checagem)
      // Se não, emite fim.
      if (!this.storage.isLoading()) {
        eventBus.emit('app:loading:end');
      }
    }
  }

  /**
   * Inicializa o repository e carrega dados
   */
  async initialize() {
    return this._executeWithLoading(async () => {
      if (this.initialized) return;

      try {
        this.storage = new IndexedDBStorage(
          'prompt-manager-data',
          INITIAL_DATA
        );
        await this.storage.initialize();
        this.initialized = true;

        // RECURSO AVANÇADO: Subscribe para sincronia reativa (Cross-Tab sync)
        // O IndexedDBStorage internamente usa BroadcastChannel para notificar mudanças
        this.unsubscribe = this.storage.subscribe(
          /**@type {function(object)}*/ (newData) => {
            // Quando o dado muda (seja por esta aba ou outra), notificamos o EventBus
            // O parametro 'newData' já é o valor atualizado do store
            eventBus.emit('data:sync', newData);
          }
        );
      } catch (error) {
        console.error('Failed to initialize PromptRepository:', error);
        throw error;
      }
    }, 'boot');
  }

  // Helper para garantir acesso seguro
  _getData() {
    if (!this.storage?.isInitialized())
      throw new Error('Repository not initialized');
    return this.storage.getValue();
  }

  /**
   * Toggle Favorito (Nova Feature)
   * @param {string} id - ID do prompt
   * @returns {Promise<boolean>} Novo estado de favorito
   */
  async toggleFavorite(id) {
    return this._executeWithLoading(async () => {
      const currentData = this._getData();
      const prompt = currentData.prompts.find((p) => p.id === id);

      if (prompt) {
        prompt.isFavorite = !prompt.isFavorite;
        // O setValue dispara o subscribe internamente
        await this.storage?.setValue(currentData);

        // Emitimos evento específico para UI atualizar pontualmente
        eventBus.emit('prompt:updated', { prompt });
        return prompt.isFavorite;
      }
      return false;
    }, 'background');
  }

  /**
   * Obtém todos os prompts
   * @returns {Prompt[]} Array de prompts
   */
  getAllPrompts() {
    this.#ensureInitialized();
    const data = this.storage?.getValue() || INITIAL_DATA;
    return data.prompts || [];
  }

  /**
   * Obtém prompt por ID
   * @param {string} id - ID do prompt
   * @returns {Prompt|null} Prompt ou null se não encontrado
   */
  getPromptById(id) {
    this.#ensureInitialized();
    const prompts = this.getAllPrompts();
    return prompts.find((p) => p.id === id) || null;
  }

  /**
   * Cria novo prompt
   * @param {Partial<Prompt>} data - Dados do prompt { name, description, tags, content }
   * @returns {Promise<Prompt>} Prompt criado
   */
  async createPrompt(data) {
    return this._executeWithLoading(async () => {
      this.#ensureInitialized();
      const totalPromptsCount = this.getAllPrompts().length;

      const now = new Date().toISOString();
      const prompt = {
        id: generateUUID(),
        name: data.name?.trim() || `Novo Prompt ${totalPromptsCount + 1}`,
        description: (data.description || '').trim(),
        tags: sanitizeTags(data.tags || []),
        content: data.content?.trim() || '',
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
      };

      // Cria primeira versão (sem diff, conteúdo completo)
      const firstVersion = {
        id: generateUUID(),
        timestamp: now,
        diff: null, // Versão inicial não tem diff
        note: 'Versão inicial',
      };

      const currentData = this.storage?.getValue() || INITIAL_DATA;
      currentData.prompts.push(prompt);
      currentData.versions[prompt.id] = [firstVersion];

      await this.storage?.setValue(currentData);

      eventBus.emit('prompt:created', { prompt });

      return prompt;
    }, 'background');
  }

  /**
   * Atualiza prompt existente
   * @param {string} id - ID do prompt
   * @param {Partial<Prompt>} data - Dados a atualizar
   * @param {boolean} saveVersion - Se deve salvar nova versão
   * @param {string} note - Nota da versão (opcional)
   * @returns {Promise<Prompt>} Prompt atualizado
   */
  async updatePrompt(id, data, saveVersion = false, note = '') {
    return this._executeWithLoading(async () => {
      this.#ensureInitialized();

      const currentData = this.storage?.getValue() || INITIAL_DATA;
      const promptIndex = currentData.prompts.findIndex(
        /**@param {Prompt} p */
        (p) => p.id === id
      );

      if (promptIndex === -1) {
        throw new Error('Prompt not found');
      }

      const oldPrompt = currentData.prompts[promptIndex];
      const newContent =
        data.content !== undefined ? data.content : oldPrompt.content;
      const now = new Date().toISOString();

      // Se solicitado versionamento E houve mudança de conteúdo
      if (saveVersion && newContent !== oldPrompt.content) {
        // Calcula o Diff: O que mudou do Antigo para o Novo?
        // oldText -> apply(diff) -> newText
        const diff = TextDiff.calculate(oldPrompt.content, newContent);

        const version = {
          id: generateUUID(),
          timestamp: now,
          diff: diff,
          note: note.trim() || 'Atualização',
        };

        if (!currentData.versions[id]) currentData.versions[id] = [];

        // Adiciona nova versão no final (ordem cronológica no banco)
        currentData.versions[id].push(version);

        // FIFO: Remove antigas se exceder limite
        if (currentData.versions[id].length > MAX_VERSIONS) {
          currentData.versions[id].shift(); // Remove a primeira (mais antiga)
        }

        eventBus.emit('version:created', { promptId: id, version });
      }

      // Atualiza o objeto Prompt com o texto novo completo
      const updatedPrompt = {
        ...oldPrompt,
        ...data,
        tags: data.tags ? sanitizeTags(data.tags) : oldPrompt.tags,
        content: newContent,
        updatedAt: now,
      };

      currentData.prompts[promptIndex] = updatedPrompt;
      await this.storage?.setValue(currentData);
      eventBus.emit('prompt:updated', { prompt: updatedPrompt });

      return updatedPrompt;
    }, 'background');
  }

  /**
   * Deleta prompt
   * @param {string} id - ID do prompt
   * @returns {Promise<void>}
   */
  async deletePrompt(id) {
    return this._executeWithLoading(async () => {
      this.#ensureInitialized();

      const currentData = this.storage?.getValue() || INITIAL_DATA;

      currentData.prompts = currentData.prompts.filter(
        /** @param {Prompt} p */
        (p) => p.id !== id
      );
      delete currentData.versions[id];

      await this.storage?.setValue(currentData);

      eventBus.emit('prompt:deleted', { id });
    }, 'background');
  }

  /**
   * Busca prompts por query e tags
   * @param {string} query - Texto a buscar (nome/descrição)
   * @param {string[]} tags - Tags para filtrar
   * @returns {Prompt[]} Prompts encontrados
   */
  searchPrompts(query = '', tags = []) {
    this.#ensureInitialized();

    let prompts = this.getAllPrompts();

    // Filtro por query (nome e descrição)
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      prompts = prompts.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery)
      );
    }

    // Filtro por tags
    if (tags.length > 0) {
      const lowerTags = tags.map((t) => t.toLowerCase());
      prompts = prompts.filter((p) =>
        lowerTags.some((tag) => p.tags.includes(tag))
      );
    }

    return prompts;
  }

  /**
   * Obtém todas as tags únicas
   * @returns {string[]} Array de tags
   */
  getAllTags() {
    this.#ensureInitialized();

    const prompts = this.getAllPrompts();
    const tagsSet = new Set();

    prompts.forEach((p) => {
      p.tags.forEach((tag) => tagsSet.add(tag));
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Obtém versões de um prompt
   * @param {string} promptId - ID do prompt
   * @returns {Version[]} Array de versões (mais recente primeiro)
   */
  getVersions(promptId) {
    this.#ensureInitialized();

    const currentData = this.storage?.getValue() || INITIAL_DATA;
    const versions = currentData.versions[promptId] || [];

    // Retorna em ordem reversa (mais recente primeiro)
    return [...versions].reverse();
  }

  /**
   * Aplica (restaura) uma versão específica
   * Lógica de Time Travel (Restaurar)
   * Estratégia: Pegar o conteúdo atual e aplicar 'revert' sequencialmente
   * voltando no tempo até chegar na versão desejada.
   * @param {string} promptId - ID do prompt
   * @param {string} versionId - ID da versão
   * @returns {Promise<Prompt>} Prompt atualizado
   */
  async applyVersion(promptId, versionId) {
    this.#ensureInitialized();

    const prompt = this.getPromptById(promptId);
    if (!prompt) throw new Error('Prompt not found');

    const currentData = this.storage?.getValue() || INITIAL_DATA;
    // Versões em ordem cronológica (Antiga -> Nova)
    const versions = currentData.versions[promptId] || [];

    // Encontrar índice da versão alvo
    const targetIndex = versions.findIndex(
      /** @param {Version} v */ (v) => v.id === versionId
    );
    if (targetIndex === -1) throw new Error('Version not found');

    // Começamos com o conteúdo ATUAL do prompt (que corresponde conceitualmente à "última versão")
    let rebuiltContent = prompt.content;

    // Precisamos desfazer as mudanças da última versão até chegar na versão alvo.
    // Loop de trás para frente, parando APÓS processar a versão seguinte à alvo.
    // Ex: Temos V1, V2, V3. Estamos em V3. Queremos V1.
    // 1. Revert V3 (diff de V2->V3). Resultado: V2.
    // 2. Revert V2 (diff de V1->V2). Resultado: V1.
    // Pare.

    for (let i = versions.length - 1; i > targetIndex; i--) {
      const version = versions[i];
      if (version.diff) {
        // TextDiff.revert(textoModificado, diffQueGerouModificado) -> textoOriginal
        rebuiltContent = TextDiff.revert(rebuiltContent, version.diff);
      }
    }

    // Salva o resultado como o estado atual do prompt
    // Cria uma NOVA versão indicando a restauração (preservando o histórico linear)
    const targetVersionData = versions[targetIndex];
    const note = `Restaurado de: ${new Date(
      targetVersionData.timestamp
    ).toLocaleString()}`;

    return await this.updatePrompt(
      promptId,
      { content: rebuiltContent },
      true,
      note
    );
  }

  /**
   * Deleta uma versão específica
   * @param {string} promptId - ID do prompt
   * @param {string} versionId - ID da versão
   * @returns {Promise<void>}
   */
  async deleteVersion(promptId, versionId) {
    return this._executeWithLoading(async () => {
    this.#ensureInitialized();

    const currentData = this.storage?.getValue() || INITIAL_DATA;

    if (!currentData.versions[promptId]) {
      throw new Error('No versions found for this prompt');
    }

    // Não permite deletar a versão inicial
    if (currentData.versions[promptId].length === 1) {
      throw new Error('Cannot delete the initial version');
    }

    currentData.versions[promptId] = currentData.versions[promptId].filter(
      /** @param {Version} v */
      (v) => v.id !== versionId
    );

    await this.storage?.setValue(currentData);

    eventBus.emit('version:deleted', { promptId, versionId });
    }, 'background');
  }

  /**
   * Obtém configurações
   * @returns {Config} Configurações atuais
   */
  getConfig() {
    this.#ensureInitialized();

    const data = this.storage?.getValue() || INITIAL_DATA;
    return data.config || INITIAL_DATA.config;
  }

  /**
   * Atualiza configurações
   * @param {Partial<Config>} updates - Campos a atualizar
   * @returns {Promise<Config>} Configurações atualizadas
   */
  async updateConfig(updates) {
    return this._executeWithLoading(async () => {
      this.#ensureInitialized();

      const currentData = this.storage?.getValue() || INITIAL_DATA;
      currentData.config = {
        ...currentData.config,
        ...updates,
        preferences: {
          ...currentData.config.preferences,
          ...(updates.preferences || {}),
        },
      };

      await this.storage?.setValue(currentData);

      // Emite evento para a UI reagir imediatamente
      eventBus.emit('config:updated', currentData.config);
    }, 'background');
  }

  /**
   * Obtém dados completos (para backup)
   * @returns {object} Dados completos
   */
  getFullData() {
    this.#ensureInitialized();
    return this.storage?.getValue() || INITIAL_DATA;
  }

  /**
   * Substitui todos os dados (para importação)
   * @param {object} data - Dados completos
   * @returns {Promise<void>}
   */
  async setFullData(data) {
    return this._executeWithLoading(async () => {
    this.#ensureInitialized();
    await this.storage?.setValue(data);
    eventBus.emit('data:imported', {});
    }, 'boot');
  }

  /**
   * Verifica se está inicializado
   */
  #ensureInitialized() {
    if (!this.initialized) {
      throw new Error(
        'PromptRepository not initialized. Call initialize() first.'
      );
    }
  }
}

export default PromptRepository;
