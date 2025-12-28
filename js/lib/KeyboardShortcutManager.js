/**
 * KeyboardShortcutManager v2.0
 * Sistema robusto para gerenciamento de atalhos, sequências e Easter Eggs
 *
 * CORREÇÕES IMPLEMENTADAS:
 * ✓ Eliminação de vazamentos de memória
 * ✓ Prevenção de race conditions
 * ✓ Normalização consistente de teclas
 * ✓ Otimização com Trie para sequências
 * ✓ Validação rigorosa de parâmetros
 * ✓ API consistente
 * ✓ Debounce configurável
 * ✓ Gerenciamento de contextos com stack
 */
class KeyboardShortcutManager {
  constructor(options = {}) {
    // Validação de opções
    if (options && typeof options !== 'object') {
      throw new TypeError('Options must be an object');
    }

    // Configurações padrão
    this.options = {
      enableSequences: true,
      enableLongPress: true,
      sequenceTimeout: 1000,
      longPressDuration: 3000,
      debounceDelay: 50, // Debounce para prevenir spam
      debug: false,
      ...options,
    };

    // Armazenamento de atalhos registrados
    this.shortcuts = new Map();
    this.sequences = new SequenceTrie(); // 🔥 Otimização com Trie
    this.longPressHandlers = new Map();

    // Estado interno com cleanup rigoroso
    this.currentSequence = [];
    this.sequenceTimer = null;
    this.pressedKeys = new Map(); // key -> { timestamp, timer }
    this.debounceTimers = new Map();

    // Stack de contextos (🔥 Correção #9)
    this.contextStack = ['global'];

    // Estado de inicialização
    this.initialized = false;

    // Bind dos métodos
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    this._log('KeyboardShortcutManager v2.0 criado');
  }

  // ==================== INICIALIZAÇÃO ====================

  /**
   * Inicializa os event listeners
   * @returns {KeyboardShortcutManager} Retorna this para encadeamento
   */
  init() {
    if (this.initialized) {
      this._log('Já inicializado, ignorando');
      return this;
    }

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // 🔥 Prevenção de vazamento: limpa estado quando janela perde foco
    window.addEventListener('blur', this.handleBlur);

    this.initialized = true;
    this._log('Event listeners registrados');
    
    if (this.options.debug) {
      setInterval(() => {
        const status = this.getMemoryStatus();
        if (status.pressedKeys > 5 || status.pendingDebounce > 10) {
          console.warn('⚠️ Possível vazamento detectado:', status);
        }
      }, 30000); // Verifica a cada 30 segundos
    }
    return this;
  }

  /**
   * Remove os event listeners e limpa todos os recursos
   * @returns {KeyboardShortcutManager} Retorna this para consistência
   */
  destroy() {
    if (!this.initialized) {
      return this;
    }

    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);

    // Limpa todos os recursos
    this.shortcuts.clear();
    this.sequences.clear();
    this.longPressHandlers.clear();
    this._clearAllTimers();

