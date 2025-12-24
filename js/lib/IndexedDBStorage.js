/**
 * IndexedDBStorage - Classe para gerenciamento de storage persistente usando IndexedDB
 * Totalmente desacoplada do React, utiliza apenas APIs nativas do navegador
 * 
 * @example
 * const storage = new IndexedDBStorage('userSettings', { theme: 'dark' });
 * 
 * // Aguardar inicialização
 * await storage.initialize();
 * 
 * // Obter valor
 * const currentValue = storage.getValue();
 * 
 * // Atualizar valor
 * await storage.setValue({ theme: 'light' });
 * 
 * // Observar mudanças
 * storage.subscribe((newValue) => {
 *   console.log('Valor atualizado:', newValue);
 * });
 */
export class IndexedDBStorage {
  // Configurações estáticas do IndexedDB
  static DB_NAME = 'AppStorage';
  static DB_VERSION = 1;
  static STORE_NAME = 'keyValueStore';

  /**
   * Construtor da classe
   * @param {string} key - Chave única para identificar o valor no storage
   * @param {*} initialValue - Valor inicial caso não exista no storage
   */
  constructor(key, initialValue) {
    // Validação de parâmetros
    if (!key || typeof key !== 'string') {
      throw new Error('A chave deve ser uma string não vazia');
    }

    // Propriedades privadas (convenção com _)
    this._key = key;
    this._initialValue = initialValue;
    this._value = initialValue;
    this._loading = true;
    this._error = null;
    this._initialized = false;

    // Sistema de observadores (Observer Pattern)
    this._observers = new Set();

    // BroadcastChannel para sincronização entre abas
    this._channel = new BroadcastChannel(`indexeddb-${key}`);
    this._setupBroadcastListener();
  }

  /**
   * Inicializa o storage carregando valor do IndexedDB
   * Deve ser chamado antes de usar a instância
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) {
      return;
    }

    try {
      this._loading = true;
      this._error = null;

      const storedValue = await this._readFromDB(this._key);

      if (storedValue !== null) {
        this._value = storedValue;
      } else {
        // Se não existe valor armazenado, salva o valor inicial
        await this._writeToDB(this._key, this._initialValue);
        this._value = this._initialValue;
      }

      this._initialized = true;
      this._notifyObservers();
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Erro ao carregar valor inicial';
      console.error('Erro ao inicializar IndexedDBStorage:', err);
      throw err;
    } finally {
      this._loading = false;
    }
  }

  /**
   * Retorna o valor atual
   * @returns {*} Valor armazenado
   */
  getValue() {
    return this._value;
  }

  /**
   * Atualiza o valor no storage
   * Suporta tanto valor direto quanto função de atualização
   * @param {* | Function} newValue - Novo valor ou função (prevValue) => newValue
   * @returns {Promise<void>}
   */
  async setValue(newValue) {
    try {
      this._error = null;
      this._loading = true;

      // Suporte para função de atualização
      let valueToStore;
      if (typeof newValue === 'function') {
        valueToStore = newValue(this._value);
      } else {
        valueToStore = newValue;
      }

      // Atualiza valor em memória
      this._value = valueToStore;

      // Persiste no IndexedDB
      await this._writeToDB(this._key, valueToStore);

      // Notifica observadores locais
      this._notifyObservers();

      // Notifica outras abas via BroadcastChannel
      this._channel.postMessage({
        type: 'update',
        key: this._key,
        value: valueToStore,
      });
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao atualizar valor:', err);
      throw err;
    } finally {
      this._loading = false;
    }
  }

  /**
   * Reseta o valor para o valor inicial
   * @returns {Promise<void>}
   */
  async resetToInitialValue() {
    await this.setValue(this._initialValue);
  }

