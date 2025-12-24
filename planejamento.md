# 📋 Roteiro Técnico Detalhado - Prompt Manager para LLMs

---

## 🎯 Visão Geral do Projeto

**Aplicação:** Gerenciador de Prompts para LLMs  
**Stack:** HTML5, TailwindCSS, JavaScript Vanilla (ES6+ Modules)  
**Persistência:** IndexedDB (via classe customizada)  
**Controle de Versão:** TextDiff (algoritmo Myers)  
**Arquitetura:** Modular com separação de responsabilidades (sem over-engineering)

---

## 📐 Arquitetura de Dados

### Estrutura Principal no IndexedDB

```javascript
{
  prompts: Array<Prompt>,      // Lista de todos os prompts
  versions: Object<PromptId, Array<Version>>,  // Histórico por prompt
  config: Config               // Configurações da aplicação
}
```

### Modelo de Dados Detalhado

```typescript
// Prompt
interface Prompt {
  id: string;                  // UUID v4
  name: string;                // Título do prompt
  description: string;         // Descrição curta
  tags: string[];              // Array de tags para busca/filtro
  content: string;             // Conteúdo markdown completo atual
  createdAt: string;           // ISO 8601 timestamp
  updatedAt: string;           // ISO 8601 timestamp
  isFavorite: boolean;         // Flag para favoritos (futuro)
}

// Version
interface Version {
  id: string;                  // UUID v4
  timestamp: string;           // ISO 8601 timestamp
  diff: TextDiffObject;        // Resultado de TextDiff.calculate()
  note: string;                // Nota opcional da versão
}

// Config
interface Config {
  lastBackup: string | null;   // Timestamp do último backup
  preferences: {
    theme: 'light' | 'dark';
    editorFontSize: number;
  };
  searchHistory: string[];     // Últimas buscas (opcional)
}
```

### Regras de Negócio

1. **Limite de Versões:** Máximo 50 versões por prompt (FIFO quando exceder)
2. **Versão Automática:** Criar nova versão apenas quando usuário clicar "Salvar Alterações"
3. **Versão Base:** Primeira versão armazena conteúdo completo (diff vazio)
4. **Tags:** Case-insensitive, sem duplicatas, trim aplicado
5. **IDs:** UUID v4 gerados client-side

---

## 📁 Estrutura de Arquivos e Responsabilidades

