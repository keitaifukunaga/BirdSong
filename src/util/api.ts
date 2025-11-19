import type { Bird, BirdObservation } from '../typeConst';
import { weightedRandomSelect } from './commonfunc';
import { loadAVONETData } from './api_avonet';
import { loadEBirdTaxonomy } from './api_taxonomy';
import { EBIRD_BASE_URL, EBIRD_API_KEY, MACAULAY_BASE_URL } from '../typeConst';

// 対象とする「目」のリスト
const TARGET_ORDERS = [
  'Caprimulgiformes',  // ヨタカ目
  'Apodiformes',       // アマツバメ目
  'Charadriiformes',   // チドリ目
  'Piciformes',        // キツツキ目
  'Passeriformes'      // スズメ目
];

// 体長30cm以下の鳥の体重上限（グラム）
const MAX_BODY_MASS_FOR_30CM = 200;

/**
 * speciesCodeから体重を取得
 * AVONETデータを読み込み、AVONETデータの種名を学名に変換して体重を取得します。
 * @param speciesCode 種コード
 * @returns 体重、または null
 */
async function getSpeciesMass(speciesCode: string): Promise<number | null> {
  const avonetData = await loadAVONETData();
  const taxonomyInfo = await loadEBirdTaxonomy();
  // speciesCodeから学名を取得してAVONETデータから体重を取得
  return avonetData[taxonomyInfo[speciesCode]?.scientificName?.toLowerCase()] || null;
}


/**
 * eBird APIから最近の観測データを取得します。
 * 指定された「目」に属し、体長30cm以下（体重200g以下）の種のみを返します。
 *
 * @param regionCode 検索対象の地域コード（未指定時は東京周辺）
 * @returns 観測データの配列（体長30cm以下の種のみ）
 */
export async function getRecentObservations(regionCode?: string): Promise<BirdObservation[]> {
  try {
    let url: string;
    
    if (regionCode) {
      // 地域コード指定時
      url = `${EBIRD_BASE_URL}/data/obs/${regionCode}/recent?back=7&maxResults=50`;
    } else {
      // 地域コード未指定時は東京周辺の観測を取得
      url = `${EBIRD_BASE_URL}/data/obs/geo/recent?lat=35.6762&lng=139.6503&dist=50&back=7&maxResults=50`;
    }

    console.log('[API] Fetching observations from eBird:', url);

    const response = await fetch(url, {
      headers: {
        'x-ebirdapitoken': EBIRD_API_KEY || ''
      }
    });

    if (!response.ok) {
      console.error('[API] eBird API error:', response.status, response.statusText);
      return [];
    }

    const observations = await response.json();
    console.log(`[API] Found ${observations.length} observations from eBird`);
    
    // eBird taxonomy データを読み込み
    const taxonomyInfo = await loadEBirdTaxonomy();
    
    // 指定の目で絞り込み
    const allowedCodes = new Set<string>();
    Object.keys(taxonomyInfo).forEach(key => {
      if (TARGET_ORDERS.includes(taxonomyInfo[key].order)) {
        allowedCodes.add(key);
      }
    })
    
    // フィルタリング: 指定された「目」に属し、体重制限内、メディアがある観測のみ
    const filtered: BirdObservation[] = [];
    
    for (const obs of observations) {
      // 指定された「目」に属するかチェック
      if (!allowedCodes.has(obs.speciesCode)) {
        continue;
      }
      
      // メディアがあるかチェック
      const hasMedia = obs.hasRichMedia === true || obs.hasRichMedia === undefined;
      if (!hasMedia) {
        continue;
      }
      
      // 体重をチェック（30cm以下 = 200g以下）
      const mass = await getSpeciesMass(obs.speciesCode);
      if (mass !== null && mass <= MAX_BODY_MASS_FOR_30CM) {
        filtered.push(obs);
        console.log(`[API] ✓ ${obs.comName} (${obs.speciesCode}): ${mass}g`);
      } else if (mass !== null) {
        console.log(`[API] ✗ ${obs.comName} (${obs.speciesCode}): ${mass}g (too large)`);
      }
    }
    
    console.log(`[API] Filtered to ${filtered.length} observations (≤30cm, ≤${MAX_BODY_MASS_FOR_30CM}g)`);
    
    return filtered;
  } catch (error) {
    console.error('[API] Error fetching eBird observations:', error);
    return [];
  }
}

/**
 * Macaulay LibraryからメディアURLを取得します。
 *
 * @param speciesCode 種コード
 * @param regionCode 地域コード（オプション）
 * @returns メディアデータ、または null
 */
