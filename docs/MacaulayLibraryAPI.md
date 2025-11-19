# Macaulay Library API 調査方法

Macaulay Library APIには公式ドキュメントがないため、以下の方法で利用可能なパラメータを調査できます。

## 方法1: ブラウザの開発者ツールで調査

1. **Macaulay Library検索ページを開く**
   https://search.macaulaylibrary.org/catalog

2. **開発者ツールを開く**
   - Chrome/Edge: F12または右クリック→「検証」
   - Firefox: F12または右クリック→「要素を調査」

3. **Networkタブに切り替え**

4. **検索を実行**
   - 鳥の名前を入力して検索
   - フィルターオプション(品質、地域、日付など)を変更

5. **APIリクエストを確認**
   - Networkタブで `/api/v1/search` で絞り込み
   - リクエストURLを確認すると、使用されているパラメータが表示される

## 方法2: 実際のURLから逆算

現在のコードで使用しているパラメータ:
```
https://search.macaulaylibrary.org/api/v1/search?
  taxonCode=SPECIES_CODE      # 種コード
  &mediaType=audio             # メディアタイプ(audio/photo/video)
  &count=10                    # 取得件数
  &sort=rating_rank_desc       # ソート順
  &quality=A,B                 # 品質フィルタ(A,B,C,D,E)
  &regionCode=JP-13            # 地域コード(オプション)
```

## 推測される追加パラメータ

ブラウザで検索する際に使える機能から推測:

### 基本パラメータ
- `taxonCode` - 種コード (例: amelro, carwre)
- `mediaType` - audio, photo, video
- `count` - 取得件数
- `sort` - ソート順
  - `rating_rank_desc` - 評価順(降順)
  - `upload_date_desc` - アップロード日順
  - `obs_date_desc` - 観測日順

### フィルタパラメータ
- `quality` - 品質フィルタ
  - `A` - 最高品質
  - `B` - 高品質
  - `C` - 良い品質
  - `D` - 普通
  - `E` - 低品質
- `regionCode` - 地域コード (ISO形式: JP-13, US-CA など)
- `age` - 年齢
  - `a` - Adult(成鳥)
  - `j` - Juvenile(幼鳥)
  - `i` - Immature(若鳥)
- `sex` - 性別
  - `m` - Male(雄)
  - `f` - Female(雌)
  - `u` - Unknown(不明)
- `behavior` - 行動
  - `s` - Singing(鳴き声)
  - `c` - Calling(コール)
  - `f` - Flying(飛翔)
  - `p` - Perched(止まり)

### 日付・場所パラメータ
- `beginYear`, `endYear` - 年の範囲
- `beginMonth`, `endMonth` - 月の範囲
- `obsStartDate`, `obsEndDate` - 観測日の範囲
- `latitude`, `longitude`, `distance` - 位置情報と検索半径

### その他
- `includeUnconfirmed` - 未確認の記録を含む(true/false)
- `captive` - 飼育個体を含む(Y/N/U)
- `birdOnly` - 鳥のみに限定(true/false)

## 実際に確認する手順

### ステップ1: 検索ページでフィルタを設定
1. https://search.macaulaylibrary.org/catalog を開く
2. 鳥の名前を検索
3. "More Filters"をクリック
4. Quality、Age、Sex、Behaviorなどを設定

### ステップ2: Network タブで確認
1. F12で開発者ツールを開く
2. Networkタブを選択
3. 検索実行
4. `/api/v1/search` のリクエストを確認
5. Query String Parameters を確認

### ステップ3: パラメータをテスト
ブラウザまたはcurlで直接APIを叩いてテスト:
```bash
curl "https://search.macaulaylibrary.org/api/v1/search?taxonCode=amerob&mediaType=audio&quality=A,B&count=5"
```

## 注意事項

⚠️ **非公式APIのため注意が必要**
- APIの仕様が予告なく変更される可能性がある
- レート制限が存在する可能性がある
- 商用利用の際は Cornell Lab of Ornithology に確認が必要

📧 **問い合わせ先**
- macaulaylibrary@cornell.edu
- https://support.ebird.org (ヘルプデスク)

## 参考リンク

- Macaulay Library: https://www.macaulaylibrary.org
- eBird: https://ebird.org
- eBird API (公式): https://documenter.getpostman.com/view/664302/S1ENwy59