```
prompt-manager/
│
├── index.html                          # Shell da aplicação
│   └── Responsabilidades:
│       - Estrutura HTML básica
│       - CDN do TailwindCSS
│       - Containers para componentes UI
│       - Import do app.js como module
│
├── styles/
│   └── main.css                        # Estilos customizados mínimos
│       └── Responsabilidades:
│           - Overrides de Tailwind (se necessário)
│           - Animações customizadas
│           - Estilos do editor markdown
│
└── js/
    │
    ├── lib/                            # Bibliotecas de terceiros
    │   ├── IndexedDBStorage.js         # Sua classe de storage
    │   │   └── Modificações necessárias:
    │   │       - Nenhuma! Usar como está
    │   │       - PromptRepository gerencia a lógica
    │   │
    │   └── TextDiff.js                 # Sua classe de diff
    │       └── Modificações necessárias:
    │           - Nenhuma! Usar como está
    │
    ├── core/                           # Lógica de negócio
    │   │
    │   ├── PromptRepository.js         # ⭐ NÚCLEO DA APLICAÇÃO
    │   │   └── Responsabilidades:
    │   │       - Inicializar IndexedDBStorage
    │   │       - CRUD de prompts (create, read, update, delete)
    │   │       - Gerenciar versões (criar, listar, aplicar, reverter)
    │   │       - Busca e filtro por nome/descrição/tags
    │   │       - Validações de dados
    │   │       - Emitir eventos via EventBus
    │   │       - Limitar versões a 50 por prompt
    │   │   └── Métodos principais:
    │   │       - initialize()
    │   │       - getAllPrompts()
    │   │       - getPromptById(id)
    │   │       - createPrompt(data)
    │   │       - updatePrompt(id, data, saveVersion, note)
    │   │       - deletePrompt(id)
    │   │       - searchPrompts(query, tags)
    │   │       - getVersions(promptId)
    │   │       - applyVersion(promptId, versionId)
    │   │       - deleteVersion(promptId, versionId)
    │   │       - getAllTags()
    │   │       - getConfig()
    │   │       - updateConfig(data)
    │   │
    │   └── BackupManager.js            # Gerenciamento de backup
    │       └── Responsabilidades:
    │           - Exportar dados como JSON
    │           - Importar dados de JSON
    │           - Validar estrutura do backup
    │           - Download de arquivo
    │           - Parse de arquivo upload
    │       └── Métodos principais:
    │           - exportToJSON(repository)
    │           - importFromJSON(repository, jsonData)
    │           - downloadBackup(data, filename)
    │           - parseBackupFile(file)
    │
    ├── ui/                             # Componentes de interface
    │   │
    │   ├── PromptList.js               # Sidebar com lista de prompts
    │   │   └── Responsabilidades:
    │   │       - Renderizar lista de prompts
    │   │       - Input de busca
    │   │       - Filtro por tags (dropdown/chips)
    │   │       - Botão "Novo Prompt"
    │   │       - Highlight do prompt selecionado
    │   │       - Scroll virtual (se necessário com muitos prompts)
    │   │   └── Eventos emitidos:
    │   │       - 'prompt:select' (quando clica em um prompt)
    │   │       - 'prompt:create' (quando clica em "Novo")
    │   │   └── Eventos escutados:
    │   │       - 'prompt:created' (atualiza lista)
    │   │       - 'prompt:updated' (atualiza item)
    │   │       - 'prompt:deleted' (remove da lista)
    │   │
    │   ├── PromptViewer.js             # Visualização do prompt
    │   │   └── Responsabilidades:
    │   │       - Renderizar markdown como HTML
    │   │       - Botões: Editar, Copiar, Baixar, Histórico, Deletar
    │   │       - Exibir metadados (data criação/edição, tags)
    │   │       - Copiar para clipboard
    │   │       - Download como .md
    │   │   └── Eventos emitidos:
    │   │       - 'prompt:edit' (quando clica em Editar)
    │   │       - 'prompt:delete' (quando clica em Deletar)
    │   │       - 'history:open' (quando clica em Histórico)
    │   │   └── Eventos escutados:
    │   │       - 'prompt:selected' (carrega prompt para visualizar)
    │   │       - 'prompt:updated' (atualiza visualização)
    │   │
    │   ├── PromptEditor.js             # Editor de prompt
    │   │   └── Responsabilidades:
    │   │       - Textarea para edição
    │   │       - Input para nome/descrição/tags
    │   │       - Preview live do markdown (split view)
    │   │       - Botões: Salvar, Cancelar
    │   │       - Textarea para nota da versão (opcional)
    │   │       - Validação de campos obrigatórios
    │   │       - Detectar mudanças não salvas
    │   │   └── Eventos emitidos:
    │   │       - 'prompt:save' (quando salva)
    │   │       - 'editor:cancel' (quando cancela)
    │   │   └── Eventos escutados:
    │   │       - 'prompt:edit' (abre editor com dados)
    │   │       - 'prompt:create' (abre editor vazio)
    │   │
    │   ├── VersionHistory.js           # Histórico de versões
    │   │   └── Responsabilidades:
    │   │       - Listar todas as versões do prompt
    │   │       - Exibir timestamp e nota de cada versão
    │   │       - Preview do diff (opcional: mostrar mudanças)
    │   │       - Botões: Restaurar versão, Deletar versão
    │   │       - Confirmação antes de restaurar/deletar
    │   │   └── Eventos emitidos:
    │   │       - 'version:restore' (restaura versão)
    │   │       - 'version:delete' (deleta versão)
    │   │   └── Eventos escutados:
    │   │       - 'history:open' (abre modal com histórico)
    │   │       - 'version:created' (atualiza lista)
    │   │
    │   └── Modal.js                    # Sistema de modais genérico
    │       └── Responsabilidades:
    │           - Criar overlay
    │           - Renderizar conteúdo dinâmico
    │           - Fechar com ESC ou clique fora
    │           - Animações de entrada/saída
    │           - Suportar diferentes tamanhos
    │       └── Métodos principais:
    │           - open(content, options)
    │           - close()
    │           - setContent(content)
    │
    ├── utils/                          # Utilitários
    │   │
    │   ├── eventBus.js                 # Sistema de eventos
    │   │   └── Responsabilidades:
    │   │       - Pub/sub pattern simples
    │   │       - Registrar listeners
    │   │       - Emitir eventos
    │   │       - Remover listeners
    │   │   └── Métodos principais:
    │   │       - on(event, callback)
    │   │       - off(event, callback)
    │   │       - emit(event, data)
    │   │
    │   ├── helpers.js                  # Funções utilitárias
    │   │   └── Funções:
    │   │       - generateUUID()
    │   │       - copyToClipboard(text)
    │   │       - downloadFile(content, filename, type)
    │   │       - formatDate(isoString)
    │   │       - sanitizeTags(tags)
    │   │       - debounce(fn, delay)
    │   │       - truncate(text, length)
    │   │
    │   └── markdown.js                 # Parser markdown → HTML
    │       └── Responsabilidades:
    │           - Parse markdown para HTML
    │           - Sanitização de HTML (evitar XSS)
    │           - Syntax highlight para code blocks (opcional)
    │       └── Função principal:
    │           - parse(markdown)
    │
    └── app.js                          # ⭐ ENTRY POINT
        └── Responsabilidades:
            - Inicializar todos os módulos
            - Criar instâncias dos componentes UI
            - Setup do EventBus
            - Coordenar fluxo da aplicação
            - Tratar estados globais (loading, errors)
            - Setup de listeners de eventos principais

```

