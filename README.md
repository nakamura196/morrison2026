# Morrison Pamphlets Integrated Database

モリソンパンフレット統合データベース

G.E.モリソン蒐集、「モリソンパンフレット」の画像データをご覧いただけます。原資料の水損により、不明瞭なページも多く含まれております。1972年刊の内容分類カタログに基づいて配列されています。

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl (Japanese / English)
- **Search**: OpenSearch / Elasticsearch + Elastic Search UI
- **IIIF**: Presentation API v2/v3 manifest generation, Image Search API
- **CMS**: Omeka S (media & metadata source)
- **Deployment**: Docker + Cloudflare Tunnel (mdx-docker server)

## Project Structure

```
morrison/
├── apps/
│   └── web/                  # Next.js web application
│       ├── src/
│       │   ├── app/          # App Router pages & API routes
│       │   ├── components/   # React components
│       │   ├── content/      # Markdown content (about, news)
│       │   ├── libs/         # Utility libraries
│       │   ├── messages/     # i18n translation files (ja/en)
│       │   └── types/        # TypeScript type definitions
│       └── public/           # Static assets
├── packages/
│   ├── shared-lib/           # Shared utilities (OpenSearch, IIIF, API)
│   └── shared-ui/            # Shared UI components (search, facets)
├── scripts/                  # Data import & index management scripts
└── vercel.json               # Vercel deployment config
```

## Getting Started

### Prerequisites

- Node.js 22 (LTS) — the version CI and deploy use; `nvm use` picks it up from `.nvmrc`
- npm 10+

### Setup

```bash
# Install dependencies.
# --ignore-scripts: without it, sharp's install script tries to build from
# source (needs node-gyp) and aborts the whole install. The prebuilt binary
# (@img/sharp-*) still loads fine at runtime (checked on Node 25).
npm ci --ignore-scripts

# Copy and configure environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your credentials
```

### Environment Variables

| Variable | Description |
|---|---|
| `ES_HOST` | OpenSearch / Elasticsearch endpoint |
| `ES_USERNAME` | OpenSearch username |
| `ES_PASSWORD` | OpenSearch password |
| `ALLOWED_INDICES` | Comma-separated allowed index names |
| `NEXT_PUBLIC_INDEX_NAME` | Public index name for client-side |
| `NEXT_PUBLIC_OMEKA_BASE_URL` | Omeka S base URL |
| `OMEKA_BASE_URL` | Omeka S base URL (server-side) |
| `OMEKA_USER` | Omeka S username |
| `OMEKA_PASSWORD` | Omeka S password |
| `FULLTEXT_INDEX_NAME` | Fulltext search index (OCR pages, default: `morrison_page`) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID (optional) |

### 検索エンジンの索引名

索引名は `<案件>_<役割>` で付ける。役割は決まった語だけを使う。

| 索引 | 中身 | _id |
|---|---|---|
| `morrison_bib` | 書誌 (1 資料 = 1 doc) | 請求記号 |
| `morrison_page` | ページ単位の本文 + 行の座標 | `<omeka_id>_<ページ>` |
| `morrison_media` | 画像の台帳 (関係・順序・寸法) | `<請求記号>_<NNNN>` |

- 役割語: `bib` / `page` / `media` / `item` / `annotation` / `news` / `docs`。
  **案件名だけの索引名 (`morrison` のような) は作らない。** 同じサーバに
  他案件の索引が 70 以上あり、何が入っているか名前で分かる必要がある
  (他案件も `genji_page` `hi_page` `kano_page` と付けている)
- 版を分けるときは末尾に `_v2`、試験用は先頭に `stg_`
- **名前の正解は `apps/web/src/config/indices.ts` だけ。** コードのどこにも
  べた書きしない (`src/config/indices.test.ts` が見張っている)
- ⚠ Cloudflare Workers では `wrangler.jsonc` の `vars` は `process.env` に
  入らない。**本番で使われるのは `config/indices.ts` の既定値**なので、
  改名するときはコードを変えて配布する
- 改名の手順 (ES は名前を変えられない): `_reindex` で複製 → 件数照合 →
  コードの既定値を変えて配布 → 動作確認 → 旧索引を削除 → 互換の別名を張る。
  2026-09-12 に `morrison` → `morrison_page` をこの手順で実施した

### Development

Elasticsearch は mdx-docker サーバー上で稼働しています。ローカル開発時は SSH トンネルを張ってアクセスします。

```bash
# ターミナル1: SSH トンネル（ES へのポートフォワード）
ssh -L 9201:localhost:9201 mdx-docker-cf

# ターミナル2: 開発サーバー起動
npm run dev
```

The app will be available at `http://localhost:3106`.

### Production Deployment (mdx-docker)

本番環境は mdx-docker サーバー上の Docker で稼働し、Cloudflare Tunnel 経由で `https://morrison.toyobunko-lab.jp` で公開されています。

```bash
# 1. コードを転送
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='data' --exclude='.git' \
  -e ssh ./ mdx-docker-cf:/home/mdxuser/toyo-tunnel/morrison-web/

# 2. Docker イメージをビルド
ssh mdx-docker-cf "cd /home/mdxuser/toyo-tunnel/morrison-web && docker build -t morrison-web ."

# 3. コンテナを再起動
ssh mdx-docker-cf "cd /home/mdxuser/toyo-tunnel && docker compose up -d toyo-app"
```

構成:
- **toyo-app** — Next.js アプリ (`morrison-web` イメージ)
- **toyo-elasticsearch** — Elasticsearch 8.17 (`morrison_bib`, `morrison` インデックス)
- **toyo-cantaloupe** — IIIF 画像サーバー (S3 バックエンド)
- **Cloudflare Tunnel** — `morrison.toyobunko-lab.jp` → `toyo-app:3000`

### Build

```bash
npm run build
```

## Content Management

Static pages (About, News) are managed as Markdown files in `apps/web/src/content/`.

### Adding a news post

Create a new `.md` file in `apps/web/src/content/news/`:

```markdown
---
date: "2026-02-20"
title: タイトル
title_en: Title in English
---

本文をここに記述します。
```

File name format: `YYYY-MM-DD_slug.md`

## License

The source code is available under the MIT License. The Morrison Pamphlets collection content is provided by [Toyo Bunko](https://toyo-bunko.or.jp/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
