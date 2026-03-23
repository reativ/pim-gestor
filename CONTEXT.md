# PIM Gestor — Contexto do Projeto

> Documento para onboarding rápido de IAs ou devs. Atualizar sempre que houver mudança arquitetural relevante.

---

## O que é

PIM (Product Information Management) interno da **Morini**. Gerencia catálogo de produtos com EAN, NCM, CEST, fotos no Drive, vídeos ML/Shopee e integração com GS1 Brasil para geração de GTINs.

**URL de produção:** https://pim-gestor-deploy.vercel.app

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite (deploy no Vercel) |
| Banco | Supabase (PostgreSQL) — projeto `pim-gestor`, região `sa-east-1` |
| Auth | Supabase Auth (email/senha) |
| API serverless | Vercel Functions (`/api/`) |
| Proxy GS1 | Cloudflare Worker (`gs1-proxy.reativ.workers.dev`) |
| Imagens | Vercel Function (`/api/img/[filename].js`) — proxy para Google Drive |

---

## Estrutura de arquivos importantes

```
src/
  pages/
    Login.jsx           # Tela de login (Supabase Auth)
    Products.jsx        # Página principal — lista, filtros, busca
  components/
    ProductModal.jsx    # Modal de criação/edição de produto
    ProductTable.jsx    # Tabela com ordenação
    ProductCard.jsx     # Card (modo grade)
    FilterBar.jsx       # Chips de filtro (Sem EAN, Sem NCM, etc.)
    GS1Button.jsx       # Botão de geração de GTIN via GS1 Brasil
    DriveFolderSearch.jsx # Picker de pasta do Google Drive
    ImportModal.jsx     # Import via XLSX
    ui/index.jsx        # Primitivos reutilizáveis: Section, Row, Field, InputWithCopy
  lib/
    supabase.js         # Inicialização do cliente Supabase
    db.js               # CRUD com fallback localStorage (getAll/create/update/remove)
    validation.js       # formatNcm, formatCest, ncmHint, cestHint, eanHint
    gs1-api.js          # Chamada à API GS1 (envia token de sessão no header)
    ncm-api.js          # Chamada ao /api/suggest-ncm (sugestão de NCM/CEST via IA)
    gs1.js              # Validação de checksum GTIN
    driveApi.js         # Busca de pastas/imagens no Google Drive via API Key
    drivePicker.js      # Google Picker nativo (OAuth, opcional)
    utils.js            # formatCurrency, applyFilter, applySearch, COLUMN_MAP
    auth.js             # Helpers de autenticação

api/
  gs1-register.js       # Serverless: verifica sessão → valida input → chama Worker
  suggest-ncm.js        # Serverless: verifica sessão → chama OpenRouter → retorna NCM+CEST sugeridos
  img/[filename].js     # Serverless: proxy de imagens do Google Drive (URL com .jpg)

gs1-worker/
  worker.js             # Cloudflare Worker: autentica na GS1 Brasil e registra produto
```

---

## Banco de dados — tabela `products`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | `gen_random_uuid()` |
| `nome` | text | Obrigatório |
| `sku` | text | |
| `ean` | text | EAN/GTIN — gerado via GS1 ou manual |
| `ncm` | text | Armazenado como dígitos puros (ex: `39241000`) |
| `cest` | text | Armazenado como dígitos puros (ex: `1000400`) |
| `custo` | text | |
| `fotos_drive` | text | URL da pasta no Google Drive |
| `thumbnail` | text | URL da imagem de capa |
| `video_ml` | text | Link YouTube para Mercado Livre |
| `video_shopee` | text | Link YouTube para Shopee |
| `gpc_code` | text | Código GPC para GS1 (default `''`) |
| `peso_bruto` | numeric | Em gramas |
| `peso_liquido` | numeric | Em gramas |
| `conteudo_liquido` | numeric | Quantidade declarada |
| `conteudo_liquido_un` | text | `GRM` ou `EA` (default `GRM`) |
| `origem` | text | Código país ISO numérico (default `076` = Brasil) |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** ativado. Política `"Authenticated users full access"` — apenas usuários com sessão válida podem ler/escrever. Anon bloqueado.

