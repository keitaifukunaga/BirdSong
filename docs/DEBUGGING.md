# 🎵 BirdSong - トラブルシューティングガイド

音が鳴らない問題のデバッグ方法

## 🔍 デバッグ手順

### 1. ポップアップのデバッグ情報を確認

1. BirdSongのアイコンをクリックしてポップアップを開く
2. 「▶️ Debug Info」をクリックして展開
3. ログを確認:
   - `Popup initialized` が表示されているか
   - `Starting playback...` が表示されているか
   - エラーメッセージがないか

### 2. Background Scriptのログを確認

1. `chrome://extensions/` を開く
2. BirdSongを探す
3. **「Service Worker」** のリンクをクリック
4. DevToolsが開くので、Consoleタブを確認

**確認すべきログ**:
```
[Background] BirdSong background script started
[Background] Creating offscreen document
[Background] Offscreen document created successfully
[Background] Searching bird audio, region: all
[Background] API response: { totalResults: 50, hasContent: true }
[Background] Selected bird: { commonName: "...", audioUrl: "...", hasAudio: true }
[Background] Sending play command to offscreen
```

### 3. Offscreen Documentのログを確認

1. `chrome://extensions/` を開く
2. BirdSongを探す
3. **「offscreen document」** のリンクをクリック（再生開始後に表示）
4. DevToolsが開くので、Consoleタブを確認

**確認すべきログ**:
```
[Offscreen] Audio player initialized
[Offscreen] Received message: playAudio
[Offscreen] Playing audio: https://...
[Offscreen] Audio loaded, duration: 42.5
[Offscreen] Audio started playing
[Offscreen] Play promise resolved
```

### 4. ネットワークリクエストを確認

Background ScriptのDevToolsで:
1. **Network** タブを開く
2. 「Start Playback」をクリック
3. 以下のリクエストが成功しているか確認:
   - `https://search.macaulaylibrary.org/api/v1/search?...` → ステータス 200
   - 音声ファイルのURL → ステータス 200

## ❌ よくあるエラーと解決方法

### エラー: "Offscreen document already exists"

**原因**: 前回の実行でoffscreen documentが残っている

**解決方法**:
```bash
# 拡張機能を再読み込み
1. chrome://extensions/ で「再読み込み」ボタンをクリック
```

### エラー: "No audio found in response"

**原因**: APIから音声データが返ってこない

**解決方法**:
1. インターネット接続を確認
2. 地域を「All Regions」に変更してみる
3. Macaulay Library APIが正常か確認: https://search.macaulaylibrary.org/

### エラー: "Play promise rejected"

**原因**: ブラウザの自動再生ポリシー

**解決方法**:
1. Chromeの設定で自動再生を許可
2. または、ポップアップを開いた状態で「Start Playback」をクリック

### エラー: "Audio error"

**原因**: 音声ファイルの読み込み失敗

**デバッグ**:
Offscreen DocumentのDevToolsで、Networkタブを確認し、音声URLが404やCORSエラーになっていないか確認

## 🐛 完全なデバッグ手順

### ステップ1: すべてクリーンアップ

```bash
cd C:\dev\BirdSong

# ビルドファイルを削除
rmdir /s /q .output
rmdir /s /q .wxt

# 再ビルド
npm run dev
```

### ステップ2: 拡張機能を再読み込み

1. `chrome://extensions/`
2. BirdSongの「再読み込み」ボタンをクリック

### ステップ3: すべてのDevToolsを開く

1. **Popup**: 右クリック → 検証
2. **Background**: Service Workerをクリック
3. **Offscreen**: 再生開始後、offscreen documentをクリック

### ステップ4: 再生テスト

1. ポップアップで「Start Playback」をクリック
2. 各DevToolsのConsoleを同時に監視
3. どこでエラーが発生しているか特定

## 📊 期待されるログの流れ

### 正常な場合

```
[Popup] Popup initialized
[Popup] Loaded settings: region=all
[Popup] Starting playback...
[Background] Starting playback
[Background] Creating offscreen document
[Background] Offscreen document created successfully
[Background] Searching bird audio, region: all
[Background] API response: { totalResults: 50, hasContent: true }
[Background] Selected bird: { commonName: "American Robin", audioUrl: "https://...", hasAudio: true }
[Background] Sending play command to offscreen
[Offscreen] Received message: playAudio
[Offscreen] Playing audio: https://...
[Offscreen] Audio loaded, duration: 35.2
[Offscreen] Audio started playing
[Offscreen] Play promise resolved
[Background] State updated: { isPlaying: true, isPaused: false, bird: "American Robin" }
```

## 🔧 追加のデバッグオプション

### Macaulay Library APIを直接テスト

ブラウザで以下のURLを開く:
```
https://search.macaulaylibrary.org/api/v1/search?mediaType=audio&count=1&sort=rating_rank_desc&quality=4
```

レスポンスにaudioUrlが含まれているか確認。

### 音声URLを直接テスト

1. 上記APIレスポンスから `mediaUrl` をコピー
2. 新しいタブでそのURLを開く
3. 音声が再生されるか確認

## 📞 それでも解決しない場合

以下の情報を集めてください:

1. **Chrome バージョン**: `chrome://version/`
2. **エラーログ**: 
   - Popup DevTools の Console
   - Background DevTools の Console
   - Offscreen DevTools の Console (あれば)
3. **Network タブ**: 失敗しているリクエスト
4. **再現手順**: 何をした時にエラーが発生するか

---

**最終更新**: 2025年1月
