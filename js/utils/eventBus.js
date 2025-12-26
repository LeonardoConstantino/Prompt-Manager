/**
 * Sistema avançado de eventos (pub/sub) com recursos modernos
 * Permite comunicação desacoplada entre componentes
 */

class EventBus {
  constructor(options = {maxListeners: 35, debug: false}) {
    /**
     * @type {Map<string, Set<Function>>} Eventos registrados
     */
    this.events = new Map();
    
    /**
     * @type {number} Limite de listeners por evento
     */
    this.maxListeners = options.maxListeners || 35;
    
    /**
     * @type {boolean} Modo debug
     */
    this.debug = options.debug || false;
  }

  /**
   * Valida se o callback é uma função
   * @param {Function} callback - Função a validar
   * @private
   */
  _validateCallback(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
  }

  /**
   * Loga eventos em modo debug
   * @param {string} action - Ação realizada
   * @param {string|null} event - Nome do evento
   * @param {*} data - Dados adicionais
   * @private
   */
  _log(action, event, data=null) {
    if (this.debug) {
      console.log(`[EventBus] ${action}:`, event, data);
    }
  }

  /**
   * Registra um listener para um evento
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a ser chamada
   * @returns {Function} Função para remover o listener
   */
  on(event, callback) {
    this._validateCallback(callback);

    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event);
    
    // Aviso de possível memory leak
    if (listeners?.size || 0 >= this.maxListeners) {
      console.warn(
        `[EventBus] Possible memory leak detected: ${listeners.size} listeners for "${event}"`
      );
    }

    listeners?.add(callback);
    this._log('Registered', event, { listenerCount: listeners?.size });

    // Retorna função para cleanup
    return () => this.off(event, callback);
  }

  /**
   * Registra um listener que executa apenas uma vez
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a ser chamada
   * @returns {Function} Função para remover o listener
   */
  once(event, callback) {
    this._validateCallback(callback);

    const onceWrapper = (data) => {
      callback(data);
      this.off(event, onceWrapper);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * Remove um listener específico
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a remover
   */
  off(event, callback) {
    if (!this.events.has(event)) return;

    const listeners = this.events.get(event);
    listeners?.delete(callback);

    // Remove entry vazia para economizar memória
    if (listeners?.size === 0) {
      this.events.delete(event);
    }

    this._log('Unregistered', event, { listenerCount: listeners?.size });
  }

  /**
   * Emite um evento para todos os listeners (síncrono)
   * @param {string} event - Nome do evento
   * @param {*} data - Dados a passar para os callbacks
   */
  emit(event, data) {
    if (!this.events.has(event)) {
      this._log('Emit (no listeners)', event, data);
      return;
    }

    this._log('Emit', event, data);
    const listeners = this.events.get(event) || [];

    // Usa for...of para melhor performance
    for (const callback of listeners) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
      }
    }
  }

  /**
   * Emite um evento de forma assíncrona
   * @param {string} event - Nome do evento
   * @param {*} data - Dados a passar para os callbacks
   * @returns {Promise<void>}
   */
  async emitAsync(event, data) {
    if (!this.events.has(event)) return;

    this._log('EmitAsync', event, data);
    const listeners = this.events.get(event);

    // Executa callbacks em paralelo
    const promises = Array.from(listeners).map(async (callback) => {
      try {
        await callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in async listener for "${event}":`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Remove todos os listeners de um evento
   * @param {string} [event] - Nome do evento (opcional)
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
      this._log('Cleared', event);
    } else {
      this.events.clear();
      this._log('Cleared all events', null);
    }
  }

  /**
   * Retorna contagem de listeners para um evento
   * @param {string} event - Nome do evento
   * @returns {number}
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events?.get(event)?.size || 0 : 0;
  }

  /**
   * Lista todos os eventos registrados
   * @returns {string[]}
   */
  eventNames() {
    return Array.from(this.events.keys());
  }
}

// Exporta uma factory function em vez de instância única
export const createEventBus = (options) => new EventBus(options);

// Exporta instância global padrão
export default new EventBus({debug: false});