---

## Variáveis de ambiente

### Vercel (frontend + serverless)
```
VITE_SUPABASE_URL          # URL pública do projeto Supabase
VITE_SUPABASE_ANON_KEY     # Anon key do Supabase (pública, segura com RLS)
VITE_GOOGLE_API_KEY        # Google API Key para busca de pastas no Drive
VITE_GOOGLE_CLIENT_ID      # OAuth Client ID para Google Picker (opcional)
GS1_WORKER_URL             # https://gs1-proxy.reativ.workers.dev
GS1_WORKER_SECRET          # Shared secret entre Vercel e Cloudflare Worker
OPENROUTER_API_KEY         # API Key do OpenRouter (para sugestão de NCM/CEST via IA)
                           # Modelo atual: google/gemini-2.0-flash-001
                           # Para trocar: editar OPENROUTER_MODEL em api/suggest-ncm.js
```

### Cloudflare Worker
```
GS1_CLIENT_ID      # Client ID da conta GS1 Brasil
GS1_CLIENT_SECRET  # Client Secret da conta GS1 Brasil
GS1_EMAIL          # Email de login GS1
GS1_PASSWORD       # Senha de login GS1
GS1_CAD            # Código CAD da empresa no GS1
WORKER_SECRET      # Mesmo valor que GS1_WORKER_SECRET no Vercel
```

> ⚠️ Vars com prefixo `VITE_` são embutidas no bundle do browser pelo Vite. **Nunca colocar credenciais sensíveis com esse prefixo.**

---

## Fluxo de geração de EAN (GS1)

```
GS1Button (UI)
  → gs1-api.js: busca session token do Supabase
  → POST /api/gs1-register  (Authorization: Bearer <token>)
      → verifica sessão via supabase.auth.getUser(token)
      → valida campos (NCM 8 dígitos, CEST 7, pesos positivos)
      → POST gs1-proxy.reativ.workers.dev  (X-Worker-Secret)
          → autentica na GS1 Brasil (/oauth/access-token)
          → POST /gs1/v2/products
          → retry automático com GPC padrão (10000003) se GPC inválido (erro GS1-1601)
          → retorna { gtin }
```

---

## Segurança — resumo do estado atual

| Ponto | Status |
|---|---|
| RLS no Supabase | ✅ Ativo — apenas autenticados |
| `/api/gs1-register` autenticada | ✅ Verifica JWT Supabase |
| WORKER_SECRET obrigatório | ✅ Worker rejeita se não configurado |
| Validação de input na API | ✅ NCM, CEST, GPC, pesos |
| CORS do Worker | ✅ Restrito ao domínio Vercel |
| Credenciais GS1 sem prefixo VITE_ | ✅ Server-only |
| Rate limiting | ❌ Não implementado (baixa prioridade, uso interno) |

---

## Deploy

```bash
# Frontend + API serverless (Vercel)
cd pim-gestor-deploy
VERCEL_TOKEN=<token> npx vercel --prod --yes --scope reativ-7270s-projects

# Cloudflare Worker
cd gs1-worker
CLOUDFLARE_API_TOKEN=<token> npx wrangler deploy
```

---

## Padrões de código relevantes

- **NCM/CEST:** armazenados como dígitos puros no banco, formatados na exibição via `formatNcm`/`formatCest` de `lib/validation.js`. O `copyValue` nos campos sempre copia os dígitos puros.
- **Drive dropdown:** usa `position: fixed` + `useLayoutEffect` para calcular posição e um backdrop invisível para fechar no click fora — necessário porque o modal pai tem `overflow: auto`.
- **Fallback localStorage:** `db.js` detecta se Supabase está configurado; se não, usa localStorage. Útil para dev sem credenciais.
- **Auto-thumbnail:** ao colar link de pasta do Drive, busca automaticamente a primeira imagem e preenche o campo `thumbnail`.
- **GPC fallback:** se o código GPC do produto for inválido (erro `GS1-1601`), o Worker tenta novamente com o GPC genérico `10000003`.
