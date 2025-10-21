import { useState, useEffect } from 'react';
import type { Bird } from '../typeConst';

const REGIONS = [
  { code: '', name: 'All Regions' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
];

interface BirdSongAppProps {
  onOpenInNewWindow?: () => void;
}

export default function BirdSongApp({ onOpenInNewWindow }: BirdSongAppProps) {
  const [region, setRegion] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingRemainingTime, setWaitingRemainingTime] = useState(0);
  const [currentBird, setCurrentBird] = useState<Bird | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [autoResume, setAutoResume] = useState(true);

  // 🔥 Offscreenの状態を同期
  const syncWithOffscreen = async () => {
    console.log('[BirdSongApp] Syncing with offscreen...');
    setSyncing(true);
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
      console.log('[BirdSongApp] Full state received:', response);
      
      if (response.isPlaying) {
        setIsPlaying(true);
        setIsPaused(response.isPaused || false);
        setIsWaiting(response.isWaiting || false);
        setWaitingRemainingTime(response.waitingRemainingTime || 0);
        setCurrentBird(response.currentBird);
        setRegion(response.region || '');
        
        console.log('[BirdSongApp] State synced:', {
          isPlaying: true,
          isPaused: response.isPaused,
          isWaiting: response.isWaiting,
          waitingRemainingTime: response.waitingRemainingTime,
          bird: response.currentBird?.commonName
        });
      } else {
        // 再生していない場合は初期状態
        setIsPlaying(false);
        setIsPaused(false);
        setIsWaiting(false);
        setWaitingRemainingTime(0);
        setCurrentBird(null);
      }
    } catch (error) {
      console.error('[BirdSongApp] Failed to sync state:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Backgroundからのイベントを受信
  useEffect(() => {
    const messageListener = (msg: any) => {
      console.log('[BirdSongApp] Received message:', msg.type, msg);

      if (msg.type === 'popupEvent') {
        if (msg.event === 'birdChanged') {
          console.log('[BirdSongApp] Bird changed:', msg.data);
          setCurrentBird(msg.data);
          // 再生中のイベントなので isPlaying を true に保つ
          setIsPlaying(true);
          setLoading(false);
        } else if (msg.event === 'audioStarted') {
          console.log('[BirdSongApp] Audio started');
          setIsPlaying(true);
          setIsPaused(false);
          setLoading(false);
        } else if (msg.event === 'audioPaused') {
          console.log('[BirdSongApp] Audio paused');
          // 一時停止してもセッションは継続中なので isPlaying は true のまま
          setIsPlaying(true);
          setIsPaused(true);
        } else if (msg.event === 'audioResumed') {
          console.log('[BirdSongApp] Audio resumed');
          setIsPlaying(true);
          setIsPaused(false);
        } else if (msg.event === 'waitingStarted') {
          console.log('[BirdSongApp] Waiting started');
          setIsWaiting(true);
          setWaitingRemainingTime(60000); // 60秒から開始
        } else if (msg.event === 'waitingCancelled') {
          console.log('[BirdSongApp] Waiting cancelled');
          setIsWaiting(false);
          setWaitingRemainingTime(0);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // カウントダウン用のuseEffect
  useEffect(() => {
    if (!isWaiting || waitingRemainingTime <= 0) {
      return;
    }

    const interval = setInterval(async () => {
      // バックグラウンドから最新の残り時間を取得
      try {
        const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
        if (response.waitingRemainingTime !== undefined) {
          setWaitingRemainingTime(response.waitingRemainingTime);
          
          // 待機が終了した場合
          if (response.waitingRemainingTime <= 0) {
            setIsWaiting(false);
          }
        }
      } catch (error) {
        console.error('[BirdSongApp] Failed to get remaining time:', error);
        // エラーの場合は手動でカウントダウン
        setWaitingRemainingTime(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setIsWaiting(false);
            return 0;
          }
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWaiting, waitingRemainingTime]);

  // 次の鳥を再生
  const playNext = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'next',
        region
      });
      if (response.bird) {
        setCurrentBird(response.bird);
      }
    } catch (error) {
      console.error('[BirdSongApp] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 再生開始
  const handleStart = async () => {
    setLoading(true);
    try {
      await chrome.storage.sync.set({ region });
      
      const response = await chrome.runtime.sendMessage({
        type: 'start',
        region
      });

      if (response.success && response.bird) {
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentBird(response.bird);
      }
    } catch (error) {
      console.error('[BirdSongApp] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 一時停止
  const handlePause = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'pause' });
      setIsPaused(true);
    } catch (error) {
      console.error('[BirdSongApp] Pause error:', error);
    }
  };

  // 再開
  const handleResume = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'resume' });
      setIsPaused(false);
    } catch (error) {
      console.error('[BirdSongApp] Resume error:', error);
    }
  };

  // 停止
  const handleStop = async () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentBird(null);

    try {
      await chrome.runtime.sendMessage({ type: 'stop' });
    } catch (error) {
      console.error('[BirdSongApp] Stop error:', error);
    }
  };

  // オプション設定の保存
  const saveAutoResumeSetting = async (value: boolean) => {
    try {
      await chrome.storage.sync.set({ autoResume: value });
      setAutoResume(value);
    } catch (error) {
      console.error('[BirdSongApp] Failed to save autoResume setting:', error);
    }
  };

  // 🔥 初期化: Offscreenと同期
  useEffect(() => {
    const loadSettings = async () => {
      // まず設定を読み込む
      const settings = await chrome.storage.sync.get(['region', 'autoResume']);
      setRegion(settings.region || '');
      setAutoResume(settings.autoResume !== false); // デフォルトはtrue

      // 🔥 Offscreenの状態と同期
      await syncWithOffscreen();
    };
    
    loadSettings();
  }, []);

  // ローディング中の表示
  if (syncing) {
    return (
      <div className="popup-container">
        <header className="popup-header">
          <h1>🎵 BirdSong</h1>
          <p className="subtitle">Continuous Bird Sounds</p>
        </header>
        <main className="popup-content">
          <div className="info-section" style={{ padding: '40px 20px' }}>
            <p className="info-text">
              ⏳ Syncing with player...
            </p>
          </div>
        </main>
      </div>
    );
  }

  console.log(`[BirdSongApp] isPlaying: ${isPlaying}, isPaused: ${isPaused}, currentBird: ${currentBird?.commonName}, region: ${region}, loading: ${loading}, syncing: ${syncing}`);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🎵 BirdSong</h1>
        <p className="subtitle">Continuous Bird Sounds</p>
        {onOpenInNewWindow && (
          <button
            className="btn btn-secondary btn-small"
            onClick={onOpenInNewWindow}
            style={{ marginTop: '10px' }}
          >
            🔗 ポップアップで開く
          </button>
        )}
      </header>

      <main className="popup-content">
        {/* 地域選択 */}
        <section className="region-section">
          <label htmlFor="region-select">
            <strong>Birding Region:</strong>
          </label>
          <select
            id="region-select"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={isPlaying}
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="help-text">
            {isPlaying ? 'Stop to change region' : 'Select a region'}
          </p>
        </section>

        {/* オプション設定 */}
        <section className="options-section">
          <div className="option-item">
            <label htmlFor="auto-resume-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="auto-resume-checkbox"
                type="checkbox"
                checked={autoResume}
                onChange={(e) => saveAutoResumeSetting(e.target.checked)}
              />
              <span><strong>Auto-resume playback on browser startup</strong></span>
            </label>
            <p className="help-text" style={{ marginLeft: '24px', fontSize: '12px', color: '#666' }}>
              Automatically resume playback when browser starts (if was playing before)
            </p>
          </div>
        </section>

        {/* コントロール */}
        <section className="control-section">
          {!isPlaying ? (
            <button
              className="btn btn-primary btn-large"
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? '⏳ Loading...' : '▶️ Start Playback'}
            </button>
          ) : (
            <div className="playback-controls">
              {!isPaused ? (
                <button
                  className="btn btn-warning"
                  onClick={handlePause}
                  disabled={loading}
                >
                  ⏸️ Pause
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={handleResume}
                  disabled={loading}
                >
                  ▶️ Resume
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={playNext}
                disabled={loading || isPaused || isWaiting}
              >
                ⏭️ Skip
              </button>
              <button
                className="btn btn-danger"
                onClick={handleStop}
                disabled={loading}
              >
                ⏹️ Stop
              </button>
            </div>
          )}
        </section>

        {/* 🔥 同期状態の表示 */}
        {isPlaying && (
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            textAlign: 'center', 
            marginTop: '-8px',
            marginBottom: '8px'
          }}>
            🔄 Synced with background player
          </div>
        )}

        {/* 待機状態の表示 */}
        {isWaiting && (
          <section className="waiting-info">
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              margin: '10px 0'
            }}>
              <h2 style={{ color: '#0066cc', margin: '0 0 10px 0' }}>⏳ Waiting...</h2>
              <p style={{ margin: '0', color: '#666' }}>
                Next bird will start in {Math.ceil(waitingRemainingTime / 1000)} seconds
              </p>
            </div>
          </section>
        )}

        {/* 鳥情報 */}
        {isPlaying && currentBird && !isWaiting && (
          <section className="bird-info">
            <h2>{isPaused ? '⏸️ Paused:' : '🎵 Now Playing:'}</h2>
            
            {currentBird.imageUrl && (
              <div className="bird-image-container">
                <img
                  src={currentBird.imageUrl}
                  alt={currentBird.commonName}
                  className="bird-image"
                />
              </div>
            )}

            <div className="bird-details">
              <h3 className="bird-name">{currentBird.commonName}</h3>
              <p className="scientific-name">
                <em>{currentBird.scientificName}</em>
              </p>

              {currentBird.location && (
                <p className="location">📍 {currentBird.location}</p>
              )}

              {currentBird.recordist && (
                <p className="recordist">🎤 {currentBird.recordist}</p>
              )}
            </div>
          </section>
        )}

        {!isPlaying && (
          <section className="info-section">
            <p className="info-text">
              🎵 Press play to start listening!
            </p>
            <p className="info-text-small">
              ✅ Now plays even when popup is closed!
            </p>
          </section>
        )}
      </main>

      <footer className="popup-footer">
        <p className="credit">
          Powered by <a href="https://www.macaulaylibrary.org/" target="_blank">Macaulay Library</a>
        </p>
      </footer>
    </div>
  );
}
