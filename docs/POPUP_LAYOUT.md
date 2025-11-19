# ポップアップ画面レイアウト定義

## 概要

このドキュメントは、BirdSongApp.tsxのポップアップ画面のレイアウト構造とスタイル定義を説明します。ポップアップ画面は、鳥の鳴き声を連続再生するChrome拡張機能のメインUIを提供します。

## 全体構造

ポップアップ画面は、以下の3層構造で構成されています：

```
popup-container
├── popup-header (ヘッダー)
├── popup-content (メインコンテンツ)
└── popup-footer (フッター)
```

### コンテナ（popup-container）

- **最小サイズ**: 幅450px × 高さ550px
- **背景色**: 白色
- **レイアウト**: Flexbox（縦方向）
- **パディング**: 0.5rem
- **スタイル定義**: `entrypoints/style.css` の `.popup-container`

## セクション詳細

### 1. ヘッダー（popup-header）

**位置**: 最上部

**スタイル**:
- 背景: グラデーション（#667eea → #764ba2）
- テキスト色: 白色
- パディング: 1.5rem
- テキスト配置: 中央揃え
- 角丸: 0.5rem

**コンテンツ**:
- **タイトル**: `🎵 BirdSong` (フォントサイズ: 1.8rem)
- **サブタイトル**: `Continuous Bird Sounds` (フォントサイズ: 0.9rem, 透明度: 0.9)
- **条件付きボタン**: `🔗 ポップアップで開く` ボタン
  - 表示条件: `onOpenInNewWindow` プロップが提供されている場合のみ
  - スタイル: `btn btn-secondary btn-small`
  - マージン: 上10px

**コード参照**:
```111:126:src/components/BirdSongApp.tsx
  return (
    <div className="popup-container">
      {/* ヘッダー */}
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
```

### 2. メインコンテンツ（popup-content）

**位置**: ヘッダーとフッターの間

**スタイル**:
- Flex: 1（残りのスペースを占有）
- パディング: 1.5rem

**コンポーネント構成**（上から順）:

#### 2.1 地域選択（RegionSelector）

**コンポーネント**: `src/components/ui/RegionSelector.tsx`

**機能**:
- 鳥の検索対象地域を選択
- 再生中は無効化（disabled）

**表示要素**:
- ラベル: `Birding Region:`
- セレクトボックス: 地域一覧から選択
- ヘルプテキスト: 
  - 再生中: `Stop to change region`
  - 停止中: `Select a region`

**スタイル**:
- セクションクラス: `region-section`
- セレクトボックス: `#region-select`
  - 幅: 100%
  - パディング: 0.75rem
  - ボーダー: 2px solid #e0e0e0
  - 角丸: 8px
  - ホバー時: ボーダー色が #667eea に変化

**コード参照**:
```130:135:src/components/BirdSongApp.tsx
        {/* 地域選択 */}
        <RegionSelector
          region={region}
          onChange={setRegion}
          disabled={isPlaying}
        />
```

#### 2.2 オプション設定（OptionsSection）

**コンポーネント**: `src/components/ui/OptionsSection.tsx`

**機能**:
- 自動再開設定の切り替え
- 設定は `chrome.storage.sync` に保存

**表示要素**:
- チェックボックス: `Auto-resume playback on browser startup`
- ヘルプテキスト: `Automatically resume playback when browser starts (if was playing before)`

**スタイル**:
- セクションクラス: `options-section`
- インラインスタイルでレイアウト調整

**コード参照**:
```137:138:src/components/BirdSongApp.tsx
        {/* オプション設定 */}
        <OptionsSection />
```

#### 2.3 再生コントロール（PlaybackControls）

**コンポーネント**: `src/components/ui/PlaybackControls.tsx`

**機能**:
- 再生開始/一時停止/再開/停止
- 次の鳥へのスキップ

**表示状態**:

**停止中**:
- ボタン: `▶️ Start Playback` (幅100%, プライマリカラー)
- ローディング中: `⏳ Loading...`

**再生中**:
- グリッドレイアウト（2列）
  - 1列目: `⏸️ Pause` または `▶️ Resume`（警告/成功カラー）
  - 2列目: `⏭️ Skip`（セカンダリカラー、待機中は無効化）
  - 2行目（全幅）: `⏹️ Stop`（危険カラー）

**スタイル**:
- セクションクラス: `control-section`
- コントロールクラス: `playback-controls`
  - グリッド: 2列、ギャップ0.75rem
  - 最後のボタンは全幅（grid-column: 1 / -1）

**コード参照**:
```140:150:src/components/BirdSongApp.tsx
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
```

#### 2.4 同期状態表示

