# 🎵 BirdSong Offscreen化 完了

## ✅ 実装内容

### アーキテクチャ変更

```
[旧]
Popup UI → Audio Element (ポップアップを閉じると停止)

[新]
Popup UI → Background Service Worker → Offscreen Document → Audio Element
                                       ↓
                                   永続的に再生
```

### 変更ファイル

1. **background.ts**
   - Offscreen ドキュメントの管理を追加
   - 音声再生の制御をOffscreenに委譲
   - 自動的に次の曲を再生する機能
   - 状態の永続化

2. **App.tsx**
   - 直接のAudio再生を削除
   - Backgroundとのメッセージング経由で制御
   - 状態の復元機能を追加

3. **offscreen.ts**
   - Audio要素を管理
   - 再生/一時停止/停止/スキップの実装
   - Backgroundへのイベント通知

4. **wxt.config.ts**
   - `offscreen` 権限を追加

5. **offscreen/index.html**
   - Offscreenページのエントリーポイント

## 🚀 動作確認

### ビルド & 実行

```bash
# 開発モード
npm run dev

# 本番ビルド
npm run build
```

### テスト手順

1. ✅ ポップアップを開く
2. ✅ 地域を選択して「Start Playback」をクリック
3. ✅ 鳥の鳴き声が再生される
4. ✅ **ポップアップを閉じる**
5. ✅ **音声は継続して再生される！** 🎉
6. ✅ ポップアップを再度開くと、再生中の状態が表示される
7. ✅ 一時停止/再開/スキップ/停止が動作する

## 🔍 デバッグ方法

### Chrome DevTools で確認

1. **Service Worker のログ**
   - `chrome://extensions/` → 詳細 → 「Service Worker」をクリック
   - `[Background]` で始まるログを確認

2. **Offscreen のログ**
   - `chrome://extensions/` → 詳細 → 「オフスクリーンドキュメントを検査」
   - `[Offscreen]` で始まるログを確認

3. **Popup のログ**
   - ポップアップを右クリック → 「検証」
   - `[Popup]` で始まるログを確認

### ログの流れ

```
[Popup] Start Playback clicked
  ↓
[Background] Searching birds, region: US
[Background] Found bird: American Robin
[Background] Offscreen document created
  ↓
[Offscreen] Playing audio: https://...
[Offscreen] Audio started playing
  ↓
[Background] Offscreen event: audioStarted
[Popup] Received message: birdChanged
```

## 🎯 主な機能

### ✅ 実装済み

- ✅ ポップアップを閉じても音声が継続
- ✅ 自動的に次の曲を再生
- ✅ 一時停止/再開
- ✅ スキップ機能
- ✅ 状態の永続化（ブラウザ再起動後も復元）
- ✅ 地域別の鳥の選択
- ✅ エラーハンドリング

### 🎨 UI変更

- 「Keep this popup open while playing」→「Now plays even when popup is closed!」に変更
- より明確なメッセージ表示

## 📊 メッセージフロー

### Start Playback

```
Popup → Background: { type: 'start', region: 'US' }
  Background → API: 鳥を検索
  Background → Offscreen: { type: 'playAudio', audioUrl, birdInfo }
    Offscreen → Audio Element: play()
    Offscreen → Background: { type: 'offscreenEvent', event: 'audioStarted' }
  Background → Popup: { type: 'popupEvent', event: 'birdChanged' }
Popup ← Background: { success: true, bird }
```

### Auto Next

```
Offscreen: Audio ended
Offscreen → Background: { type: 'offscreenEvent', event: 'audioEnded' }
  Background → API: 次の鳥を検索
  Background → Offscreen: { type: 'playAudio', ... }
  Background → Popup: { type: 'popupEvent', event: 'birdChanged' }
```

## 🔧 トラブルシューティング

### 問題: 音が出ない

**確認事項:**
1. Chrome の音量設定
2. Offscreen のコンソールでエラーを確認
3. `audioUrl` が正しく取得されているか

### 問題: ポップアップを閉じると停止する

**確認事項:**
1. `offscreen` 権限が manifest に追加されているか
2. Background で Offscreen が正しく作成されているか
3. Service Worker のログで「Offscreen document created」が表示されているか

### 問題: 状態が復元されない

**確認事項:**
1. `chrome.storage.local` にデータが保存されているか
2. Background の初期化コードが実行されているか

## 📝 今後の拡張案

- 🎚️ 音量調整
- 🔄 リピートモード
- ❤️ お気に入り機能
- 📊 再生履歴
- 🌙 ダークモード
- 🔔 通知機能

## 🎉 完了！

これで **BirdSong** はポップアップを閉じても音楽が流れ続けます！

Offscreen Document のおかげで、拡張機能の UI とオーディオ再生が完全に分離され、まるで**バックグラウンド音楽プレイヤー**のように動作します 🎵