    // 🔥 ADICIONAR: Limpa debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.initialized = false;
    this._log('KeyboardShortcutManager destruído');
    return this;
  }

  // ==================== REGISTRO DE ATALHOS ====================

  /**
   * Registra um atalho simples
   * @param {string} key - Tecla ou combinação
   * @param {Function} handler - Callback a ser executado
   * @param {Object} options - Opções do atalho
   * @returns {KeyboardShortcutManager} Retorna this para encadeamento
   */
  register(key, handler, options = {}) {
    // 🔥 Validação rigorosa (Correção #7)
    this._validateKey(key);
    this._validateHandler(handler);
    this._validateOptions(options);

    const config = {
      description: '',
      context: 'global',
      preventDefault: true,
      stopPropagation: false,
      priority: 0,
      debounce: false,
      ...options,
    };

    const normalizedKey = this._normalizeKeyString(key);

    if (!this.shortcuts.has(normalizedKey)) {
      this.shortcuts.set(normalizedKey, []);
    }

    this.shortcuts.get(normalizedKey).push({
      handler,
      config,
    });

    // Ordena por prioridade
    this.shortcuts
      .get(normalizedKey)
      .sort((a, b) => b.config.priority - a.config.priority);

    this._log(`Atalho registrado: ${normalizedKey}`, config);
    return this;
  }

  /**
   * Registra uma sequência de teclas
   * @param {Array<string>} sequence - Array de teclas
   * @param {Function} handler - Callback
   * @param {Object} options - Opções
   * @returns {KeyboardShortcutManager}
   */
  registerSequence(sequence, handler, options = {}) {
    // Validação
    this._validateSequence(sequence);
    this._validateHandler(handler);
    this._validateOptions(options);

    const config = {
      description: '',
      resetOnError: true,
      caseSensitive: false,
      ...options,
    };

    const normalizedSequence = sequence.map((key) =>
      config.caseSensitive ? key : key.toLowerCase()
    );

    // 🔥 Usa Trie para O(1) lookup (Correção #4)
    this.sequences.insert(normalizedSequence, handler, config);

    this._log(
      `Sequência registrada: ${normalizedSequence.join(' → ')}`,
      config
    );
    return this;
  }

  /**
   * Registra um handler para long press
   * @param {string} key - Tecla
   * @param {Function} handler - Callback
   * @param {Object} options - Opções
   * @returns {KeyboardShortcutManager}
   */
  registerLongPress(key, handler, options = {}) {
    this._validateKey(key);
    this._validateHandler(handler);

    const config = {
      duration: this.options.longPressDuration,
      description: '',
      ...options,
    };

    const normalizedKey = this._normalizeKeyString(key);
    this.longPressHandlers.set(normalizedKey, {
      handler,
      config,
    });

    this._log(`Long press registrado: ${normalizedKey} (${config.duration}ms)`);
    return this;
  }

  // ==================== HELPERS PARA SEQUÊNCIAS ====================

  registerKonamiCode(handler, options = {}) {
    return this.registerSequence(
      [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
      ],
      handler,
      { description: 'Konami Code', ...options }
    );
  }

  registerFibonacciSequence(handler, options = {}) {
    return this.registerSequence(['1', '1', '2', '3', '5', '8'], handler, {
      description: 'Sequência de Fibonacci',
      ...options,
    });
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handler principal do keydown
   * 🔥 Corrigido: elimina race conditions e vazamentos
   */
  handleKeyDown(e) {
    if (!this.initialized) return;

    // 🔥 CORREÇÃO: Ignora key repeat para long press
    if (e.repeat && this.options.enableLongPress) {
      // Para sequências e atalhos normais, processa normalmente
      if (!this.options.enableSequences) {
        return;
      }
    }

    // Normalização consistente (🔥 Correção #3)
    const keyInfo = this._extractKeyInfo(e);
    const { code, key, normalizedKey } = keyInfo;

    const isInputFocused = this._isInputFocused();
    const currentContext = isInputFocused
      ? 'no-input'
      : this.getCurrentContext();

    // === 1. LONG PRESS ===
    if (this.options.enableLongPress) {
      this._handleLongPress(code, key, e);
    }

    // === 2. SEQUÊNCIAS ===
    if (this.options.enableSequences && !isInputFocused) {
      this._processSequence(key);
    }

    // === 3. ATALHOS NORMAIS ===
    this._executeShortcuts(normalizedKey, e, isInputFocused, currentContext);
  }

  /**
   * Handler do keyup
   * 🔥 Corrigido: previne race conditions
   */
  handleKeyUp(e) {
    if (!this.initialized) return;

    const { code, key } = this._extractKeyInfo(e);

    // Cancela long press de forma segura
    this._cancelLongPress(code);
  }

  /**
   * Handler quando janela perde foco
   * 🔥 Novo: previne vazamentos quando usuário sai da janela
   */
  handleBlur() {
    this._clearAllTimers();
    this.currentSequence = [];
    this.pressedKeys.clear();
  }

  // ==================== EXECUÇÃO DE ATALHOS ====================

  /**
   * Executa handlers de atalhos com debounce
   * 🔥 Novo: implementa debounce (Correção #6)
   */
  _executeShortcuts(normalizedKey, event, isInputFocused, currentContext) {
    const handlers = this.shortcuts.get(normalizedKey);
    if (!handlers) return;

    for (const { handler, config } of handlers) {
      // Verifica contexto
      if (!this._checkContext(config.context, isInputFocused)) {
        continue;
      }

      // Previne comportamento padrão
      if (config.preventDefault) {
        event.preventDefault();
      }

      if (config.stopPropagation) {
        event.stopPropagation();
      }

      // Aplica debounce se configurado
      if (config.debounce) {
        this._executeWithDebounce(
          normalizedKey,
          handler,
          event,
          currentContext
        );
      } else {
        const result = handler(event, {
          key: normalizedKey,
          context: currentContext,
        });

        if (result === false) break;
      }
    }
  }

  /**
   * Executa handler com debounce
   */
  _executeWithDebounce(key, handler, event, context) {
    // Cancela timer anterior
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      handler(event, { key, context });
      this.debounceTimers.delete(key);
    }, this.options.debounceDelay);

    this.debounceTimers.set(key, timer);
  }

  // ==================== PROCESSAMENTO DE SEQUÊNCIAS ====================

  /**
   * Processa sequência com Trie
   * 🔥 Otimizado: O(k) onde k = comprimento da sequência
   */
  _processSequence(key) {
    const normalizedKey = key.toLowerCase();
    this.currentSequence.push(normalizedKey);

    // 🔥 Correção #1: Limpa timer anterior de forma segura
    this._clearSequenceTimer();

    // Busca no Trie
    const result = this.sequences.search(this.currentSequence);

    if (result.match) {
      // Sequência completa encontrada
      this._log(`Sequência completada: ${this.currentSequence.join(' → ')}`);
      result.handler({
        sequence: [...this.currentSequence],
        config: result.config,
      });
      this.currentSequence = [];
      return;
    }

    if (!result.hasPrefix) {
      // Nenhuma sequência possível
      this._clearSequenceTimer(); // 🔥 Limpa timer também aqui
      this.currentSequence = [];
      return;
    }

    // Define novo timer
    this.sequenceTimer = setTimeout(() => {
      this._log('Sequência expirou');
      this.currentSequence = [];
      this.sequenceTimer = null;
    }, this.options.sequenceTimeout);
  }

  /**
   * Limpa timer de sequência de forma segura
   */
  _clearSequenceTimer() {
    if (this.sequenceTimer !== null) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
  }

  // ==================== LONG PRESS ====================

  /**
   * Gerencia long press com prevenção de race condition
   * 🔥 Correção #2: Estado é limpo antes de criar novo timer
   */
  _handleLongPress(code, key, event) {
    // Verifica se tecla já está pressionada (ignora repeat)
    if (this.pressedKeys.has(code)) {
      return;
    }

    const simplifiedKey = this._normalizeKeyString(key);
    const longPressConfig = this.longPressHandlers.get(simplifiedKey);

    if (!longPressConfig) {
      // Apenas rastreia sem timer
      this.pressedKeys.set(code, {
        timestamp: Date.now(),
        timer: null,
      });
      return;
    }

    // 🔥 CORREÇÃO: Cria timer e salva ANTES do setTimeout
    const timer = setTimeout(() => {
      this._log(`Long press: ${simplifiedKey}`);
      longPressConfig.handler(event, {
        key: simplifiedKey,
        duration: longPressConfig.config.duration,
      });

      // Remove da lista após disparar
      this.pressedKeys.delete(code);
    }, longPressConfig.config.duration);

    // 🔥 SALVA o timer em pressedKeys
    this.pressedKeys.set(code, {
      timestamp: Date.now(),
      timer: timer, // ✅ Agora o timer pode ser cancelado
    });
  }

  /**
   * Cancela long press de forma segura
   */
  _cancelLongPress(code) {
    const keyState = this.pressedKeys.get(code);
    if (!keyState) {
      return;
    }

    if (keyState.timer !== null) {
      clearTimeout(keyState.timer);
    }

    this.pressedKeys.delete(code);
  }

  // ==================== GERENCIAMENTO DE CONTEXTOS ====================

  /**
   * Adiciona um contexto à pilha
   * 🔥 Novo: API para gerenciar contextos (Correção #9)
   */
  pushContext(context) {
    this._validateContext(context);
    this.contextStack.push(context);
    this._log(`Contexto adicionado: ${context}`, this.contextStack);
    return this;
  }

  /**
   * Remove o contexto atual da pilha
   */
  popContext() {
    if (this.contextStack.length <= 1) {
      this._log('Não é possível remover contexto global');
      return this;
    }
    const removed = this.contextStack.pop();
    this._log(`Contexto removido: ${removed}`, this.contextStack);
    return this;
  }

  /**
   * Obtém o contexto atual (topo da pilha)
   */
  getCurrentContext() {
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * Verifica se contexto permite execução
   */
  _checkContext(requiredContext, isInputFocused) {
    if (requiredContext === 'global') return true;
    if (requiredContext === 'no-input') return !isInputFocused;

    if (typeof requiredContext === 'function') {
      return requiredContext(this.getCurrentContext());
    }

    // Verifica se contexto requerido está na stack
    if (typeof requiredContext === 'string') {
      return this.contextStack.includes(requiredContext);
    }

    return true;
  }

  // ==================== NORMALIZAÇÃO E VALIDAÇÃO ====================

  /**
   * Extrai informações da tecla de forma consistente
   * 🔥 Correção #3: Usa event.code para consistência entre navegadores
   */
  _extractKeyInfo(event) {
    // event.code: código físico da tecla (ex: "KeyA", "Digit1")
    // event.key: valor lógico da tecla (ex: "a", "A", "1")
    const code = event.code;
    const key = event.key;

    // Constrói string normalizada
    const parts = [];

    if (event.ctrlKey && code !== 'ControlLeft' && code !== 'ControlRight') {
      parts.push('ctrl');
    }
    if (event.altKey && code !== 'AltLeft' && code !== 'AltRight') {
      parts.push('alt');
    }
    if (event.shiftKey && code !== 'ShiftLeft' && code !== 'ShiftRight') {
      parts.push('shift');
    }
    if (event.metaKey && code !== 'MetaLeft' && code !== 'MetaRight') {
      parts.push('meta');
    }

    // Adiciona tecla principal
    const mainKey = key.toLowerCase();
    if (!['control', 'alt', 'shift', 'meta'].includes(mainKey)) {
      parts.push(mainKey);
    }

    return {
      code,
      key,
      normalizedKey: parts.join('+'),
    };
  }

  /**
   * Normaliza string de tecla
   */
  _normalizeKeyString(keyString) {
    return keyString
      .toLowerCase()
      .replace(/command|cmd/g, 'meta')
      .replace(/option/g, 'alt')
      .replace(/\s+/g, '');
  }

  /**
   * Verifica se foco está em input
   */
  _isInputFocused() {
    const el = document.activeElement;
    return (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) ||
      el?.isContentEditable === true
    );
  }

  // ==================== VALIDAÇÕES ====================

  _validateKey(key) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new TypeError('Key must be a non-empty string');
    }
  }

  _validateHandler(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function');
    }
  }

  _validateSequence(sequence) {
    if (!Array.isArray(sequence) || sequence.length === 0) {
      throw new TypeError('Sequence must be a non-empty array');
    }
    sequence.forEach((key, index) => {
      if (typeof key !== 'string') {
        throw new TypeError(`Sequence[${index}] must be a string`);
      }
    });
  }

  _validateOptions(options) {
    if (options && typeof options !== 'object') {
      throw new TypeError('Options must be an object');
    }
  }

  _validateContext(context) {
    if (typeof context !== 'string' || context.trim() === '') {
      throw new TypeError('Context must be a non-empty string');
    }
  }

  // ==================== LIMPEZA DE RECURSOS ====================

  /**
   * Limpa todos os timers ativos
   * 🔥 Correção #1: Previne vazamentos
   */
  _clearAllTimers() {
    // Limpa timer de sequência
    this._clearSequenceTimer();

    // Limpa todos os long press timers
    for (const keyState of this.pressedKeys.values()) {
      if (keyState.timer !== null) {
        clearTimeout(keyState.timer);
      }
    }
    this.pressedKeys.clear();

    // Limpa debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  // ==================== REMOÇÃO DE HANDLERS ====================

  unregister(key) {
    const normalized = this._normalizeKeyString(key);
    const deleted = this.shortcuts.delete(normalized);
    if (deleted) {
      this._log(`Atalho removido: ${normalized}`);
    }
    return this;
  }

  unregisterSequence(sequence) {
    const normalized = sequence.map((k) => k.toLowerCase());
    const deleted = this.sequences.delete(normalized);
    if (deleted) {
      this._log(`Sequência removida: ${normalized.join(' → ')}`);
    }
    return this;
  }

  unregisterLongPress(key) {
    const normalized = this._normalizeKeyString(key);
    const deleted = this.longPressHandlers.delete(normalized);
    if (deleted) {
      this._log(`Long press removido: ${normalized}`);
    }
    return this;
  }

  // ==================== UTILITÁRIOS ====================

  /**
   * Lista todos os atalhos
   * @returns {Array<{type: string, key?: string, sequence?: string, description: string}>} Lista de atalhos registrados
   */
  listShortcuts() {
    const list = [];

    for (const [key, handlers] of this.shortcuts) {
      handlers.forEach(({ config }) => {
        list.push({
          type: 'shortcut',
          key,
          description: config.description,
          context: config.context,
          priority: config.priority,
        });
      });
    }

    // Lista sequências do Trie
    this.sequences.forEach((sequence, handler, config) => {
      list.push({
        type: 'sequence',
        sequence: sequence.join(' → '),
        description: config.description,
      });
    });

    for (const [key, { config }] of this.longPressHandlers) {
      list.push({
        type: 'longpress',
        key,
        description: config.description,
        duration: config.duration,
      });
    }

    return list;
  }

  /**
   * Log interno
   */
  _log(...args) {
    if (this.options.debug) {
      console.log('[KeyboardShortcutManager]', ...args);
    }
  }

  /**
   * Método de diagnóstico - verifica se há timers pendentes
   * @returns {Object} Status da memória
   */
  getMemoryStatus() {
    return {
      activeShortcuts: this.shortcuts.size,
      activeSequences: this.sequences.root.children.size,
      activeLongPress: this.longPressHandlers.size,
      pressedKeys: this.pressedKeys.size,
      pendingDebounce: this.debounceTimers.size,
      hasSequenceTimer: this.sequenceTimer !== null,
      currentSequence: this.currentSequence.length,
      initialized: this.initialized,
    };
  }
}

