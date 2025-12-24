/**
 * Gerencia exportação e importação de backups
 */

/**
 * @typedef {import('./PromptRepository.js').default} PromptRepository
 * @typedef {import('./PromptRepository.js').Prompt} Prompt
 * @typedef {import('./PromptRepository.js').Version} Version
 * @typedef {import('./PromptRepository.js').Config} Config
 */

/**
 * @typedef {object} BackupData
 * @property {string} version - Versão do app que gerou o backup
 * @property {string} exportDate - Data de exportação
 * @property {object} data - Dados do backup
 * @property {Prompt[]} data.prompts - Lista de prompts
 * @property {Object.<string, Version[]>} data.versions - Versões por prompt
 * @property {Config} data.config - Configurações do app
 */

import { downloadFile } from '../utils/helpers.js';

const APP_VERSION = '1.0.0';

class BackupManager {
  /**
   * Exporta dados para JSON
   * @param {PromptRepository} repository - Repository com os dados
   * @returns {object} Dados do backup
   */
  exportToJSON(repository) {
    const data = repository.getFullData();
    
    const backup = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      data: data
    };
    
    return backup;
  }

  /**
   * Importa dados de JSON
   * @param {PromptRepository} repository - Repository para importar
   * @param {object} backupData - Dados do backup
   * @returns {Promise<void>}
   */
  async importFromJSON(repository, backupData) {
    // Valida estrutura
    const validation = this.validateBackup(backupData);
    
    if (!validation.valid) {
      throw new Error(`Invalid backup: ${validation.errors.join(', ')}`);
    }
    
    // Importa dados
    await repository.setFullData(backupData.data);
    
    // Atualiza config com data do backup
    await repository.updateConfig({
      lastBackup: new Date().toISOString()
    });
  }

  /**
   * Valida estrutura do backup
   * @param {BackupData} backup - Dados do backup
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validateBackup(backup) {
    const errors = [];
    
    if (!backup.version) {
      errors.push('Missing version field');
    }
    
    if (!backup.data) {
      errors.push('Missing data field');
    }
    
    if (backup.data) {
      if (!Array.isArray(backup.data.prompts)) {
        errors.push('Invalid prompts structure');
      }
      
      if (typeof backup.data.versions !== 'object') {
        errors.push('Invalid versions structure');
      }
      
      if (typeof backup.data.config !== 'object') {
        errors.push('Invalid config structure');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Faz download do backup
   * @param {object} backupData - Dados do backup
   * @param {string|null} filename - Nome do arquivo (opcional)
   */
  downloadBackup(backupData, filename = null) {
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `prompt-manager-backup-${timestamp}.json`;
    }
    
    const jsonString = JSON.stringify(backupData, null, 2);
    downloadFile(jsonString, filename, 'application/json');
  }

  /**
   * Parse de arquivo de backup
   * @param {File} file - Arquivo JSON
   * @returns {Promise<object>} Dados do backup
   */
  async parseBackupFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.readAsText(file);
    });
  }

  /**
   * Exporta todo o banco de dados para um arquivo JSON
   * @param {PromptRepository} repository 
   */
  async exportData(repository) {
    const backupData = this.exportToJSON(repository);
    this.downloadBackup(backupData);
  }

  /**
   * Importa dados de um arquivo JSON
   * @param {PromptRepository} repository 
   * @param {File} file 
   */
  async importData(repository, file) {
    const backupData = await this.parseBackupFile(file);
    await this.importFromJSON(repository, backupData);
  }
}

export default BackupManager;