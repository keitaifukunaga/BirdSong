// AVONETデータのキャッシュ (種名 -> 体重)
let avonetDataCache: Record<string, number> | null = null;

const fetchPath = '/data/AVONET Supplementary dataset 1.csv';

/**
 * AVONETデータを読み込む
 * 体重データを取得するためのCSVファイルを読み込みます。
 * @returns 種名 -> 体重のマップ
 */
export async function loadAVONETData(): Promise<Record<string, number>> {
  if (avonetDataCache !== null) {
    return avonetDataCache;
  }

  try {
    console.log('[AVONET] Loading data from CSV...');
    // 拡張機能内リソースのURLを取得
    const filePath = chrome.runtime.getURL(fetchPath);
    const response = await fetch(filePath);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    // ヘッダーのインデックスを取得
    const species2Index = headers.indexOf('Species2');
    const massIndex = headers.indexOf('Mass');
    const order2Index = headers.indexOf('Order2');
    
    if (species2Index === -1 || massIndex === -1) {
      console.error('[AVONET] Required columns not found in CSV');
      avonetDataCache = {};
      return avonetDataCache;
    }
    
    const result: Record<string, number> = {};
    
    // CSVファイルを読み込み
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      if (values.length < headers.length) continue;
      
      const speciesName = values[species2Index]?.trim();
      const massStr = values[massIndex]?.trim();
      const order = values[order2Index]?.trim();
      
      // 体重データがある種のみ
      if (speciesName && massStr && order) {
        const mass = parseFloat(massStr);
        if (!isNaN(mass) && mass > 0) {
          // 種名を小文字に正規化してキーとする
          const normalizedName = speciesName.toLowerCase().trim();
          result[normalizedName] = mass;
        }
      }
    }
    
    console.log(`[AVONET] Loaded ${Object.keys(result).length} species with body mass data`);
    avonetDataCache = result;
    return result;
    
  } catch (error) {
    console.error('[AVONET] Error loading data:', error);
    avonetDataCache = {};
    return avonetDataCache;
  }
}

