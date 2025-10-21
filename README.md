# 🎵 BirdSong - Continuous Bird Sounds Player

Chromeの拡張機能として、美しい鳥の鳴き声を連続再生します。

## ✨ 特徴

- 🎵 **連続再生**: 鳥の音声が終わると自動的に次の鳥の音声を再生
- 🌍 **地域選択**: 特定の地域の鳥を優先的に再生可能
- 📊 **鳥情報表示**: 現在再生中の鳥の名前、画像、録音者などの情報を表示
- ⏭️ **スキップ機能**: 気に入らない場合は次の鳥へスキップ
- 🎨 **美しいUI**: モダンでシンプルなデザイン

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd C:\dev\BirdSong
npm install
```

### 2. アイコンの準備

`C:\dev\zz_その他\BridsTab\icons` からアイコンファイルをコピー:

```bash
# Windowsコマンドプロンプトで
xcopy "C:\dev\zz_その他\BridsTab\icons\*" "C:\dev\BirdSong\public\icon\" /Y

# または PowerShell で
Copy-Item "C:\dev\zz_その他\BridsTab\icons\*" -Destination "C:\dev\BirdSong\public\icon\" -Force
```

### 3. 開発モードで起動

```bash
npm run dev
```

これにより `.output` フォルダにビルドされた拡張機能が生成されます。

### 4. Chromeに拡張機能を読み込む

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `.output/chrome-mv3` フォルダを選択

### 5. 本番ビルド

```bash
npm run build
```

## 📖 使い方

### 基本操作

1. **拡張機能アイコンをクリック**してポップアップを開く
2. **地域を選択**（オプション）
   - 「All Regions」: 世界中の鳥
   - 特定の国: その国の鳥を優先的に再生
3. **「Start Playback」ボタンをクリック**して再生開始
4. 再生中は**鳥の情報**（名前、画像、録音者など）が表示されます
5. **「Skip」ボタン**で次の鳥へスキップ
6. **「Stop」ボタン**で再生停止

### 自動再生の仕組み

- 各音声が終わると自動的に次の鳥の音声を検索して再生
- エラーが発生した場合は自動的にリトライ
- バックグラウンドで動作するため、ポップアップを閉じても再生は継続

## 🏗️ プロジェクト構成

```
BirdSong/
├── entrypoints/
│   ├── background.ts       # バックグラウンドスクリプト（音声再生ロジック）
│   └── popup/
│       ├── index.html      # ポップアップHTML
│       ├── main.tsx        # Reactエントリーポイント
│       ├── App.tsx         # メインUIコンポーネント
│       └── style.css       # スタイル
├── public/
│   └── icon/              # 拡張機能アイコン
├── package.json
├── wxt.config.ts          # WXT設定
├── tsconfig.json          # TypeScript設定
└── README.md
```

## 🔧 技術スタック

- **フレームワーク**: [WXT](https://wxt.dev/) - 最新のChrome拡張機能開発フレームワーク
- **UI**: React + TypeScript
- **API**: Macaulay Library API (Cornell Lab of Ornithology)
- **ビルドツール**: Vite (WXTに統合)

## 🎨 カスタマイズ

### 地域リストの追加

`entrypoints/popup/App.tsx` の `REGIONS` 配列に地域を追加できます:

```typescript
const REGIONS = [
  { code: '', name: 'All Regions' },
  { code: 'US', name: 'United States' },
  // 新しい地域を追加
  { code: 'XX', name: 'Your Country' },
];
```

### スタイルの変更

`entrypoints/popup/style.css` でUIをカスタマイズできます。

グラデーションカラーを変更:
```css
.popup-header {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

## 🐛 トラブルシューティング

### 音声が再生されない

1. **インターネット接続を確認**
2. **Macaulay Library APIが利用可能か確認**
3. **Chrome DevTools**（F12）でエラーログを確認
4. 拡張機能を**リロード**してみる

### 地域選択しても関係ない鳥が再生される

- Macaulay Library APIの地域フィルターが期待通りに動作しない場合があります
- 「All Regions」を選択して全世界の鳥を楽しむことをお勧めします

### ポップアップが開かない

1. 拡張機能が正しくインストールされているか確認
2. Chrome を再起動
3. 拡張機能を再読み込み

## 📝 開発

### 開発サーバーの起動

```bash
npm run dev
```

変更を保存すると自動的にリビルドされます。Chrome拡張機能ページで「再読み込み」ボタンをクリックしてください。

### コードの変更

- **background.ts**: 音声再生ロジック、API呼び出し
- **App.tsx**: UI、ユーザーインタラクション
- **style.css**: デザイン、スタイリング

## 🙏 クレジット

### データ提供

- **Macaulay Library** - Cornell Lab of Ornithology
- すべての音声と画像は、それぞれの録音者/写真家に帰属します

### 元となったプロジェクト

- **BirdTab** - 新しいタブで鳥の画像と音声を表示するChrome拡張機能

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

**作成日**: 2025年1月  
**バージョン**: 1.0.0
