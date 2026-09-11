/**
 * 検索の問い合わせ (Elasticsearch のクエリ) を組み立てる部分。
 *
 * API のルートから切り出してある。ここは入力から出力が決まるだけの処理なので、
 * 検索エンジンを立てずに試験できる。過去に起きた不具合はいずれもこの範囲にあった:
 *   - 2 語以上でエラーになる (keyword の項目に連語照合をかけていた)
 *   - 語が離れていると 0 件になる (全体を連語として扱っていた)
 *   - 項目を指定した絞り込みができない
 */

export type Filter = {
  field: string
  values: (number | string | boolean)[]
}

/**
 * 語に分解して索引していない項目 (ES の keyword)。
 *
 * これらに連語 (phrase) の照合をかけると ES が
 * `Can only use phrase queries on text fields` で例外を投げ、検索全体が失敗する。
 * 実際、2 語以上を入力すると本番の検索が落ちていた。連語の照合からは外し、
 * 語単位の照合 (best_fields) でだけ使う。
 */
const NON_PHRASE_FIELDS = new Set(['callNumber', 'tag2', 'tag3'])

/** 連語の照合に使える項目だけを残す。`title^3` のような重み付き表記に対応する。 */
export function phraseCapable(fields: string[]): string[] {
  return fields.filter(f => !NON_PHRASE_FIELDS.has(f.split('^')[0]))
}

/**
 * 検索語を「連語」と「単語」に分ける。
 * `"..."` で囲んだ部分は並び順どおりの連語として扱い、残りは空白で 1 語ずつに切る。
 */
export function splitQuery(searchTerm: string): { phrases: string[]; words: string[] } {
  const phrases: string[] = []
  const rest = searchTerm.replace(/"([^"]*)"/g, (_, p: string) => {
    const t = p.trim()
    if (t) phrases.push(t)
    return ' '
  })
  return { phrases, words: rest.split(/\s+/).filter(Boolean) }
}

/** 検索語だけの問い合わせを作る (絞り込み条件は含まない)。 */
export function buildBaseQuery(searchTerm: string, searchFields: string[]) {
  const term = (searchTerm || '').trim()
  if (!term) return { match_all: {} }

  // 入力した語は「すべて含む」(AND) で絞り込む。語がどの項目に散っていてもよい。
  //
  // 以前は multi_match の `phrase` だけを使っていたため、語が原文で隣り合って
  // いないと 0 件になっていた。`Isabella Bird, the famous traveller.` という資料が
  // あるのに `Isabella traveller` で 0 件、語順を変えた `famous Isabella` でも
  // 0 件、という状態だった (2025-09-11 に東洋文庫図書部よりご指摘)。
  // ご要望は「2 語で絞り込めること」＝ AND なので、語ごとの must にする。
  const { phrases, words } = splitQuery(term)
  const phraseFields = phraseCapable(searchFields)
  const must = [
    ...phrases.map(p => ({
      multi_match: { query: p, fields: phraseFields, type: 'phrase', analyzer: 'standard' },
    })),
    ...words.map(w => ({
      multi_match: { query: w, fields: searchFields, type: 'best_fields', analyzer: 'standard' },
    })),
  ]
  if (must.length === 0) return { match_all: {} }

  // 絞り込みは must で済んでいる。should は並び順のためだけの加点で、
  // 入力どおりに語が並んでいる資料を上位に出す。
  const should =
    words.length > 1 && phraseFields.length > 0
      ? [{ multi_match: { query: term, fields: phraseFields, type: 'phrase', analyzer: 'standard' } }]
      : []

  return { bool: { must, should } }
}

/**
 * 項目を指定した自由入力で絞り込める項目。
 *
 * ファセット (分類・画像の有無など) は選択肢から選ぶので完全一致 (terms) でよいが、
 * 「タイトルに ○○ を含む」のような絞り込みは語で判定する必要がある。
 * 東洋文庫図書部の作業では、この項目別の絞り込みがよく使われる
 * (2025-09-11 のご指摘)。ES のマッピング上、text の項目は match、
 * keyword の請求記号は前方一致で扱う。
 */
const TEXT_FILTER_FIELDS = new Set([
  'title',
  'titleStatement',
  'heading1',
  'publication',
  'publisher',
])
const PREFIX_FILTER_FIELDS = new Set(['callNumber'])

/** 絞り込み条件を組み立てる。`excludeField` はファセットの自己除外に使う。 */
export function buildFilterClauses(filters: Filter[], excludeField?: string) {
  return filters
    .filter((f) => f.field !== excludeField)
    .map((f) => {
      const text = f.values.map(String).join(' ').trim()
      if (text && TEXT_FILTER_FIELDS.has(f.field)) {
        // 入力した語をすべて含むものに絞る (AND)。
        return { match: { [f.field]: { query: text, operator: 'and' } } }
      }
      if (text && PREFIX_FILTER_FIELDS.has(f.field)) {
        // 請求記号は keyword。`P-III-a` のように途中まで打って範囲を絞れるようにする。
        return { prefix: { [f.field]: text } }
      }
      return { terms: { [f.field]: f.values } }
    })
}