---

## 🔄 Fluxos de Dados Detalhados

### Fluxo 1: Inicialização da Aplicação

```
1. app.js carrega
   ↓
2. Cria instância do EventBus
   ↓
3. Cria instância do PromptRepository
   ↓
4. PromptRepository.initialize()
   ↓
5. IndexedDBStorage.initialize()
   ↓
6. Carrega dados do IndexedDB
   ↓
7. Cria instâncias dos componentes UI:
   - PromptList
   - PromptViewer
   - PromptEditor
   - VersionHistory
   - Modal
   ↓
8. PromptList.render() (mostra lista inicial)
   ↓
9. Aplicação pronta!
```

### Fluxo 2: Criar Novo Prompt

```
1. Usuário clica "Novo Prompt"
   ↓
2. PromptList emite 'prompt:create'
   ↓
3. PromptEditor escuta evento
   ↓
4. PromptEditor.render() (modo criação)
   ↓
5. Usuário preenche campos
   ↓
6. Usuário clica "Salvar"
   ↓
7. PromptEditor valida dados
   ↓
8. PromptEditor emite 'prompt:save' com dados
   ↓
9. app.js escuta evento
   ↓
10. app.js chama PromptRepository.createPrompt(data)
    ↓
11. PromptRepository:
    - Gera UUID
    - Adiciona timestamps
    - Cria primeira versão (diff vazio, conteúdo completo)
    - Atualiza IndexedDBStorage
    - Emite 'prompt:created'
    ↓
12. PromptList escuta 'prompt:created'
    ↓
13. PromptList atualiza lista
    ↓
14. PromptEditor fecha
    ↓
15. Prompt selecionado automaticamente
```

### Fluxo 3: Editar Prompt Existente

```
1. Usuário clica "Editar" no PromptViewer
   ↓
2. PromptViewer emite 'prompt:edit' com ID
   ↓
3. PromptEditor escuta evento
   ↓
4. PromptEditor.render() (modo edição)
   ↓
5. PromptEditor carrega dados atuais do prompt
   ↓
6. Usuário modifica conteúdo
   ↓
7. Usuário clica "Salvar Alterações"
   ↓
8. PromptEditor valida dados
   ↓
9. PromptEditor emite 'prompt:save' com:
    - ID do prompt
    - Novos dados
    - Flag saveVersion: true
    - Nota da versão (opcional)
   ↓
10. app.js escuta evento
    ↓
11. app.js chama PromptRepository.updatePrompt(id, data, true, note)
    ↓
12. PromptRepository:
    - Busca conteúdo antigo
    - Calcula diff com TextDiff.calculate(oldContent, newContent)
    - Cria nova versão com diff
    - Verifica limite de 50 versões (remove mais antiga se necessário)
    - Atualiza prompt
    - Atualiza IndexedDBStorage
    - Emite 'prompt:updated' e 'version:created'
    ↓
13. PromptViewer escuta 'prompt:updated'
    ↓
14. PromptViewer atualiza visualização
    ↓
15. PromptList escuta 'prompt:updated'
    ↓
16. PromptList atualiza item na lista
    ↓
17. PromptEditor fecha
```

### Fluxo 4: Buscar/Filtrar Prompts

```
1. Usuário digita no campo de busca
   ↓
2. Input dispara evento (debounced)
   ↓
3. PromptList captura query
   ↓
4. PromptList chama PromptRepository.searchPrompts(query, tags)
   ↓
5. PromptRepository:
    - Filtra prompts por:
      * Nome (case-insensitive, includes)
      * Descrição (case-insensitive, includes)
      * Tags (match exato)
    - Retorna array filtrado
   ↓
6. PromptList.render() com resultados filtrados
   ↓
7. Se nenhum resultado: exibe mensagem "Nenhum prompt encontrado"
```

### Fluxo 5: Visualizar Histórico de Versões

```
1. Usuário clica "Histórico" no PromptViewer
   ↓
2. PromptViewer emite 'history:open' com ID do prompt
   ↓
3. VersionHistory escuta evento
   ↓
4. VersionHistory chama PromptRepository.getVersions(promptId)
   ↓
5. PromptRepository retorna array de versões
   ↓
6. VersionHistory renderiza lista no Modal:
    - Timestamp formatado
    - Nota da versão
    - Botões: Restaurar, Deletar
   ↓
7. Modal.open() com conteúdo do VersionHistory
```

### Fluxo 6: Restaurar Versão Anterior

