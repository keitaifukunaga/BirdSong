/**
 * BirdSongApp - メインのアプリケーションコンポーネント
 * 
 * 鳥の鳴き声を連続再生するChrome拡張機能のポップアップUIを提供します。
 * - 地域選択による鳥の検索
 * - 再生/一時停止/停止の制御
 * - 現在再生中の鳥の情報表示
 * - オフスクリーンドキュメント（背景プレイヤー）との状態同期
 * - ポップアップを閉じても再生が継続する機能
 */
import { useState, useEffect } from 'react';
import type { Bird } from '../typeConst';
import PlaybackControls from './ui/PlaybackControls';
import BirdInfo from './ui/BirdInfo';
import RegionSelector from './ui/RegionSelector';
import DownloadSection from './ui/DownloadSection';
import WaitingStatus from './ui/WaitingStatus';
import OptionsSection from './ui/OptionsSection';
import { useMessageListener } from './ui/useMessageListener';
import { useOffscreenSync } from './ui/useOffscreenSync';
import { getRegionCode, i18n } from '../util/commonfunc';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ExternalLink } from 'lucide-react';

interface BirdSongAppProps {
  onOpenInNewWindow?: () => void;
}

export default function BirdSongApp({ onOpenInNewWindow }: BirdSongAppProps) {
  // 選択された地域（空文字列の場合は全地域）
  const [region, setRegion] = useState('');
    // 再生中かどうかの状態
  const [isPlaying, setIsPlaying] = useState(false);
  // 一時停止中かどうかの状態
  const [isPaused, setIsPaused] = useState(false);
  // 現在再生中の鳥の情報
  const [currentBird, setCurrentBird] = useState<Bird | null>(null);
  // ローディング状態（鳥のデータ取得中など）
  const [loading, setLoading] = useState(false);

  // 🔥 Offscreenの状態を同期
  const { syncing, syncWithOffscreen } = useOffscreenSync({
    setIsPlaying,
    setIsPaused,
    setCurrentBird,
    setRegion
  });

  // Backgroundからのイベントを受信
  useMessageListener({
    setCurrentBird,
    setIsPlaying,
    setIsPaused,
    setLoading
  });

  // 🔥 初期化: Offscreenと同期
  useEffect(() => {
    const loadSettings = async () => {
      // まず設定を読み込む
      const settings = await chrome.storage.sync.get(['region']);
      // 設定が存在しない場合（初回取得）、ブラウザの言語設定からリージョンを取得
      if (!settings.region) {
        const regionCode = getRegionCode();
        if (regionCode) {
          // リージョンを設定して保存
          await chrome.storage.sync.set({ region: regionCode });
          setRegion(regionCode);
        } else {
          setRegion('');
        }
      } else {
        setRegion(settings.region);
      }

      // 🔥 Offscreenの状態と同期
      await syncWithOffscreen();
    };
    
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // syncWithOffscreen と updateAudioHistoryCount は useCallback でメモ化されているため、依存配列に追加不要

  // ローディング中の表示
  if (syncing) {
    return (
      <div className="popup-container">
        <header className="popup-header">
          <h1>🎵 BirdSong</h1>
          <p className="subtitle">{i18n('appSubtitle')}</p>
        </header>
        <main className="popup-content">
          <div className="info-section py-10 px-5">
            <p className="info-text">
              {i18n('syncingWithPlayer')}
            </p>
          </div>
        </main>
      </div>
    );
  }

  console.log(`[BirdSongApp] isPlaying: ${isPlaying}, isPaused: ${isPaused}, currentBird: ${currentBird?.commonName}, region: ${region}, loading: ${loading}, syncing: ${syncing}`);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="popup-container">
        {/* ヘッダー */}
        <header className="popup-header relative">
          <WaitingStatus />
          <div className="flex items-center justify-center gap-2">
            {/* タイトル */}
            <div className="flex flex-col items-center w-[90%]">
              <h1 className="mb-1">🎵 BirdSong</h1>
              <p className="subtitle m-0">{i18n('appSubtitle')}</p>
            </div>
            {/* 別ウインドウで開くボタン */}
            {onOpenInNewWindow && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-end justify-center mt-auto mb-1">
                    <button
                      className="btn btn-sub-icon p-2 h-auto"
                      onClick={onOpenInNewWindow}
                      aria-label={i18n('openInNewWindow')}
                    >
                      <ExternalLink size={18} />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{i18n('openInNewWindow')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </header>

      {/* メインコンテンツ */}
      <main className="popup-content">
        {/* 地域選択 */}
        <RegionSelector
          region={region}
          onChange={setRegion}
          disabled={isPlaying}
        />

        {/* オプション設定 */}
        <OptionsSection />

        {/* コントロール */}
        <PlaybackControls
          isPlaying={isPlaying}
          isPaused={isPaused}
          loading={loading}
          region={region}
          setLoading={setLoading}
          setIsPlaying={setIsPlaying}
          setIsPaused={setIsPaused}
          setCurrentBird={setCurrentBird}
        />

        {/* 💾 ダウンロードセクション */}
        {/* <DownloadSection /> */}

        {/* 🔥 同期状態の表示 */}
        {/* {isPlaying && (
          <div className="text-[10px] text-gray-600 text-center -mt-2 mb-2">
            🔄 Synced with background player
          </div>
        )} */}

        {/* 鳥情報 */}
        {currentBird && (
          <BirdInfo bird={currentBird} isPaused={isPaused} isPlaying={isPlaying} />
        )}

        {!isPlaying && (
          <section className="info-section">
            <p className="info-text">
              {i18n('pressPlayToStart')}
            </p>
            <p className="info-text-small">
              {i18n('playsWhenClosed')}
            </p>
          </section>
        )}
      </main>

      {/* フッター */}
      <footer className="popup-footer">
        <p className="credit">
          {i18n('poweredBy')} <a href="https://www.macaulaylibrary.org/" target="_blank">Macaulay Library</a>
        </p>
      </footer>
      </div>
    </TooltipProvider>
  );
}