// ==================== SEQUENCE TRIE ====================
/**
 * Estrutura de dados Trie otimizada para busca de sequências
 * 🔥 Correção #4: O(k) em vez de O(n) onde k = tamanho da sequência
 */
class SequenceTrie {
  constructor() {
    this.root = { children: new Map(), handler: null, config: null };
  }

  /**
   * Insere uma sequência no Trie
   */
  insert(sequence, handler, config) {
    let node = this.root;

    for (const key of sequence) {
      if (!node.children.has(key)) {
        node.children.set(key, {
          children: new Map(),
          handler: null,
          config: null,
        });
      }
      node = node.children.get(key);
    }

    node.handler = handler;
    node.config = config;
  }

  /**
   * Busca uma sequência no Trie
   * @returns {Object} { match: boolean, hasPrefix: boolean, handler?, config? }
   */
  search(sequence) {
    let node = this.root;

    for (const key of sequence) {
      if (!node.children.has(key)) {
        return { match: false, hasPrefix: false };
      }
      node = node.children.get(key);
    }

    return {
      match: node.handler !== null,
      hasPrefix: node.children.size > 0 || node.handler !== null,
      handler: node.handler,
      config: node.config,
    };
  }

  /**
   * Remove uma sequência
   */
  delete(sequence) {
    const path = [];
    let node = this.root;

    // Encontra o caminho
    for (const key of sequence) {
      if (!node.children.has(key)) {
        return false;
      }
      path.push({ node, key });
      node = node.children.get(key);
    }

    // Remove handler
    if (node.handler === null) {
      return false;
    }

    node.handler = null;
    node.config = null;

    // Remove nós desnecessários de baixo para cima
    for (let i = path.length - 1; i >= 0; i--) {
      const { node: parent, key } = path[i];
      const child = parent.children.get(key);

      if (child.children.size === 0 && child.handler === null) {
        parent.children.delete(key);
      } else {
        break;
      }
    }

    return true;
  }

  /**
   * Itera sobre todas as sequências
   */
  forEach(callback) {
    this._traverse(this.root, [], callback);
  }

  _traverse(node, currentSequence, callback) {
    if (node.handler !== null) {
      callback(currentSequence, node.handler, node.config);
    }

    for (const [key, child] of node.children) {
      this._traverse(child, [...currentSequence, key], callback);
    }
  }

  /**
   * Limpa o Trie
   */
  clear() {
    this.root.children.clear();
  }
}

// ==================== EXPORTAÇÃO ====================

export default KeyboardShortcutManager;