```
1. Usuário clica "Restaurar" em uma versão
   ↓
2. Confirmação: "Isso irá substituir o conteúdo atual. Continuar?"
   ↓
3. Se confirmar:
   ↓
4. VersionHistory emite 'version:restore' com:
    - promptId
    - versionId
   ↓
5. app.js escuta evento
   ↓
6. app.js chama PromptRepository.applyVersion(promptId, versionId)
   ↓
7. PromptRepository:
    - Busca a versão específica
    - Busca o conteúdo atual do prompt
    - Aplica o diff reverso usando TextDiff.revert()
    - Recalcula até a versão desejada
    - Cria nova versão com diff "restauração"
    - Atualiza prompt
    - Atualiza IndexedDBStorage
    - Emite 'prompt:updated' e 'version:created'
   ↓
8. PromptViewer atualiza visualização
   ↓
9. Modal fecha
```

### Fluxo 7: Copiar Prompt para Clipboard

```
1. Usuário clica "Copiar" no PromptViewer
   ↓
2. PromptViewer obtém conteúdo markdown do prompt
   ↓
3. PromptViewer chama helpers.copyToClipboard(content)
   ↓
4. helpers usa Clipboard API:
    navigator.clipboard.writeText(content)
   ↓
5. Feedback visual: Toast "Copiado com sucesso!"
```

### Fluxo 8: Baixar Prompt como .md

```
1. Usuário clica "Baixar" no PromptViewer
   ↓
2. PromptViewer obtém:
    - Nome do prompt
    - Conteúdo markdown
   ↓
3. PromptViewer chama helpers.downloadFile(content, filename, 'text/markdown')
   ↓
4. helpers cria Blob e dispara download:
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
   ↓
5. Arquivo baixado
```

### Fluxo 9: Fazer Backup Manual

```
1. Usuário clica "Backup" (botão global)
   ↓
2. Modal abre com opções:
    - Exportar tudo como JSON
    - Importar backup
    - Configurações de backup
   ↓
3. Usuário clica "Exportar"
   ↓
4. app.js chama BackupManager.exportToJSON(repository)
   ↓
5. BackupManager:
    - Obtém dados completos do repository
    - Serializa para JSON
    - Adiciona metadados:
      * timestamp
      * versão da aplicação
      * checksum (opcional)
   ↓
6. BackupManager.downloadBackup(data, `backup-${timestamp}.json`)
   ↓
7. Arquivo JSON baixado
   ↓
8. PromptRepository.updateConfig({ lastBackup: new Date().toISOString() })
```

### Fluxo 10: Importar Backup

```
1. Usuário clica "Importar" no modal de Backup
   ↓
2. Input file aparece (<input type="file" accept=".json">)
   ↓
3. Usuário seleciona arquivo JSON
   ↓
4. BackupManager.parseBackupFile(file)
   ↓
5. BackupManager valida estrutura:
    - Campos obrigatórios presentes
    - Versões compatíveis
    - Dados íntegros
   ↓
6. Se válido:
   ↓
7. Confirmação: "Isso irá SUBSTITUIR todos os dados atuais. Continuar?"
   ↓
8. Se confirmar:
   ↓
9. BackupManager.importFromJSON(repository, jsonData)
   ↓
10. PromptRepository:
    - Substitui dados no IndexedDBStorage
    - Emite 'data:imported'
   ↓
11. app.js escuta 'data:imported'
   ↓
12. app.js recarrega todos os componentes UI
   ↓
13. Modal fecha
   ↓
14. Feedback: Toast "Backup importado com sucesso!"
```

### Fluxo 11: Deletar Prompt

```
1. Usuário clica "Deletar" no PromptViewer
   ↓
2. Confirmação: "Tem certeza? Isso também deletará todas as versões."
   ↓
3. Se confirmar:
   ↓
4. PromptViewer emite 'prompt:delete' com ID
   ↓
5. app.js escuta evento
   ↓
6. app.js chama PromptRepository.deletePrompt(id)
   ↓
7. PromptRepository:
    - Remove prompt do array
    - Remove todas as versões associadas
    - Atualiza IndexedDBStorage
    - Emite 'prompt:deleted'
   ↓
8. PromptList escuta 'prompt:deleted'
   ↓
9. PromptList remove item da lista
   ↓
10. PromptViewer limpa visualização
   ↓
11. Feedback: Toast "Prompt deletado"
```

---

## 🎨 Interface do Usuário

### Layout Geral (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + Botões Globais (Novo, Backup, Config)      │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│  Sidebar       │  Main Content Area                         │
│  (25% width)   │  (75% width)                               │
│                │                                            │
│  ┌──────────┐  │  ┌──────────────────────────────────────┐ │
│  │ Search   │  │  │                                      │ │
│  └──────────┘  │  │                                      │ │
│                │  │                                      │ │
│  ┌──────────┐  │  │    Viewer / Editor Area              │ │
│  │ Tags     │  │  │                                      │ │
│  │ Filter   │  │  │                                      │ │
│  └──────────┘  │  │                                      │ │
│                │  │                                      │ │
│  ┌──────────┐  │  │                                      │ │
│  │ Prompt 1 │  │  │                                      │ │
│  ├──────────┤  │  │                                      │ │
│  │ Prompt 2 │  │  └──────────────────────────────────────┘ │
│  ├──────────┤  │                                            │
│  │ ...      │  │                                            │
│  └──────────┘  │                                            │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