export async function getMacaulayMedia(speciesCode: string, regionCode?: string): Promise<any | null> {
  try {
    // 音声を取得（高品質のみ）
    const audioParams = new URLSearchParams({
      taxonCode: speciesCode,
      mediaType: 'audio',
      count: '10',
      sort: 'rating_rank_desc',
    });

    if (regionCode) {
      audioParams.append('regionCode', regionCode);
    }

    const audioResponse = await fetch(`${MACAULAY_BASE_URL}/search?${audioParams}`);
    const audioData = await audioResponse.json();

    if (!audioData.results?.content?.length) {
      console.log(`[API] No audio found for ${speciesCode}`);
      return null;
    }

    // 先頭ほど優先される重み付きランダムで音声を選択
    const audioItems = audioData.results.content;
    const selectedAudio = weightedRandomSelect<any>(audioItems);

    // 画像を取得
    const photoParams = new URLSearchParams({
      taxonCode: speciesCode,
      mediaType: 'photo',
      count: '5',
      sort: 'rating_rank_desc'
    });

    if (regionCode) {
      photoParams.append('regionCode', regionCode);
    }

    const photoResponse = await fetch(`${MACAULAY_BASE_URL}/search?${photoParams}`);
    const photoData = await photoResponse.json();

    const photoUrl = photoData.results?.content?.[0]?.previewUrl || selectedAudio.previewUrl;

    // 動画を取得
    const videoParams = new URLSearchParams({
      taxonCode: speciesCode,
      mediaType: 'video',
      count: '10',
      sort: 'rating_rank_desc'
    });

    if (regionCode) {
      videoParams.append('regionCode', regionCode);
    }

    const videoResponse = await fetch(`${MACAULAY_BASE_URL}/search?${videoParams}`);
    const videoData = await videoResponse.json();

    const videoUrl = videoData.results?.content?.[0]?.mediaUrl || null;

    return {
      audioUrl: selectedAudio.mediaUrl,
      imageUrl: photoUrl,
      videoUrl: videoUrl,
      recordist: selectedAudio.userDisplayName
    };
  } catch (error) {
    console.error('[API] Error fetching Macaulay media:', error);
    return null;
  }
}

/**
 * 鳥の音声を検索し、ランダムに 1 件の `Bird` を返します。
 * eBird APIで最近の観測データを取得し、Macaulay Library APIで音声と画像を取得します。
 * 体長30cm以下（体重200g以下）の鳥のみが対象です。
 *
 * @param regionCode 検索対象の地域コード（未指定時は東京周辺）
 * @returns 見つかった `Bird` オブジェクト、または見つからない場合は `null`
 */
export async function searchBirdAudio(regionCode?: string): Promise<Bird | null> {
  console.log('[API] Searching birds (≤30cm), region:', regionCode || 'Tokyo area');
  const notFoundObj = {
    commonName: 'Error',
    scientificName: '',
    speciesCode: '',
    audioUrl: '',
    message: 'eBirdから観測データを取得できませんでした。地域を変更するか、しばらく時間をおいて再度お試しください。'
  };
  
  try {
    // ステップ1: eBirdから最近の観測データを取得（サイズフィルタリング済み）
    const observations = await getRecentObservations(regionCode);
    
    if (!observations.length) {
      console.log('[API] No observations found for small birds (≤30cm)');
      return {...notFoundObj, message: '体長30cm以下の鳥の観測データが見つかりませんでした。地域を変更するか、しばらく時間をおいて再度お試しください。'};
    }

    // eBird taxonomy データを読み込み（commonName変換用）
    const taxonomyInfo = await loadEBirdTaxonomy();

    console.log(`[API] Trying to find media for ${observations.length} small bird observations`);

    // ステップ2: 観測データをシャッフル
    const shuffledObs = [...observations].sort(() => Math.random() - 0.5);

    // ステップ3: メディアが見つかるまで試行
    for (const obs of shuffledObs) {
      console.log(`[API] Trying species: ${obs.comName} (${obs.speciesCode})`);
      
      const media = await getMacaulayMedia(obs.speciesCode, regionCode);
      
      if (media) {
        // speciesCodeからloadEBirdTaxonomyの結果を使ってcommonNameを取得
        const commonName = taxonomyInfo[obs.speciesCode]?.commonName || obs.comName;
        console.log('[API] Found bird with media:', commonName);
        return {
          commonName: commonName,
          scientificName: obs.sciName,
          speciesCode: obs.speciesCode,
          audioUrl: media.audioUrl,
          imageUrl: media.imageUrl,
          videoUrl: media.videoUrl,
          recordist: media.recordist,
          location: obs.locName,
          observedDate: obs.obsDt
        };
      }
    }

    console.log('[API] No media found for any observation');
    return {...notFoundObj, message: '音声データが見つかりませんでした。しばらく時間をおいて再度お試しください。'};
  } catch (error) {
    console.error('[API] Error in searchBirdAudio:', error);
    return {...notFoundObj , message: `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`} as Bird;
  }
}
