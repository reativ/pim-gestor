# 📦 Gestor de Produtos — PIM

Centralize todos os dados dos seus produtos em um só lugar: fotos (Drive), NCM, EAN, custo, vídeos por plataforma e integração com GS1.

---

## ✅ Funcionalidades

- Cadastro completo de produtos (nome, SKU, NCM, CEST, EAN, custo)
- Link da pasta de fotos no Google Drive + thumbnail automático
- Links de vídeo por plataforma (Mercado Livre, Shopee)
- Botão **Registrar GS1** — envia os dados diretamente para a API GS1 Brasil
- Filtros rápidos: Sem EAN, Sem NCM, Sem Vídeo ML, Sem Vídeo Shopee, etc.
- Busca por nome, SKU, EAN, NCM
- Visualização em grid (cards) ou tabela
- Importação em massa por planilha `.xlsx` (baixe o modelo dentro do app)
- Exportação de backup em JSON
- Dados salvos localmente no browser (sem servidor, sem custo)

---

## 🚀 Deploy no Vercel (recomendado)

### 1. Crie uma conta gratuita no Vercel
Acesse [vercel.com](https://vercel.com) e faça login com o GitHub.

### 2. Suba o código no GitHub
```bash
cd pim-gestor
git init
git add .
git commit -m "Initial commit"
# Crie um repositório no GitHub e adicione o remote:
git remote add origin https://github.com/SEU_USUARIO/pim-gestor.git
git push -u origin main
```

> ⚠️ **IMPORTANTE:** O arquivo `.env` está no `.gitignore` para proteger suas credenciais.
> Você precisará configurar as variáveis de ambiente no Vercel (próximo passo).

### 3. Importe o projeto no Vercel
- No dashboard do Vercel, clique em **"Add New → Project"**
- Selecione o repositório `pim-gestor`
- Clique em **"Deploy"** (as configurações são detectadas automaticamente)

### 4. Configure as variáveis de ambiente no Vercel
No painel do projeto no Vercel, vá em **Settings → Environment Variables** e adicione:

| Variável               | Valor                                        |
|------------------------|----------------------------------------------|
| VITE_GS1_CLIENT_ID     | 5f733526-8c12-48ee-bfb6-f7ae8534b137         |
| VITE_GS1_CLIENT_SECRET | 99b56fc5-67f4-4b98-917d-ac83c59c1bc1         |
| VITE_GS1_EMAIL         | r94alves@gmail.com                           |
| VITE_GS1_PASSWORD      | (sua senha GS1)                              |
| VITE_GS1_CAD           | A98925                                       |

Após adicionar as variáveis, clique em **"Redeploy"** para aplicar.

---

## 💻 Rodar localmente (desenvolvimento)

```bash
cd pim-gestor
npm install
npm run dev
# Abra http://localhost:3000
```

---

## 📷 Thumbnail do Google Drive

O app tenta extrair a thumbnail automaticamente do link da pasta de fotos.
Para melhores resultados, preencha o campo **"Thumbnail (URL da imagem)"** com:

1. Abra a imagem no Drive
2. Clique com direito → "Abrir com" → "Google Fotos" ou copie o link de compartilhamento
3. O app converte automaticamente links no formato `drive.google.com/file/d/ID/view`

---

## 📊 Importação por Planilha

Dentro do app, clique em **"Importar"** e depois em **"Baixar planilha modelo"**.
Preencha a planilha com seus dados e importe. Colunas aceitas:

| Coluna       | Campo         |
|--------------|---------------|
| nome         | Nome do produto |
| sku          | SKU interno   |
| ncm          | NCM (8 dígitos) |
| cest         | CEST          |
| ean / gtin   | Código de barras |
| custo        | Custo em R$   |
| fotos_drive  | Link da pasta no Drive |
| thumbnail    | URL da imagem de capa |
| video_ml     | URL do vídeo para ML |
| video_shopee | URL do vídeo para Shopee |

Produtos com o mesmo SKU são **atualizados**, não duplicados.

---

## 🔑 GS1 — Notas importantes

O botão **"Registrar GS1"** aparece no formulário de edição de cada produto.
- O produto precisa ter pelo menos **EAN** e **Nome** preenchidos
- O registro é feito via API GS1 Brasil (OAuth2)
- Se houver erro de CORS no browser, pode ser necessário criar uma função serverless proxy — entre em contato para configurar

---

## 🗂 Estrutura do Projeto

```
pim-gestor/
├── src/
│   ├── lib/
│   │   ├── db.js        # CRUD com localStorage
│   │   ├── gs1.js       # Integração GS1 API
│   │   └── utils.js     # Filtros, formatação, mapeamento de colunas
│   ├── components/      # Componentes reutilizáveis
│   ├── pages/           # Páginas
│   └── index.css        # Design system (tokens, utilitários)
├── .env                 # Credenciais (NÃO versionar!)
├── .env.example         # Template de variáveis
└── vercel.json          # Configuração de deploy
```
