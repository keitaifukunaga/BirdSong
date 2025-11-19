import { EBIRD_API_KEY, EBIRD_BASE_URL } from '../typeConst';
import { getEBirdLocale } from './commonfunc';
interface EBirdTaxonomy {
  speciesCode: string;
  order: string;
  family: string;
  commonName: string;
  scientificName: string;
}

// eBird taxonomy データのキャッシュ (speciesCode -> EBirdTaxonomy)
let ebirdTaxonomyCache: Record<string, EBirdTaxonomy> | null = null;

const urlbase = `${EBIRD_BASE_URL}/ref/taxonomy/ebird`


/**
 * eBird taxonomy APIから種のマッピング情報を取得
 * @returns speciesCode -> 種名のマップ
 */
export async function loadEBirdTaxonomy(locale?: string): Promise<Record<string, EBirdTaxonomy>> {
  if (ebirdTaxonomyCache !== null) {
    return ebirdTaxonomyCache;
  }

  try {
    // eBird taxonomy APIを実行
    // 条件：
    const taxonomyUrl = `${urlbase}?fmt=json&cat=species&locale=${locale || getEBirdLocale()}`;
    console.log('[API] Fetching taxonomy from eBird:', taxonomyUrl);

    const response = await fetch(taxonomyUrl, {
      headers: {
        'x-ebirdapitoken': EBIRD_API_KEY || ''
      }
    });

    if (!response.ok) {
      console.error('[API] eBird taxonomy API error:', response.status, response.statusText);
      ebirdTaxonomyCache = {};
      return ebirdTaxonomyCache;
    }

    const taxonomy = await response.json();
    console.log(`[API] Fetched ${taxonomy.length} species from taxonomy`);

    // speciesCode -> EBirdTaxonomy にマッピング
    const result: Record<string, EBirdTaxonomy> = {};
    for (const species of taxonomy) {
      result[species.speciesCode] = {
          speciesCode: species.speciesCode,
          order: species.order,
          family: species.familyCode || species.familyComName || '',
          commonName: species.comName,
          scientificName: species.sciName

      };
    }

    console.log(`[API] Mapped ${Object.keys(result).length} species codes to scientific names`);
    ebirdTaxonomyCache = result;
    return result;
    
  } catch (error) {
    console.error('[API] Error loading eBird taxonomy:', error);
    ebirdTaxonomyCache = {};
    return {};
  }
}