### Estados da Main Content Area

**Estado 1: Nenhum prompt selecionado**
```
┌────────────────────────────────────────┐
│                                        │
│        📝                              │
│                                        │
│    Selecione um prompt                 │
│    ou crie um novo                     │
│                                        │
│    [  Criar Novo Prompt  ]             │
│                                        │
└────────────────────────────────────────┘
```

**Estado 2: Visualização (PromptViewer)**
```
┌────────────────────────────────────────┐
│  Nome do Prompt                        │
│  Descrição do prompt aqui              │
│  Tags: [javascript] [coding]           │
│                                        │
│  [Editar] [Copiar] [Baixar] [Histórico] [Deletar] │
│  ───────────────────────────────────   │
│                                        │
│  # Conteúdo Markdown Renderizado       │
│                                        │
│  Lorem ipsum dolor sit amet...         │
│                                        │
│  ```javascript                         │
│  const code = 'example';               │
│  ```                                   │
│                                        │
│  ───────────────────────────────────   │
│  Criado: 15/01/2025                    │
│  Atualizado: 20/01/2025                │
└────────────────────────────────────────┘
```

**Estado 3: Edição (PromptEditor)**
```
┌────────────────────────────────────────┐
│  Nome: [________________________]      │
│  Descrição: [___________________]      │
│  Tags: [javascript, coding]            │
│                                        │
│  [Salvar] [Cancelar]                   │
│  ───────────────────────────────────   │
│                                        │
│  ┌─────────────┬──────────────────┐    │
│  │  Editor     │  Preview         │    │
│  │             │                  │    │
│  │ # Markdown  │  Markdown        │    │
│  │ content...  │  Renderizado     │    │
│  │             │                  │    │
│  │             │                  │    │
│  └─────────────┴──────────────────┘    │
│                                        │
│  Nota desta versão (opcional):         │
│  [_________________________________]   │
│                                        │
└────────────────────────────────────────┘
```

### Modal de Histórico de Versões

```
┌──────────────────────────────────────────┐
│  Histórico de Versões                [X]│
│  ────────────────────────────────────    │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 📅 20/01/2025 15:45                │ │
│  │ Nota: Adicionei contexto ES6+      │ │
│  │ [Restaurar] [Deletar]              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 📅 18/01/2025 10:30                │ │
│  │ Nota: Primeira versão              │ │
│  │ [Restaurar] [Deletar]              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 📅 15/01/2025 08:00 (Original)     │ │
│  │ [Restaurar]                        │ │
│  └────────────────────────────────────┘ │
│                                          │
│              [Fechar]                    │
└──────────────────────────────────────────┘
```

### Modal de Backup

```
┌──────────────────────────────────────────┐
│  Backup e Configurações              [X]│
│  ────────────────────────────────────    │
│                                          │
│  Último backup: 21/01/2025 08:00         │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  [📥 Exportar Backup]              │ │
│  │  Salvar todos os prompts e versões │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  [📤 Importar Backup]              │ │
│  │  Restaurar de arquivo JSON         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ⚙️ Preferências:                        │
│  ┌────────────────────────────────────┐ │
│  │ Tema: ○ Claro  ● Escuro            │ │
│  │ Tamanho fonte editor: [14] px      │ │
│  └────────────────────────────────────┘ │
│                                          │
│              [Fechar]                    │
└──────────────────────────────────────────┘
```

---

## 🎨 Paleta de Cores e Estilos (Sugestão Tailwind)

```javascript
// Tema Escuro (sugestão)
{
  background: 'bg-gray-900',        // Fundo principal
  sidebar: 'bg-gray-800',           // Sidebar
  card: 'bg-gray-700',              // Cards/Items
  cardHover: 'bg-gray-600',         // Hover
  text: 'text-gray-100',            // Texto principal
  textMuted: 'text-gray-400',       // Texto secundário
  border: 'border-gray-600',        // Bordas
  primary: 'bg-blue-600',           // Botões primários
  primaryHover: 'bg-blue-700',      
  danger: 'bg-red-600',             // Botões deletar
  dangerHover: 'bg-red-700',
  success: 'bg-green-600',          // Feedback sucesso
  tag: 'bg-purple-600',             // Tags
}

// Espaçamentos
{
  sidebarWidth: 'w-1/4',            // 25%
  contentWidth: 'w-3/4',            // 75%
  padding: 'p-4',
  gap: 'gap-4',
}

// Componentes
{
  button: 'px-4 py-2 rounded-lg font-medium transition-colors',
  input: 'px-3 py-2 rounded-lg border focus:outline-none focus:ring-2',
  card: 'rounded-lg shadow-md p-4',
  modal: 'rounded-xl shadow-2xl max-w-2xl',
}
```