**表示条件**: `isPlaying === true` の場合のみ

**表示内容**:
- テキスト: `🔄 Synced with background player`
- スタイル: インライン（フォントサイズ10px、色#666、中央揃え）

**コード参照**:
```155:160:src/components/BirdSongApp.tsx
        {/* 🔥 同期状態の表示 */}
        {isPlaying && (
          <div style={SyncStyle}>
            🔄 Synced with background player
          </div>
        )}
```

#### 2.5 待機状態（WaitingStatus）

**コンポーネント**: `src/components/ui/WaitingStatus.tsx`

**表示条件**: `isWaiting === true` の場合のみ

**表示内容**:
- タイトル: `⏳ Waiting...`
- カウントダウン: `Next bird will start in {秒数} seconds`
- 背景色: #f0f8ff
- 角丸: 8px
- パディング: 20px

**機能**:
- 60秒間の待機期間を表示
- 1秒ごとにカウントダウンを更新

**コード参照**:
```162:163:src/components/BirdSongApp.tsx
        {/* 待機状態の表示 */}
        <WaitingStatus />
```

#### 2.6 鳥情報（BirdInfo）

**コンポーネント**: `src/components/ui/BirdInfo.tsx`

**表示条件**: `currentBird !== null` の場合のみ

**表示内容**:

**ヘッダー**:
- 再生中: `🎵 Now Playing:`
- 一時停止中: `⏸️ Paused:`

**メディア表示**:
- 画像/動画切り替えスイッチ（MediaToggle）
  - 表示条件: 画像と動画の両方が利用可能な場合のみ
  - 切り替え: ランダムに初期選択（両方ある場合）
- 画像または動画
  - 画像: `bird.imageUrl`
  - 動画: `bird.videoUrl`（controls付き）
  - リンク: eBirdの種ページへのリンク
  - サイズ: 幅100%、高さ200px（画像）、高さ自動（動画）