  /**
   * Retorna informações sobre o uso de storage
   * @returns {Promise<{used: number, quota: number, percentage: number} | null>}
   */
  async getStorageSize() {
    try {
      // Verifica se a API Storage Estimate está disponível
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();

        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0;

        return { used, quota, percentage };
      }

      // Fallback: Método manual para navegadores mais antigos
      const db = await this._openDB();
      const transaction = db.transaction([IndexedDBStorage.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBStorage.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onerror = () => {
          reject(new Error('Erro ao calcular tamanho do storage'));
        };

        request.onsuccess = () => {
          try {
            const allData = request.result;
            const serializedData = JSON.stringify(allData);
            const approximateSize = new Blob([serializedData]).size;

            resolve({
              used: approximateSize,
              quota: approximateSize * 10, // Estimativa conservadora
              percentage: 10,
            });
          } catch (err) {
            reject(new Error('Erro ao processar dados para cálculo de tamanho'));
          }
        };
      });
    } catch (err) {
      console.error('Erro ao calcular tamanho do storage:', err);
      return null;
    }
  }

  /**
   * Inscreve um observador para ser notificado de mudanças
   * @param {Function} callback - Função a ser chamada quando o valor mudar
   * @returns {Function} Função para cancelar a inscrição
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('O callback deve ser uma função');
    }

    this._observers.add(callback);

    // Retorna função de unsubscribe
    return () => {
      this._observers.delete(callback);
    };
  }

  /**
   * Retorna o estado de carregamento
   * @returns {boolean}
   */
  isLoading() {
    return this._loading;
  }

  /**
   * Retorna o último erro ocorrido
   * @returns {string | null}
   */
  getError() {
    return this._error;
  }

  /**
   * Verifica se a instância foi inicializada
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Destrói a instância, limpando listeners e conexões
   */
  destroy() {
    this._channel.close();
    this._observers.clear();
    this._initialized = false;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Abre conexão com IndexedDB
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        IndexedDBStorage.DB_NAME,
        IndexedDBStorage.DB_VERSION
      );

      request.onerror = () => {
        reject(new Error('Erro ao abrir IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IndexedDBStorage.STORE_NAME)) {
          db.createObjectStore(IndexedDBStorage.STORE_NAME);
        }
      };
    });
  }

  /**
   * Lê valor do IndexedDB
   * @private
   * @param {string} key - Chave do valor a ser lido
   * @returns {Promise<* | null>}
   */
  async _readFromDB(key) {
    try {
      const db = await this._openDB();
      const transaction = db.transaction([IndexedDBStorage.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBStorage.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onerror = () => {
          reject(new Error('Erro ao ler do IndexedDB'));
        };

        request.onsuccess = () => {
          resolve(request.result !== undefined ? request.result : null);
        };
      });
    } catch (err) {
      console.error('Erro ao ler do IndexedDB:', err);
      return null;
    }
  }

  /**
   * Escreve valor no IndexedDB
   * @private
   * @param {string} key - Chave do valor
   * @param {*} value - Valor a ser armazenado
   * @returns {Promise<void>}
   */
  async _writeToDB(key, value) {
    try {
      const db = await this._openDB();
      const transaction = db.transaction([IndexedDBStorage.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBStorage.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.put(value, key);

        request.onerror = () => {
          reject(new Error('Erro ao escrever no IndexedDB'));
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (err) {
      throw new Error(`Erro ao escrever no IndexedDB: ${err}`);
    }
  }

  /**
   * Notifica todos os observadores sobre mudança de valor
   * @private
   */
  _notifyObservers() {
    this._observers.forEach((callback) => {
      try {
        callback(this._value, {
          loading: this._loading,
          error: this._error,
        });
      } catch (err) {
        console.error('Erro ao notificar observador:', err);
      }
    });
  }

  /**
   * Configura listener para BroadcastChannel
   * @private
   */
  _setupBroadcastListener() {
    this._channel.addEventListener('message', (event) => {
      if (event.data.type === 'update' && event.data.key === this._key) {
        // Verifica se o valor realmente mudou
        const prevStr = JSON.stringify(this._value);
        const newStr = JSON.stringify(event.data.value);

        if (prevStr !== newStr) {
          this._value = event.data.value;
          this._notifyObservers();
        }
      }
    });
  }
}

// Exportar classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndexedDBStorage;
}