---

## 🔧 Implementação Detalhada por Módulo

### 1. utils/eventBus.js

```javascript
/**
 * Sistema simples de eventos (pub/sub)
 * Permite comunicação desacoplada entre componentes
 */

class EventBus {
  constructor() {
    this.events = {}; // { eventName: [callback1, callback2, ...] }
  }

  /**
   * Registra um listener para um evento
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a ser chamada
   * @returns {Function} Função para remover o listener
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Retorna função para cleanup
    return () => this.off(event, callback);
  }

  /**
   * Remove um listener específico
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a remover
   */
  off(event, callback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
    
    // Remove array vazio
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  /**
   * Emite um evento para todos os listeners
   * @param {string} event - Nome do evento
   * @param {*} data - Dados a passar para os callbacks
   */
  emit(event, data) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  /**
   * Remove todos os listeners de um evento
   * @param {string} event - Nome do evento
   */
  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

export default new EventBus();
```

**Eventos da Aplicação:**
```javascript
// Prompts
'prompt:created'    // { prompt: Prompt }
'prompt:updated'    // { prompt: Prompt }
'prompt:deleted'    // { id: string }
'prompt:selected'   // { id: string }
'prompt:edit'       // { id: string }
'prompt:delete'     // { id: string }
'prompt:save'       // { id?: string, data: Partial<Prompt>, saveVersion: boolean, note?: string }
'prompt:create'     // {}

// Versões
'version:created'   // { promptId: string, version: Version }
'version:restore'   // { promptId: string, versionId: string }
'version:delete'    // { promptId: string, versionId: string }

// UI
'history:open'      // { promptId: string }
'editor:cancel'     // {}
'modal:open'        // { content: HTMLElement, options: object }
'modal:close'       // {}

// Sistema
'data:imported'     // {}
'error'             // { message: string, details?: any }
'success'           // { message: string }
```

---

### 2. utils/helpers.js

```javascript
/**
 * Funções utilitárias gerais
 */

/**
 * Gera UUID v4
 * @returns {string} UUID único
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Copia texto para clipboard
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    
    // Fallback para navegadores antigos
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

/**
 * Download de arquivo
 * @param {string} content - Conteúdo do arquivo
 * @param {string} filename - Nome do arquivo
 * @param {string} type - MIME type
 */
export function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formata data ISO para formato legível
 * @param {string} isoString - Data em formato ISO
 * @param {boolean} includeTime - Incluir horário
 * @returns {string} Data formatada
 */
export function formatDate(isoString, includeTime = false) {
  const date = new Date(isoString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  let formatted = `${day}/${month}/${year}`;
  
  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    formatted += ` ${hours}:${minutes}`;
  }
  
  return formatted;
}

/**
 * Sanitiza e normaliza tags
 * @param {string[]} tags - Array de tags
 * @returns {string[]} Tags processadas
 */
export function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  
  return [...new Set(
    tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
  )];
}

/**
 * Debounce de função
 * @param {Function} fn - Função a ser debounced
 * @param {number} delay - Delay em ms
 * @returns {Function} Função debounced
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Trunca texto com elipses
 * @param {string} text - Texto a truncar
 * @param {number} length - Comprimento máximo
 * @returns {string} Texto truncado
 */
export function truncate(text, length = 100) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Valida estrutura de prompt
 * @param {object} data - Dados do prompt
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePrompt(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Nome é obrigatório');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('Nome deve ter no máximo 100 caracteres');
  }
  
  if (!data.content || data.content.trim().length === 0) {
    errors.push('Conteúdo é obrigatório');
  }
  
  if (data.description && data.description.length > 300) {
    errors.push('Descrição deve ter no máximo 300 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Mostra toast de notificação
 * @param {string} message - Mensagem a exibir
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {number} duration - Duração em ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Remove toast anterior se existir
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-up ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    'bg-blue-600'
  }`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
```

---

### 3. core/PromptRepository.js

```javascript
/**
 * Camada de acesso a dados para prompts
 * Gerencia CRUD, versões, busca e persistência
 */

import IndexedDBStorage from '../lib/IndexedDBStorage.js';
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
      editorFontSize: 14
    },
    searchHistory: []
  }
};

const MAX_VERSIONS = 50;

class PromptRepository {
  constructor() {
    this.storage = null;
    this.initialized = false;
  }

