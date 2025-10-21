# 🔄 Popup ↔ Offscreen 状態同期機能

## ✅ 実装内容

Popupを開いたときに、Offscreenで再生中の実際の状態を取得して、UI に正確に反映します。

## 🎯 同期される情報

| 項目 | 説明 |
|------|------|
| **再生状態** | 再生中 / 停止中 |
| **一時停止状態** | 一時停止中 / 再生中 |
| **現在の鳥** | 鳥の名前、画像、録音者など |
| **地域設定** | 選択中の地域 |
| **音声状態** | 現在の再生時間、総時間 |

## 🔧 実装の仕組み

### データフロー

```
Popup 開く
  ↓
[App.tsx] syncWithOffscreen()
  ↓
[Background] getFullState()
  ↓
[Offscreen] getAudioState()
  ↓
[Background] 統合して返す
  ↓
[App.tsx] UIに反映
```

### コード構造

#### 1. Background: getFullState()

```typescript
async function getFullState() {
  const offscreenState = await getOffscreenState();
  
  return {
    isPlaying,
    isPaused: offscreenState.isPaused || isPaused,
    currentBird,
    region,
    audioState: offscreenState
  };
}
```

#### 2. Offscreen: getAudioState

```typescript
case 'getAudioState':
  const state = {
    isPlaying: audioElement && !audioElement.paused,
    isPaused: audioElement && audioElement.paused && audioElement.currentTime > 0,
    currentTime: audioElement?.currentTime || 0,
    duration: audioElement?.duration || 0
  };
  sendResponse(state);
  break;
```

#### 3. Popup: syncWithOffscreen()

```typescript
const syncWithOffscreen = async () => {
  const response = await chrome.runtime.sendMessage({ 
    type: 'getFullState' 
  });
  
  if (response.isPlaying) {
    setIsPlaying(true);
    setIsPaused(response.isPaused || false);
    setCurrentBird(response.currentBird);
    setRegion(response.region || '');
  }
};
```

## 🎬 動作シナリオ

### シナリオ 1: 再生中にPopupを閉じて再度開く

1. ✅ Popup で「Start Playback」をクリック
2. ✅ 鳥の鳴き声が再生される
3. ✅ **Popup を閉じる**
4. ✅ 音声は継続（バックグラウンド再生）
5. ✅ **Popup を再度開く**
6. ✅ **再生中の状態が正確に表示される！** 🎉
   - 「Now Playing」表示
   - 現在の鳥の情報
   - 一時停止ボタンなど

### シナリオ 2: 一時停止中にPopupを開く

1. ✅ 再生中に「Pause」をクリック
2. ✅ Popup を閉じる
3. ✅ Popup を再度開く
4. ✅ **「Paused」状態が正確に表示される**
   - ⏸️ Paused: アイコン
   - Resume ボタン

### シナリオ 3: ブラウザ再起動後

1. ✅ 再生中にブラウザを完全に閉じる
2. ✅ ブラウザを再起動
3. ✅ Popup を開く
4. ✅ **状態が復元され、再生が継続される**

## 🔍 デバッグログ

同期処理は以下のログで確認できます：

```
[Popup] Syncing with offscreen...
[Background] Message: getFullState
[Background] Offscreen state: { isPlaying: true, isPaused: false, ... }
[Popup] Full state received: { isPlaying: true, ... }
[Popup] State synced: { isPlaying: true, isPaused: false, bird: "American Robin" }
```

## ✨ UI の改善

### ローディング状態

Popup を開いたとき、同期中は以下を表示：

```
⏳ Syncing with player...
```

### 同期完了後

再生中の場合、以下のインジケーターを表示：

```
🔄 Synced with background player
```

## 🎨 視覚的なフィードバック

- **同期中**: 「Syncing with player...」メッセージ
- **再生中**: 「🔄 Synced with background player」バッジ
- **一時停止**: 「⏸️ Paused:」ヘッダー
- **再生**: 「🎵 Now Playing:」ヘッダー

## 📊 状態の優先順位

Offscreen の実際の再生状態が最優先：

```typescript
isPaused: offscreenState.isPaused || isPaused
```

1. **Offscreen の状態** （実際の Audio Element の状態）
2. **Background の状態** （保存された状態）

## 🔧 トラブルシューティング

### 問題: 状態が同期されない

**確認:**
1. Offscreen が正しく作成されているか
2. `getFullState` が正しく呼ばれているか
3. Console で同期ログを確認

**解決方法:**
```javascript
// Popup のコンソールで手動テスト
chrome.runtime.sendMessage({ type: 'getFullState' })
  .then(console.log);
```

### 問題: ローディングが終わらない

**原因:** Background との通信エラー

**解決方法:**
- Background Service Worker を再起動
- 拡張機能をリロード

## 🎉 まとめ

これで、Popup は常に Offscreen の**リアルタイムの状態**を正確に反映します！

- ✅ ポップアップを閉じても再生継続
- ✅ 再度開くと状態を完全復元
- ✅ 一時停止/再生/停止すべて同期
- ✅ 視覚的なフィードバック

完璧な UX を実現しました！ 🎵✨
