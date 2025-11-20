import { useState, useEffect, useCallback, useRef } from 'react';
import type { Bird } from '../../typeConst';
import { i18n } from '../../util/commonfunc';

interface BirdInfoProps {
  bird: Bird | null;
  isPaused: boolean;
  isPlaying: boolean;
}

export default function BirdInfo({ bird, isPaused, isPlaying }: BirdInfoProps) {
  const [isWaiting, setIsWaiting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const previousBirdRef = useRef<Bird | null>(null);

  // 動画再生終了時のハンドラ
  const handleVideoEnded = useCallback(() => {
    console.log('[BirdInfo] Video ended, switching to image');
    setShowVideo(false);
  }, []);

  // 画像クリック時のハンドラ
  const handleImageClick = useCallback(() => {
    if (bird?.videoUrl) {
      console.log('[BirdInfo] Image clicked, switching to video');
      setShowVideo(true);
    }
  }, [bird?.videoUrl]);

  // 初期状態を取得
  const syncState = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getFullState' });
      if (response.isWaiting !== undefined) {
        setIsWaiting(response.isWaiting || false);
      }
    } catch (error) {
      console.error('[BirdInfo] Failed to get initial state:', error);
    }
  }, []);

  // birdが変わったタイミングで動画がある場合は動画を表示
  useEffect(() => {
    if (bird && bird !== previousBirdRef.current) {
      previousBirdRef.current = bird;

      // 動画が利用可能な場合は動画を表示、そうでなければ画像を表示
      const hasVideo = !!bird.videoUrl;
      setShowVideo(hasVideo);
    }
  }, [bird]);

  // Backgroundからのイベントを受信
  useEffect(() => {
    const messageListener = (msg: any) => {
      if (msg.type === 'popupEvent') {
        // 次の鳥の音声を待機する期間が開始された時
        if (msg.event === 'waitingStarted') {
          console.log('[BirdInfo] Waiting started');
          setIsWaiting(true);
        } 
        // 待機がキャンセルされた時
        else if (msg.event === 'waitingCancelled') {
          console.log('[BirdInfo] Waiting cancelled');
          setIsWaiting(false);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // 初期化時に状態を取得
    syncState();

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [syncState]);

  // 表示条件: 再生中、鳥情報があり、待機中でない場合のみ表示
  if (!bird ) {
    return null;
  }

  // エラーメッセージがある場合はエラー表示
  if (bird.message) {
    return (
      <section className="bird-info">
        <div className="bird-details" style={{ padding: '20px', textAlign: 'center' }}>
          <h3 style={{ color: '#d32f2f', marginBottom: '10px' }}>{i18n('error')}</h3>
          <p style={{ color: '#666', lineHeight: '1.6' }}>{bird.message}</p>
        </div>
      </section>
    );
  }

  // 画像と動画が利用可能かチェック
  const hasImage = !!bird.imageUrl;
  const hasVideo = !!bird.videoUrl;

  return (
    <section className="bird-info">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1 justify-between">
        <span>{isPaused ? i18n('paused') : i18n('nowPlaying')}</span>
        {/* eBirdへのリンク */}
        <a
          href={`https://ebird.org/species/${bird.speciesCode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:opacity-80 transition-opacity"
          title="View on eBird"
        >
          <span className="text-xl">🐦</span>
          <span className="text-xs">eBird</span>
        </a>
      </div>

      {/* 画像または動画の表示 */}
      {(hasImage || hasVideo) && (
        <div className="bird-image-container">
          {showVideo && hasVideo ? (
            <video
              src={bird.videoUrl}
              muted
              autoPlay
              className="bird-image"
              style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
              onEnded={handleVideoEnded}
            >
              {i18n('videoNotSupported')}
            </video>
          ) : hasImage ? (
            <img
              src={bird.imageUrl}
              alt={bird.commonName}
              className="bird-image"
              onClick={handleImageClick}
              style={{ cursor: hasVideo ? 'pointer' : 'default' }}
            />
          ) : null}
        </div>
      )}

      <div className="bird-details">
        <div className="flex flex-row items-center justify-start">
          <div className="bird-name">{bird.commonName}</div>
          <div className="scientific-name">
            <em>{bird.scientificName}</em>
          </div>
        </div>

        {bird.location && (
          <p className="location">📍 {bird.location}</p>
        )}

        {bird.recordist && (
          <p className="recordist">🎤 {bird.recordist}</p>
        )}
      </div>
    </section>
  );
}