  /**
   * Inicializa o repository e carrega dados
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      this.storage = new IndexedDBStorage('prompt-manager-data', INITIAL_DATA);
      await this.storage.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PromptRepository:', error);
      throw error;
    }
  }

  /**
   * Obtém todos os prompts
   * @returns {Prompt[]} Array de prompts
   */
  getAllPrompts() {
    this._ensureInitialized();
    const data = this.storage.getValue();
    return data.prompts || [];
  }

  /**
   * Obtém prompt por ID
   * @param {string} id - ID do prompt
   * @returns {Prompt|null} Prompt ou null se não encontrado
   */
  getPromptById(id) {
    this._ensureInitialized();
    const prompts = this.getAllPrompts();
    return prompts.find(p => p.id === id) || null;
  }

  /**
   * Cria novo prompt
   * @param {object} data - Dados do prompt { name, description, tags, content }
   * @returns {Promise<Prompt>} Prompt criado
   */
  async createPrompt(data) {
    this._ensureInitialized();
    
    const now = new Date().toISOString();
    const prompt = {
      id: generateUUID(),
      name: data.name.trim(),
      description: (data.description || '').trim(),
      tags: sanitizeTags(data.tags || []),
      content: data.content.trim(),
      createdAt: now,
      updatedAt: now,
      isFavorite: false
    };
    
    // Cria primeira versão (sem diff, conteúdo completo)
    const firstVersion = {
      id: generateUUID(),
      timestamp: now,
      diff: null, // Versão inicial não tem diff
      note: 'Versão inicial'
    };
    
    const currentData = this.storage.getValue();
    currentData.prompts.push(prompt);
    currentData.versions[prompt.id] = [firstVersion];
    
    await this.storage.setValue(currentData);
    
    eventBus.emit('prompt:created', { prompt });
    
    return prompt;
  }

  /**
   * Atualiza prompt existente
   * @param {string} id - ID do prompt
   * @param {object} data - Dados a atualizar
   * @param {boolean} saveVersion - Se deve salvar nova versão
   * @param {string} note - Nota da versão (opcional)
   * @returns {Promise<Prompt>} Prompt atualizado
   */
  async updatePrompt(id, data, saveVersion = false, note = '') {
    this._ensureInitialized();
    
    const currentData = this.storage.getValue();
    const promptIndex = currentData.prompts.findIndex(p => p.id === id);
    
    if (promptIndex === -1) {
      throw new Error('Prompt not found');
    }
    
    const oldPrompt = currentData.prompts[promptIndex];
    const now = new Date().toISOString();
    
    // Atualiza campos
    const updatedPrompt = {
      ...oldPrompt,
      ...data,
      tags: data.tags ? sanitizeTags(data.tags) : oldPrompt.tags,
      updatedAt: now
    };
    
    currentData.prompts[promptIndex] = updatedPrompt;
    
    // Se deve salvar versão e o conteúdo mudou
    if (saveVersion && data.content && data.content !== oldPrompt.content) {
      const diff = TextDiff.calculate(oldPrompt.content, data.content);
      
      const version = {
        id: generateUUID(),
        timestamp: now,
        diff: diff,
        note: note.trim() || 'Atualização'
      };
      
      if (!currentData.versions[id]) {
        currentData.versions[id] = [];
      }
      
      currentData.versions[id].push(version);
      
      // Limita a 50 versões (remove mais antigas)
      if (currentData.versions[id].length > MAX_VERSIONS) {
        currentData.versions[id] = currentData.versions[id].slice(-MAX_VERSIONS);
      }
      
      eventBus.emit('version:created', { promptId: id, version });
    }
    
    await this.storage.setValue(currentData);
    
    eventBus.emit('prompt:updated', { prompt: updatedPrompt });
    
    return updatedPrompt;
  }

  /**
   * Deleta prompt
   * @param {string} id - ID do prompt
   * @returns {Promise<void>}
   */
  async deletePrompt(id) {
    this._ensureInitialized();
    
    const currentData = this.storage.getValue();
    
    currentData.prompts = currentData.prompts.filter(p => p.id !== id);
    delete currentData.versions[id];
    
    await this.storage.setValue(currentData);
    
    eventBus.emit('prompt:deleted', { id });
  }

  /**
   * Busca prompts por query e tags
   * @param {string} query - Texto a buscar (nome/descrição)
   * @param {string[]} tags - Tags para filtrar
   * @returns {Prompt[]} Prompts encontrados
   */
  searchPrompts(query = '', tags = []) {
    this._ensureInitialized();
    
    let prompts = this.getAllPrompts();
    
    // Filtro por query (nome e descrição)
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      prompts = prompts.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Filtro por tags
    if (tags.length > 0) {
      const lowerTags = tags.map(t => t.toLowerCase());
      prompts = prompts.filter(p =>
        lowerTags.some(tag => p.tags.includes(tag))
      );
    }
    
    return prompts;
  }

