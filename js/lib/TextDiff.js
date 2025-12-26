/**
 * Sistema de Diff Otimizado para Controle de Versão de Texto
 * Algoritmo: Myers Diff (O(ND) onde N é tamanho, D é número de diferenças)
 * Ambiente: NodeJS e Navegador (JavaScript puro)
 * @version 2.0
 */

class TextDiff {
  // Constantes para tipos de operação
  static OP_TYPES = Object.freeze({
    EQUAL: 'equal',
    ADD: 'add',
    REMOVE: 'remove',
    MODIFY: 'modify'
  });

  /**
   * Valida entrada de texto
   * @param {string} text - Texto a ser validado
   * @param {string} paramName - Nome do parâmetro para mensagens de erro
   * @returns {boolean} 
   * @throws {TypeError} Se a validação falhar
   */
  static #validateText(text, paramName) {
    if (text === null || text === undefined) {
      throw new TypeError(`${paramName} não pode ser null ou undefined`);
    }
    if (typeof text !== 'string') {
      throw new TypeError(`${paramName} deve ser uma string, recebido: ${typeof text}`);
    }
    return true;
  }

  /**
   * Valida objeto diff
   * @param {object} diff - Objeto de diferenças
   * @returns {boolean}
   * @throws {TypeError} Se a validação falhar
   */
  static #validateDiff(diff) {
    if (!diff || typeof diff !== 'object') {
      throw new TypeError('Diff deve ser um objeto válido');
    }
    
    const requiredKeys = ['added', 'removed', 'modified'];
    for (const key of requiredKeys) {
      if (!Array.isArray(diff[key])) {
        throw new TypeError(`diff.${key} deve ser um array`);
      }
    }
    return true;
  }

  /**
   * Calcula a diferença entre duas versões de texto usando algoritmo Myers
   * Complexidade: O(ND) onde N é o tamanho, D é o número de diferenças
   * @param {string} oldText - Texto original
   * @param {string} newText - Texto modificado
   * @returns {object} Objeto contendo as diferenças estruturadas
   */
  static calculate(oldText, newText) {
    // Validação de entrada
    this.#validateText(oldText, 'oldText');
    this.#validateText(newText, 'newText');

    // Caso trivial: textos idênticos
    if (oldText === newText) {
      return {
        added: [],
        removed: [],
        modified: [],
        stats: { linesAdded: 0, linesRemoved: 0, linesModified: 0, totalChanges: 0 }
      };
    }

    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // Executa o algoritmo Myers otimizado
    const edits = this.#myersDiff(oldLines, newLines);
    
    // Converte as operações em estrutura de diff
    return this.#buildDiffStructure(edits, oldLines, newLines);
  }

  /**
   * Algoritmo Myers para diferenças (otimizado)
   * Referência: "An O(ND) Difference Algorithm and Its Variations" - Eugene W. Myers
   * @param {string[]} oldLines - Linhas do texto original
   * @param {string[]} newLines - Linhas do texto modificado
   * @returns {object[]} Lista de operações de edição
   */
  static #myersDiff(oldLines, newLines) {
    const n = oldLines.length;
    const m = newLines.length;
    const max = n + m;
    
    // v[k] contém o índice x mais distante alcançado na diagonal k
    // Usa apenas O(2*max+1) espaço em vez de O(n*m)
    const v = Array.from({ length: 2 * max + 1 }, () => 0);
    const trace = [];

    // Itera até encontrar o caminho mais curto
    for (let d = 0; d <= max; d++) {
      const vCopy = [...v];
      trace.push(vCopy);

      for (let k = -d; k <= d; k += 2) {
        const kOffset = k + max;
        
        // Decide se vamos para baixo ou para a direita
        const goDown = (k === -d) || ((k !== d) && (v[kOffset - 1] < v[kOffset + 1]));
        
        const xStart = goDown ? v[kOffset + 1] : v[kOffset - 1];
        const yStart = xStart - k;
        
        let x = goDown ? xStart : xStart + 1;
        let y = x - k;

        // Segue na diagonal enquanto os elementos são iguais
        while (x < n && y < m && oldLines[x] === newLines[y]) {
          x++;
          y++;
        }

        v[kOffset] = x;

        // Chegamos ao fim?
        if (x >= n && y >= m) {
          return this.#backtrack(trace, oldLines, newLines, d);
        }
      }
    }

    // Fallback (não deveria chegar aqui)
    return [];
  }

  /**
   * Reconstrói o caminho de edições a partir do trace
   * @param {number[][]} trace - Histórico de vetores v
   * @param {string[]} oldLines - Linhas do texto original
   * @param {string[]} newLines - Linhas do texto modificado
   * @param {number} d - Profundidade máxima alcançada
   * @returns {object[]} Lista de operações de edição
   */
  static #backtrack(trace, oldLines, newLines, d) {
    const edits = [];
    let x = oldLines.length;
    let y = newLines.length;
    const max = oldLines.length + newLines.length;

    for (let depth = d; depth >= 0; depth--) {
      const v = trace[depth];
      const k = x - y;
      const kOffset = k + max;

      const goDown = (k === -depth) || 
                     ((k !== depth) && (v[kOffset - 1] < v[kOffset + 1]));

      const xStart = goDown ? v[kOffset + 1] : v[kOffset - 1];
      const yStart = xStart - k;
      const xMid = goDown ? xStart : xStart + 1;
      const yMid = xMid - k;

      // Registra movimentos na diagonal (elementos iguais)
      while (x > xMid && y > yMid) {
        edits.unshift({ type: this.OP_TYPES.EQUAL, oldIndex: x - 1, newIndex: y - 1 });
        x--;
        y--;
      }

      // Registra inserção ou remoção
      if (depth > 0) {
        if (goDown) {
          edits.unshift({ type: this.OP_TYPES.ADD, newIndex: yMid - 1 });
          y--;
        } else {
          edits.unshift({ type: this.OP_TYPES.REMOVE, oldIndex: xMid - 1 });
          x--;
        }
      }
    }

    return edits;
  }

  /**
   * Constrói estrutura de diff a partir das operações
   * Detecta modificações quando há remoção seguida de adição
   * @param {object[]} edits - Lista de operações de edição
   * @param {string[]} oldLines - Linhas do texto original
   * @param {string[]} newLines - Linhas do texto modificado
   * @returns {object} Objeto contendo as diferenças estruturadas
   */
  static #buildDiffStructure(edits, oldLines, newLines) {
    const diff = {
      added: [],
      removed: [],
      modified: []
    };

    // Detecta modificações (remove + add consecutivos)
    for (let i = 0; i < edits.length; i++) {
      const current = edits[i];
      const next = edits[i + 1];

      if (current.type === this.OP_TYPES.REMOVE && 
          next && next.type === this.OP_TYPES.ADD) {
        
        // É uma modificação!
        diff.modified.push({
          oldIndex: current.oldIndex,
          newIndex: next.newIndex,
          oldContent: oldLines[current.oldIndex],
          newContent: newLines[next.newIndex]
        });
        i++; // Pula o próximo edit (já processado)
      } 
      else if (current.type === this.OP_TYPES.ADD) {
        diff.added.push({
          newIndex: current.newIndex,
          content: newLines[current.newIndex]
        });
      } 
      else if (current.type === this.OP_TYPES.REMOVE) {
        diff.removed.push({
          oldIndex: current.oldIndex,
          content: oldLines[current.oldIndex]
        });
      }
    }

    // Adiciona estatísticas
    diff.stats = {
      linesAdded: diff.added.length,
      linesRemoved: diff.removed.length,
      linesModified: diff.modified.length,
      totalChanges: diff.added.length + diff.removed.length + diff.modified.length
    };

    return diff;
  }

  /**
   * Aplica um diff ao texto original para obter a versão modificada
   * @param {string} baseText - Texto base
   * @param {object} diff - Objeto de diferenças
   * @returns {string} Texto reconstruído
   */
  static apply(baseText, diff) {
    this.#validateText(baseText, 'baseText');
    this.#validateDiff(diff);

    const lines = baseText.split('\n');

    // Cria lista de operações com prioridade de execução
    const operations = [
      ...diff.modified.map(m => ({ ...m, type: 'modify', priority: m.oldIndex })),
      ...diff.removed.map(r => ({ ...r, type: 'remove', priority: r.oldIndex })),
      ...diff.added.map(a => ({ ...a, type: 'add', priority: a.newIndex }))
    ];

    // Ordena do maior índice para o menor para manter estabilidade dos índices
    operations.sort((a, b) => b.priority - a.priority);

    // Aplica operações
    for (const op of operations) {
      switch (op.type) {
        case 'modify':
          if (lines[op.oldIndex] !== undefined) {
            lines[op.oldIndex] = op.newContent;
          }
          break;
        case 'remove':
          lines.splice(op.oldIndex, 1);
          break;
        case 'add':
          lines.splice(op.newIndex, 0, op.content);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Reverte um diff para obter o texto original
   * @param {string} modifiedText - Texto modificado
   * @param {object} diff - Objeto de diferenças
   * @returns {string} Texto original reconstruído
   */
  static revert(modifiedText, diff) {
    this.#validateText(modifiedText, 'modifiedText');
    this.#validateDiff(diff);

    const lines = modifiedText.split('\n');

    // Cria lista de operações inversas
    const operations = [
      ...diff.modified.map(m => ({ ...m, type: 'revert-modify', priority: m.newIndex })),
      ...diff.added.map(a => ({ ...a, type: 'revert-add', priority: a.newIndex })),
      ...diff.removed.map(r => ({ ...r, type: 'revert-remove', priority: r.oldIndex }))
    ];

    // Ordena do maior índice para o menor
    operations.sort((a, b) => b.priority - a.priority);

    // Aplica operações inversas
    for (const op of operations) {
      switch (op.type) {
        case 'revert-modify':
          if (lines[op.newIndex] !== undefined) {
            lines[op.newIndex] = op.oldContent;
          }
          break;
        case 'revert-add':
          lines.splice(op.newIndex, 1);
          break;
        case 'revert-remove':
          lines.splice(op.oldIndex, 0, op.content);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Formata o diff para visualização humana
   * @param {object} diff - Objeto de diferenças
   * @returns {string} Representação textual do diff
   */
  static format(diff) {
    this.#validateDiff(diff);

    const lines = [];
    
    lines.push('=== DIFF REPORT ===\n');
    
    if (diff.modified.length > 0) {
      lines.push('📝 MODIFICAÇÕES:');
      for (const { oldIndex, oldContent, newContent } of diff.modified) {
        lines.push(`  Linha ${oldIndex}:`);
        lines.push(`    - ${oldContent}`);
        lines.push(`    + ${newContent}`);
      }
      lines.push('');
    }

    if (diff.removed.length > 0) {
      lines.push('❌ REMOÇÕES:');
      for (const { oldIndex, content } of diff.removed) {
        lines.push(`  Linha ${oldIndex}:. ${content}`);
      }
      lines.push('');
    }

    if (diff.added.length > 0) {
      lines.push('✅ ADIÇÕES:');
      for (const { newIndex, content } of diff.added) {
        lines.push(`  Linha ${newIndex}: ${content}`);
      }
      lines.push('');
    }

    if (diff.stats) {
      lines.push('📊 ESTATÍSTICAS:');
      lines.push(`  Total de mudanças: ${diff.stats.totalChanges}`);
      lines.push(`  Linhas modificadas: ${diff.stats.linesModified}`);
      lines.push(`  Linhas adicionadas: ${diff.stats.linesAdded}`);
      lines.push(`  Linhas removidas: ${diff.stats.linesRemoved}`);
    }

    return lines.join('\n');
  }
}

export default TextDiff;