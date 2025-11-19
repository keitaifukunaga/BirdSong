/**
 * 先頭ほど優先される重み付きランダム選択
 * インデックス0が最も選ばれやすく、後ろになるほど選ばれにくくなります
 *
 * @param items 選択対象の配列
 * @returns 選択された要素
 */
export function weightedRandomSelect<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Items array is empty');
  }
  if (items.length === 1) {
    return items[0];
  }

  // 重みを計算（先頭ほど重みが大きい）
  // インデックスiの重み = (length - i)
  const weights: number[] = [];
  let totalWeight = 0;
  
  for (let i = 0; i < items.length; i++) {
    const weight = items.length - i;
    weights.push(weight);
    totalWeight += weight;
  }

  // 重みに基づいてランダムに選択
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  // フォールバック（通常は到達しない）
  return items[0];
}

/**
 * ブラウザの言語設定からリージョンを取得
 * @returns ISO 3166-1 alpha-2 形式の地域コード（例: "JP" や "US"）
 */
export function getRegionCode() {
    const lang = chrome.i18n.getUILanguage(); // 例: "en-US", "ja", "es-ES"
    const parts = lang.split('-');

    // 1. 地域コード（ISO 3166-1 alpha-2）が明示的に含まれている場合
    if (parts.length > 1 && parts[1].length === 2) {
        return parts[1].toUpperCase();
    }

    // 2. 地域コードがない場合のフォールバック（例: "ja" -> "JP", "en" -> "US"）
    const languageOnly = parts[0].toLowerCase();
    switch (languageOnly) {
        case 'ja': return 'JP';
        case 'en': return 'US';
        case 'es': return 'ES'; // スペイン
        case 'fr': return 'FR'; // フランス
        case 'de': return 'DE'; // ドイツ
        // 他の言語も必要に応じて追加
        default: return null;
    }
}

/**
 * navigator.languageからeBird API用のlocale（ISO 639-1言語コード）に変換
 * ハイフン以下を削除して言語コードのみを返す
 * @returns ISO 639-1形式の言語コード（例: "en", "ja", "es"）
 */
export function getEBirdLocale(): string {
    const lang = chrome.i18n.getUILanguage(); // 例: "en-US", "ja-JP", "es-ES", "ja"
    const parts = lang.split('-');
    return parts[0].toLowerCase(); // ハイフン以下を削除して言語コードのみを返す
}

/**
 * i18n wrapper function for chrome.i18n.getMessage
 * Wrapper function for future multi-browser support
 */
export function i18n(key: string, substitutions?: string | string[]): string {
    return chrome.i18n.getMessage(key, substitutions);
}