  /**
   * Obtém todas as tags únicas
   * @returns {string[]} Array de tags
   */
  getAllTags() {
    this._ensureInitialized();
    
    const prompts = this.getAllPrompts();
    const tagsSet = new Set();
    
    prompts.forEach(p => {
      p.tags.forEach(tag => tagsSet.add(tag));
    });
    
    return Array.from(tagsSet).sort();
  }

  /**
   * Obtém versões de um prompt
   * @param {string} promptId - ID do prompt
   * @returns {Version[]} Array de versões (mais recente primeiro)
   */
  getVersions(promptId) {
    this._ensureInitialized();
    
    const currentData = this.storage.getValue();
    const versions = currentData.versions[promptId] || [];
    
    // Retorna em ordem reversa (mais recente primeiro)
    return [...versions].reverse();
  }

  /**
   * Aplica (restaura) uma versão específica
   * @param {string} promptId - ID do prompt
   * @param {string} versionId - ID da versão
   * @returns {Promise<Prompt>} Prompt atualizado
   */
  async applyVersion(promptId, versionId) {
    this._ensureInitialized();
    
    const prompt = this.getPromptById(promptId);
    if (!prompt) throw new Error('Prompt not found');
    
    const versions = this.getVersions(promptId).reverse(); // Ordem cronológica
    const targetIndex = versions.findIndex(v => v.id === versionId);
    
    if (targetIndex === -1) throw new Error('Version not found');
    
    // Reconstrói o conteúdo até a versão desejada
    let content = prompt.content;
    
    // Reverte todas as versões após a desejada
    for (let i = versions.length - 1; i > targetIndex; i--) {
      if (versions[i].diff) {
        content = TextDiff.revert(content, versions[i].diff);
      }
    }
    
    // Atualiza prompt com novo conteúdo e cria versão de "restauração"
    return await this.updatePrompt(
      promptId,
      { content },
      true,
      `Restaurado para versão de ${new Date(versions[targetIndex].timestamp).toLocaleString()}`
    );
  }

  /**
   * Deleta uma versão específica
   * @param {string} promptId - ID do prompt
   * @param {string} versionId - ID da versão
   * @returns {Promise<void>}
   */
  async deleteVersion(promptId, versionId) {
    this._ensureInitialized();
    
    const currentData = this.storage.getValue();
    
    if (!currentData.versions[promptId]) {
      throw new Error('No versions found for this prompt');
    }
    
    // Não permite deletar a versão inicial
    if (currentData.versions[promptId].length === 1) {
      throw new Error('Cannot delete the initial version');
    }
    
    currentData.versions[promptId] = currentData.versions[promptId].filter(
      v => v.id !== versionId
    );
    
    await this.storage.setValue(currentData);
    
    eventBus.emit('version:deleted', { promptId, versionId });
  }

  /**
   * Obtém configurações
   * @returns {Config} Configurações atuais
   */
  getConfig() {
    this._ensureInitialized();
    
    const data = this.storage.getValue();
    return data.config || INITIAL_DATA.config;
  }

  /**
   * Atualiza configurações
   * @param {object} updates - Campos a atualizar
   * @returns {Promise<Config>} Configurações atualizadas
   */
  async updateConfig(updates) {
    this._ensureInitialized();
    
    const currentData = this.storage.getValue();
    currentData.config = {
      ...currentData.config,
      ...updates,
      preferences: {
        ...currentData.config.preferences,
        ...(updates.preferences || {})
      }
    };
    
    await this.storage.setValue(currentData);
    
    return currentData.config;
  }

  /**
   * Obtém dados completos (para backup)
   * @returns {object} Dados completos
   */
  getFullData() {
    this._ensureInitialized();
    return this.storage.getValue();
  }

  /**
   * Substitui todos os dados (para importação)
   * @param {object} data - Dados completos
   * @returns {Promise<void>}
   */
  async setFullData(data) {
    this._ensureInitialized();
    await this.storage.setValue(data);
    eventBus.emit('data:imported', {});
  }

  /**
   * Verifica se está inicializado
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('PromptRepository not initialized. Call initialize() first.');
    }
  }
}

export default PromptRepository;
```

---

### 4. core/BackupManager.js

```javascript
/**
 * Gerencia exportação e importação de backups
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
   * @param {object} backup - Dados do backup
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
   * @param {string} filename - Nome do arquivo (opcional)
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
}

export default BackupManager;
```

---

## 📝 Próximos Passos

Este roteiro técnico cobre:
- ✅ Arquitetura de dados
- ✅ Estrutura de arquivos
- ✅ Fluxos de dados detalhados
- ✅ Interface do usuário
- ✅ Implementação dos módulos core e utils

**Faltam implementar:**
- 🔲 Componentes UI (PromptList, PromptViewer, PromptEditor, VersionHistory, Modal)
- 🔲 Parser de Markdown
- 🔲 app.js (entry point)
- 🔲 index.html
- 🔲 Estilos CSS


Quero que você implemente os componentes UI e os arquivos restantes.