/**
 * Offscreen ドキュメントの音声状態の型定義
 */
export interface OffscreenAudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
}

/**
 * Offscreen ドキュメントの管理クラス
 */
class OffscreenManager {
  private offscreenCreated = false;

  /**
   * Offscreen ドキュメントのセットアップを行います。
   * 既存コンテキストを確認し、未作成の場合は作成します。
   *
   * 副作用:
   * - `offscreenCreated` を現在の状態に同期します。
   *
   * 失敗時:
   * - 作成に失敗した場合はエラーを投げます。
   */
  async setupOffscreen(): Promise<void> {
    try {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT' as any],
      });

      if (existingContexts.length > 0) {
        this.offscreenCreated = true;
        return;
      }

      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('/offscreen.html'),
        reasons: ['AUDIO_PLAYBACK' as any],
        justification: 'Playing continuous bird songs'
      });
      this.offscreenCreated = true;
      console.log('[OffscreenManager] Offscreen document created');
    } catch (error) {
      this.offscreenCreated = false;
      console.error('[OffscreenManager] Failed to create offscreen:', error);
      throw error;
    }
  }

  /**
   * Offscreen 側の音声状態を取得します。
   * 必要に応じて Offscreen を作成し、取得に失敗した場合は 1 回だけ再作成後に再試行します。
   *
   * @returns Offscreen の音声状態
   */
  async getOffscreenState(): Promise<OffscreenAudioState> {
    try {
      await this.setupOffscreen();
      // offscreen.ts から getAudioState メッセージを受信
      const response = await chrome.runtime.sendMessage({ type: 'getAudioState' });
      console.log('[OffscreenManager] Offscreen state:', response);
      return response;
    } catch (error) {
      console.warn('[OffscreenManager] getAudioState failed, retrying after recreating offscreen:', error);
      try {
        // 再作成してワンリトライ
        this.offscreenCreated = false;
        await this.setupOffscreen();
        // offscreen.ts から getAudioState メッセージを受信
        const retryResponse = await chrome.runtime.sendMessage({ type: 'getAudioState' });
        console.log('[OffscreenManager] Offscreen state (after retry):', retryResponse);
        return retryResponse;
      } catch (retryError) {
        console.error('[OffscreenManager] Failed to get offscreen state after retry:', retryError);
        return {
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          duration: 0
        };
      }
    }
  }

  /**
   * Offscreen ドキュメントが作成されているかどうかを取得します。
   *
   * @returns 作成されている場合は true
   */
  isCreated(): boolean {
    return this.offscreenCreated;
  }

  /**
   * Offscreen ドキュメントの作成状態をリセットします。
   * （再作成が必要な場合に使用）
   */
  resetCreatedFlag(): void {
    this.offscreenCreated = false;
  }
}

// シングルトンインスタンスをエクスポート
export const offscreenManager = new OffscreenManager();

