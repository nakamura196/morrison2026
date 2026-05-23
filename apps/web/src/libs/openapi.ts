/**
 * OpenAPI 3.1 document for the Morrison web API.
 *
 * Single source of truth: this module is consumed by
 *   - the runtime endpoint  GET /api/openapi.json   (src/app/api/openapi.json/route.ts)
 *   - the Swagger UI page    /<locale>/api-docs      (loads /api/openapi.json)
 *   - the generator script   npm run gen:openapi     (writes apps/web/openapi.json)
 *
 * Keep this in sync with the route handlers under src/app/api/.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Morrison Pamphlets Database API',
    version: '0.1.0',
    description:
      'モリソンパンフレット統合データベースの内部 API。OpenSearch (書誌 `morrison_bib` / ' +
      '本文OCR `morrison`) を検索するエンドポイントと、資料単位の IIIF Presentation / ' +
      'Content Search を提供する。',
  },
  servers: [
    {
      url: BASE_PATH || '/',
      description: 'Current host',
    },
  ],
  tags: [
    { name: 'search', description: 'OpenSearch ベースの検索 API' },
    { name: 'iiif', description: 'IIIF Presentation / Content Search API' },
    { name: 'meta', description: 'API メタ情報' },
  ],
  paths: {
    '/api/fulltext-search': {
      post: {
        tags: ['search'],
        summary: 'ページ単位の全文検索 (OCR)',
        description:
          '本文OCR索引 (`morrison`) をページ単位で検索し、書誌索引 (`morrison_bib`) の' +
          'メタデータで結果を補完する。書誌に存在し画像のあるアイテムのみを対象にする。' +
          '固有表現 (ne_*) ファセットはクロス索引で集計される。',
        operationId: 'fulltextSearch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FulltextSearchRequest' },
              examples: {
                keyword: {
                  summary: 'キーワード検索',
                  value: { state: { searchTerm: '日本', current: 1, resultsPerPage: 20 } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '検索結果 (search-ui 形式)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SearchUiResponse' },
              },
            },
          },
          '500': {
            description: '検索失敗',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/api/{index}/search': {
      parameters: [{ $ref: '#/components/parameters/IndexParam' }],
      post: {
        tags: ['search'],
        summary: '書誌検索 (search-ui 連携)',
        description:
          'search-ui の state と queryConfig を受け取り、OpenSearch を直接クエリして ' +
          'search-ui 形式 (results / facets / totalResults) に整形して返す。ファセットの ' +
          'disjunctive 集計に対応。CORS 有効。',
        operationId: 'indexSearch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/IndexSearchRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '検索結果 (search-ui 形式)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SearchUiResponse' } },
            },
          },
          '403': {
            description: '許可されていない index',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '500': {
            description: '検索失敗',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      options: {
        tags: ['search'],
        summary: 'CORS preflight',
        operationId: 'indexSearchOptions',
        responses: { '200': { description: 'CORS ヘッダのみ' } },
      },
    },

    '/api/iiif/{version}/{id}/manifest': {
      get: {
        tags: ['iiif'],
        summary: 'IIIF Presentation manifest',
        description:
          '資料 (callNumber) の IIIF manifest を生成する。メタデータは `morrison_bib` から、' +
          'ページは media.toyobunko-lab.jp の clean PTIF を probe して列挙する。`version=3` で ' +
          'Presentation 3 に変換、それ以外は v2。clean PTIF 未変換の資料は 404。',
        operationId: 'iiifManifest',
        parameters: [
          { $ref: '#/components/parameters/IiifVersionParam' },
          { $ref: '#/components/parameters/CallNumberParam' },
        ],
        responses: {
          '200': {
            description: 'IIIF Presentation manifest (v2 もしくは v3)',
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
          '404': {
            description: '資料が見つからない / 画像未変換',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/api/iiif-search/{version}/{id}': {
      get: {
        tags: ['iiif'],
        summary: 'IIIF Content Search',
        description:
          '資料内の本文OCR (`morrison`) を検索し、ヒットページを IIIF Annotation List として' +
          '返す。`q` 未指定時は空のリストを返す。',
        operationId: 'iiifContentSearch',
        parameters: [
          { $ref: '#/components/parameters/IiifVersionParam' },
          { $ref: '#/components/parameters/CallNumberParam' },
          {
            name: 'q',
            in: 'query',
            required: false,
            description: '検索キーワード (フレーズ一致)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'IIIF Annotation List',
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
        },
      },
    },

    '/api/iiif/{version}/{id}/annotations/{canvas}': {
      get: {
        tags: ['iiif'],
        summary: 'IIIF annotations (canvas 単位) — プレースホルダ',
        description:
          '【未実装】1 canvas 分の IIIF Presentation 3 AnnotationPage を返す予定の枠。' +
          '将来の翻刻 / NER オーバーレイ用に URL 形を予約してあり、現状は常に空 ' +
          '(`items: []`) を返す。manifest への配線もまだ行っていない。',
        operationId: 'iiifCanvasAnnotations',
        parameters: [
          { $ref: '#/components/parameters/IiifVersionParam' },
          { $ref: '#/components/parameters/CallNumberParam' },
          {
            name: 'canvas',
            in: 'path',
            required: true,
            description: 'canvas 名 (manifest の canvas ID に対応、例: `p1`)',
            schema: { type: 'string', example: 'p1' },
          },
        ],
        responses: {
          '200': {
            description: 'IIIF Presentation 3 AnnotationPage (現状は空)',
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
        },
      },
    },

    '/api/openapi.json': {
      get: {
        tags: ['meta'],
        summary: 'この OpenAPI ドキュメント',
        operationId: 'getOpenApi',
        responses: {
          '200': {
            description: 'OpenAPI 3.1 ドキュメント',
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
        },
      },
    },
  },

  components: {
    parameters: {
      IndexParam: {
        name: 'index',
        in: 'path',
        required: true,
        description: '対象 index。`ALLOWED_INDICES` に含まれるもののみ許可 (既定: `morrison_bib`)。',
        schema: { type: 'string', example: 'morrison_bib' },
      },
      IiifVersionParam: {
        name: 'version',
        in: 'path',
        required: true,
        description: 'IIIF Presentation バージョン (`2` または `3`)',
        schema: { type: 'string', enum: ['2', '3'], example: '3' },
      },
      CallNumberParam: {
        name: 'id',
        in: 'path',
        required: true,
        description: '資料の請求記号 (callNumber)',
        schema: { type: 'string', example: 'P-III-a-3247' },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['error'],
      },
      SearchFilter: {
        type: 'object',
        description: 'search-ui のファセット絞り込み 1 件。',
        properties: {
          field: { type: 'string', example: 'item_title' },
          values: {
            type: 'array',
            items: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
          },
          type: { type: 'string' },
        },
        required: ['field', 'values'],
      },
      SearchState: {
        type: 'object',
        description: 'search-ui の検索状態。',
        properties: {
          searchTerm: { type: 'string' },
          current: { type: 'integer', minimum: 1, default: 1, description: '1 始まりのページ番号' },
          resultsPerPage: { type: 'integer', default: 20 },
          filters: { type: 'array', items: { $ref: '#/components/schemas/SearchFilter' } },
          sortField: { type: 'string' },
          sortDirection: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      FulltextSearchRequest: {
        type: 'object',
        properties: {
          state: { $ref: '#/components/schemas/SearchState' },
        },
        required: ['state'],
      },
      QueryConfig: {
        type: 'object',
        description: 'search-ui の検索設定 (search_fields / result_fields / facets / disjunctiveFacets)。',
        properties: {
          search_fields: { type: 'object', additionalProperties: { type: 'object' } },
          result_fields: { type: 'object', additionalProperties: { type: 'object' } },
          facets: { type: 'object', additionalProperties: { type: 'object' } },
          disjunctiveFacets: { type: 'array', items: { type: 'string' } },
        },
      },
      IndexSearchRequest: {
        type: 'object',
        properties: {
          state: { $ref: '#/components/schemas/SearchState' },
          requestState: { $ref: '#/components/schemas/SearchState' },
          queryConfig: { $ref: '#/components/schemas/QueryConfig' },
        },
      },
      SearchUiResult: {
        type: 'object',
        description: 'search-ui の結果 1 件。各フィールドは `{ raw, snippet? }` 形式。',
        additionalProperties: {
          type: 'object',
          properties: {
            raw: {},
            snippet: { type: 'string' },
          },
        },
      },
      SearchUiFacet: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'value' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                count: { type: 'integer' },
              },
            },
          },
        },
      },
      SearchUiResponse: {
        type: 'object',
        properties: {
          results: { type: 'array', items: { $ref: '#/components/schemas/SearchUiResult' } },
          totalResults: { type: 'integer' },
          totalPages: { type: 'integer' },
          requestId: { type: 'string' },
          facets: {
            type: 'object',
            additionalProperties: { type: 'array', items: { $ref: '#/components/schemas/SearchUiFacet' } },
          },
        },
        required: ['results', 'totalResults', 'totalPages', 'facets'],
      },
    },
  },
} as const

export type OpenApiDocument = typeof openApiDocument
