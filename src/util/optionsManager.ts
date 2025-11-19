/**
 * オプション設定の型定義
 */
export interface Options {
  autoResume: boolean;
}

/**
 * 起動理由の型定義
 */
export type StartupReason = 'unknown' | 'startup' | 'installed';

/**
 * オプション設定を取得します。
 *
 * @returns オプション設定オブジェクト
 */
export async function getOptions(): Promise<Options> {
  try {
    const result = await chrome.storage.sync.get(['autoResume']);
    return {
      autoResume: result.autoResume === true // デフォルトはfalse
    };
  } catch (error) {
    console.error('[OptionsManager] Failed to get options:', error);
    return { autoResume: false };
  }
}

/**
 * 再生再開すべきかを判定します。
 *
 * @param options オプション設定
 * @param reason 起動理由
 * @returns 再生再開すべきかどうか
 */
export function shouldResumePlayback(options: Options, reason: StartupReason): boolean {
  // サービスワーカーのkill→自動起動時は無条件で再生再開
  if (reason === 'unknown') {
    console.log('[OptionsManager] Service worker restart detected, resuming unconditionally');
    return true;
  }

  // ブラウザ起動時や拡張機能インストール/更新時はオプション設定に従う
  if (reason === 'startup' || reason === 'installed') {
    console.log('[OptionsManager] Browser startup/install detected, checking autoResume option:', options.autoResume);
    return options.autoResume;
  }

  // その他の場合は再生再開しない
  console.log('[OptionsManager] Unknown startup reason, not resuming');
  return false;
}