**詳細情報**:
- 和名: `bird.commonName` (フォントサイズ: 1.3rem)
- 学名: `bird.scientificName` (イタリック、色#6b7280)
- 場所: `📍 {bird.location}` (条件付き)
- 録音者: `🎤 {bird.recordist}` (条件付き)

**エラー表示**:
- `bird.message` が存在する場合、エラーメッセージを表示

**スタイル**:
- セクションクラス: `bird-info`
  - 背景: グラデーション（#f3f4f6 → #e5e7eb）
  - 角丸: 12px
  - パディング: 1.5rem
  - アニメーション: fadeIn（0.3秒）

**コード参照**:
```165:168:src/components/BirdSongApp.tsx
        {/* 鳥情報 */}
        {currentBird && (
          <BirdInfo bird={currentBird} isPaused={isPaused} isPlaying={isPlaying} />
        )}
```

#### 2.7 情報セクション

**表示条件**: `!isPlaying` の場合のみ

**表示内容**:
- メインテキスト: `🎵 Press play to start listening!`
- サブテキスト: `✅ Now plays even when popup is closed!`

**スタイル**:
- セクションクラス: `info-section`
  - テキスト配置: 中央
  - パディング: 2rem 1rem
- テキストクラス: `info-text` (色#6b7280, フォントサイズ0.95rem)
- サブテキストクラス: `info-text-small` (色#9ca3af, フォントサイズ0.85rem)

**コード参照**:
```170:179:src/components/BirdSongApp.tsx
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
```

### 3. フッター（popup-footer）

**位置**: 最下部

**スタイル**:
- 背景色: #f9fafb
- パディング: 1rem
- テキスト配置: 中央揃え
- ボーダー: 上部に1px solid #e5e7eb

**コンテンツ**:
- クレジット: `Powered by [Macaulay Library](https://www.macaulaylibrary.org/)`
  - フォントサイズ: 0.85rem
  - 色: #6b7280
  - リンク色: #667eea、ホバー時は下線

**コード参照**:
```182:187:src/components/BirdSongApp.tsx
      {/* フッター */}
      <footer className="popup-footer">
        <p className="credit">
          Powered by <a href="https://www.macaulaylibrary.org/" target="_blank">Macaulay Library</a>
        </p>
      </footer>
```

## 特別なレイアウト

### 同期中（syncing）

**表示条件**: `syncing === true` の場合

**レイアウト**:
- ヘッダー: 通常と同じ
- メインコンテンツ: 同期メッセージのみ
  - テキスト: `⏳ Syncing with player...`
  - パディング: 40px 20px

**コード参照**:
```90:107:src/components/BirdSongApp.tsx
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
```

## スタイル定義

### 主要なCSSクラス

#### ボタンスタイル

- `.btn`: ベースボタンスタイル
  - パディング: 0.75rem 1.5rem
  - 角丸: 8px
  - フォントサイズ: 1rem
  - フォントウェイト: 600
  - ホバー時: 上に2px移動、シャドウ表示
  - 無効時: 透明度0.6

- `.btn-primary`: プライマリボタン（グラデーション背景）
- `.btn-secondary`: セカンダリボタン（グレー）
- `.btn-danger`: 危険ボタン（赤）
- `.btn-warning`: 警告ボタン（オレンジ）
- `.btn-success`: 成功ボタン（緑）
- `.btn-large`: 大型ボタン（幅100%、パディング1rem）
- `.btn-small`: 小型ボタン

#### セクションスタイル

- `.region-section`: 地域選択セクション
- `.control-section`: コントロールセクション
- `.bird-info`: 鳥情報セクション
- `.info-section`: 情報セクション
- `.options-section`: オプションセクション

### アニメーション

**fadeIn**:
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

適用: `.bird-info` セクション（0.3秒）

### スクロールバー

- 幅: 8px
- トラック: #f1f1f1
- サム: #888（ホバー時#555）

## コンポーネント階層図

```
BirdSongApp
├── popup-header
│   ├── h1 (タイトル)
│   ├── p.subtitle (サブタイトル)
│   └── button (条件付き: ポップアップで開く)
├── popup-content
│   ├── RegionSelector
│   │   ├── label
│   │   ├── select#region-select
│   │   └── p.help-text
│   ├── OptionsSection
│   │   └── input[type="checkbox"] + label
│   ├── PlaybackControls
│   │   ├── button (Start / Pause / Resume)
│   │   ├── button (Skip)
│   │   └── button (Stop)
│   ├── div (同期状態表示 - 条件付き)
│   ├── WaitingStatus (条件付き)
│   │   └── section.waiting-info
│   ├── BirdInfo (条件付き)
│   │   ├── h2
│   │   ├── MediaToggle (条件付き)
│   │   ├── div.bird-image-container
│   │   │   └── a.bird-image-link
│   │   │       └── img / video
│   │   └── div.bird-details
│   │       ├── h3.bird-name
│   │       ├── p.scientific-name
│   │       ├── p.location (条件付き)
│   │       └── p.recordist (条件付き)
│   └── section.info-section (条件付き)
│       ├── p.info-text
│       └── p.info-text-small
└── popup-footer
    └── p.credit
        └── a (Macaulay Library)
```

## 状態に応じた表示条件

### 表示条件のまとめ

| コンポーネント | 表示条件 |
|--------------|---------|
| 同期状態表示 | `isPlaying === true` |
| WaitingStatus | `isWaiting === true` |
| BirdInfo | `currentBird !== null` |
| 情報セクション | `!isPlaying` |
| ポップアップで開くボタン | `onOpenInNewWindow !== undefined` |
| 同期中レイアウト | `syncing === true` |

### 地域選択の無効化

- `disabled={isPlaying}`: 再生中は地域選択を無効化

### 再生コントロールの状態

- **停止中**: Start Playback ボタンのみ
- **再生中**: Pause/Resume, Skip, Stop ボタン
- **一時停止中**: Resume ボタンが表示
- **待機中**: Skip ボタンが無効化

## レスポンシブデザイン

現在の実装では、固定サイズ（最小450px × 550px）を想定しています。Chrome拡張機能のポップアップは通常固定サイズのため、レスポンシブ対応は不要です。

## 関連ファイル

- **メインコンポーネント**: `src/components/BirdSongApp.tsx`
- **スタイル定義**: `entrypoints/style.css`
- **UIコンポーネント**:
  - `src/components/ui/RegionSelector.tsx`
  - `src/components/ui/OptionsSection.tsx`
  - `src/components/ui/PlaybackControls.tsx`
  - `src/components/ui/BirdInfo.tsx`
  - `src/components/ui/WaitingStatus.tsx`
  - `src/components/ui/MediaToggle.tsx`
  - `src/components/ui/DownloadSection.tsx` (現在コメントアウト)
- **カスタムフック**:
  - `src/components/ui/useMessageListener.ts`
  - `src/components/ui/useOffscreenSync.ts`

## 注意事項

1. **DownloadSection**: 現在はコメントアウトされています（153行目）
2. **同期機能**: オフスクリーンドキュメントとの状態同期が実装されています
3. **メディア切り替え**: 画像と動画の両方が利用可能な場合、ランダムに初期選択されます
4. **待機期間**: 次の鳥の音声を待機する期間は60秒間です

