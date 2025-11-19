import { useState, useEffect, useCallback } from 'react';

/**
 * 再生履歴ダウンロードセクション  
 * 再生した音声をまとめてZIPファイルとしてダウンロードします。ダウンロード後、履歴はクリアされます。
 */
export default function DownloadSection() {
  const [downloading, setDownloading] = useState(false);
  const [audioHistoryCount, setAudioHistoryCount] = useState(0);

  // 💾 音声履歴の件数を取得
  const updateAudioHistoryCount = useCallback(async () => {
    try {
      console.log('[DownloadSection] Requesting audio history count...');
      const response = await chrome.runtime.sendMessage({ type: 'getAudioHistoryCount' });
      console.log('[DownloadSection] Audio history count response:', response);
      setAudioHistoryCount(response.count || 0);
      console.log('[DownloadSection] Audio history count updated to:', response.count || 0);
    } catch (error) {
      console.error('[DownloadSection] Failed to get audio history count:', error);
    }
  }, []);

  // Backgroundからのイベントを受信して音声履歴件数を更新
  useEffect(() => {
    const messageListener = (msg: any) => {
      if (msg.type === 'popupEvent') {
        // 新しい鳥の音声が選択された時、または音声の再生が開始された時
        if (msg.event === 'birdChanged' || msg.event === 'audioStarted') {
          console.log('[DownloadSection] Audio history count update triggered by:', msg.event);
          updateAudioHistoryCount();
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 初期化時に音声履歴件数を取得
    updateAudioHistoryCount();

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [updateAudioHistoryCount]);

  // 💾 音声履歴をダウンロード
  const handleDownload = async () => {
    if (audioHistoryCount === 0) {
      alert('ダウンロードする音声がありません。');
      return;
    }

    setDownloading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'downloadAudioHistory' });
      if (response.success) {
        alert(`${audioHistoryCount}件の音声をZIPファイルとしてダウンロードしました。`);
        setAudioHistoryCount(0);
      } else {
        alert(`ダウンロードに失敗しました：${response.error}`);
      }
    } catch (error) {
      console.error('[DownloadSection] Download error:', error);
      alert('ダウンロード中にエラーが発生しました。');
    } finally {
      setDownloading(false);
    }
  };
  return (
    <section className="download-section" style={{ marginTop: '20px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div>
          <strong>💾 再生履歴ダウンロード</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            再生した音声: {audioHistoryCount}件
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading || audioHistoryCount === 0}
          style={{ minWidth: '120px' }}
        >
          {downloading ? '⬇️ ダウンロード中...' : '💾 ZIPダウンロード'}
        </button>
      </div>
      <p className="help-text" style={{ marginTop: '8px', fontSize: '11px' }}>
        📌 再生した音声をまとめてZIPファイルとしてダウンロードします。ダウンロード後、履歴はクリアされます。
      </p>
    </section>
  );
}

