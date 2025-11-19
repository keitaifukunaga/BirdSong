import type { Bird } from '../typeConst';

/**
 * 音声履歴のエントリ型定義
 */
export interface AudioHistoryEntry {
  url: string;
  birdName: string;
  timestamp: number;
}

/**
 * 音声履歴を管理するクラス
 */
class AudioHistoryManager {
  private history: AudioHistoryEntry[] = [];

  /**
   * 音声URLを履歴に追加します。
   *
   * @param bird 追加する鳥の情報
   */
  addToHistory(bird: Bird): void {
    this.history.push({
      url: bird.audioUrl,
      birdName: bird.commonName,
      timestamp: Date.now()
    });
    console.log(`[AudioHistory] Audio URL added to history. Total: ${this.history.length}`);
  }

  /**
   * 履歴の件数を取得します。
   *
   * @returns 履歴の件数
   */
  getHistoryCount(): number {
    return this.history.length;
  }

  /**
   * 履歴をクリアします。
   */
  clearHistory(): void {
    const count = this.history.length;
    this.history = [];
    console.log(`[AudioHistory] History cleared. Removed ${count} entries.`);
  }

  /**
   * 履歴をZIPファイルとしてダウンロードします。
   * ダウンロード後、履歴は自動的にクリアされます。
   *
   * @returns ダウンロードした件数
   * @throws エラーが発生した場合は例外を投げます
   */
  async downloadHistory(): Promise<number> {
    if (this.history.length === 0) {
      throw new Error('No audio history to download');
    }

    console.log(`[AudioHistory] Downloading ${this.history.length} audio files...`);

    // JSZipを動的にインポート
    const JSZip = await import('jszip');
    const zip = new JSZip.default();

    // 各音声ファイルをZIPに追加
    for (let i = 0; i < this.history.length; i++) {
      const item = this.history[i];
      try {
        const response = await fetch(item.url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // ファイル名を生成 (鳥名 + タイムスタンプ)
        const date = new Date(item.timestamp);
        const dateStr = date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const fileName = `${i + 1}_${item.birdName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.mp3`;

        zip.file(fileName, arrayBuffer);
        console.log(`[AudioHistory] Added ${fileName} to ZIP`);
      } catch (error) {
        console.error(`[AudioHistory] Failed to download ${item.url}:`, error);
      }
    }

    // ZIPファイルを生成（base64形式）
    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    // Data URLを作成
    const dataUrl = `data:application/zip;base64,${zipBase64}`;

    // ZIPファイルをダウンロード
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `BirdSong_History_${timestamp}.zip`;

    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: true
    });

    // ダウンロード後に履歴をクリア
    const downloadedCount = this.history.length;
    this.clearHistory();
    console.log('[AudioHistory] Audio history cleared after download');

    return downloadedCount;
  }

  /**
   * 現在の履歴を取得します（デバッグ用）。
   *
   * @returns 履歴のコピー
   */
  getHistory(): readonly AudioHistoryEntry[] {
    return [...this.history];
  }
}

// シングルトンインスタンスをエクスポート
export const audioHistoryManager = new AudioHistoryManager();

