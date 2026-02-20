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
- **Deployment**: Vercel

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

- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

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
| `NEXT_PUBLIC_SITE_URL` | Public site URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID (optional) |

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3106`.

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
