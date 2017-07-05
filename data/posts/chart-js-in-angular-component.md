## はじめに

WEBアプリケーションでフロントエンドの開発をしていると、グラフ表現 <small>（※離散数学のグラフではない、線グラフや棒グラフを指しています）</small> を組み込みたいことが出てきます。
しかし、グラフは一般的にスクラッチで作成すると大変なので（軸の設定とか線の見やすさとか、考えることが多いです）、既存のライブラリを使用して、設定や css で少しいじるくらいで上手いこと綺麗に表示されて欲しいです。
そこで、 [chart.js](https://github.com/chartjs/Chart.js) を angular で作られたプロダクトに組み込む方法を考えます。

### 書いてあることと書いていないこと

#### 書いてあること

- angular（>= 2.0.0） で作られたプロダクトに chart.js のグラフを組み込む方法
- （おまけ）angular（>= 2.0.0） で作られたプロダクトに vis.js のグラフ（離散）を組み込む方法

#### 書いてないこと

- chart.js や vis.js などのライブラリの使用方法（それぞれの公式ドキュメントを参照してください）

### 前提

- angular（>= 2.0.0） を採用したプロダクトが既にエラーなく稼働すること
- chart.js （や、おまけのセクションでは vis.js）の使い方を知っていること
- es6 の記法や systemjs/webpack などの基本的な知識を有していること
- typescript を採用していること
- DOM操作が（推奨、非推奨は別として）行える環境であること
- angular で DOM操作を行うプログラムを書いたことがない、または知識を有さないこと

## 設定方法

### インストール

chart.js を npm経由でインストールします。

```bash
$ npm install --save chart.js
```

### import

`polyfills.ts` など各コンポーネントよりも先に評価される文脈で、以下の一文を追加します：

```ts
import 'chart.js/dist/Chart'
```

### コンポーネントの作成

chart.js はグローバル領域に `Chart` という[オブジェクト（モジュール）を定義](https://github.com/chartjs/Chart.js/blob/master/src/chart.js#L51)しますが、コンポーネント中で何も宣言せずに使おうとするとエラーとなります。これは、コンポーネント中で名前解決できていないのが原因なので、以下の文を追記します：

```ts
import {Component} from '@angular/core';

declare const Chart; // <-- 追加

@Component({
  ...
```

これにより、コンポーネント中の関数の中で `Chart` というオブジェクトが使用可能になります。

```diff
+ 2016.10.13追記
+ DefinitelyTypes で定義されている型を使う方が安全とのご指摘いただきましたので、コメント欄も併せてご参照ください。
```

コンポーネントの定義ファイル全体は以下のようになります：

```ts
import { Component, AfterViewInit, ElementRef, Input } from '@angular/core';

// Chartオブジェクトを使うために宣言する
declare const Chart;

@Component({
  selector: 'app-chart',
  template: `
    <canvas width="450" height="450"></canvas>
  `
})

export class ChartComponent implements AfterViewInit {

  constructor(private _elementRef:ElementRef) {}

  context:any;
  chart:any;

  @Input()
  data:any;

  @Input()
  options:any;

  // View が初期化された後でないと DOM の取得に失敗した
  ngAfterViewInit() {

    // canvasを取得
    this.context = this._elementRef.nativeElement.getElementsByTagName('canvas')[0];

    // チャートの作成
    this.chart = new Chart(this.context, {
      type: 'line',         // とりあえず lineチャートを表示
      data: this.data,      // データをプロパティとして渡す
      options: this.options // オプションをプロパティとして渡す
    })

  }

}
```

ポイントは、canvas の取得を `getElementById` ではなくて `getElementsByTagName` で行っている点です。
コンポーネントとして使用する都合上、`id` で指定してしまうと canvas に振る id を可変にして親コンポーネントで管理する、みたいなことをしないといけないですが、`elementRef`の`nativeElement`がコンポーネントに閉じた DOMツリーで探索してくれるという点を活かして、タグ名で探索しています。

```diff
+ 2016.10.13追記
+ @ViewChild()デコレータを使う方が宣言的に書けるとのご指摘いただきまいした。
+ 詳しくはコメント欄をご覧ください。
```

※ elementRef について
https://angular.io/docs/ts/latest/api/core/index/ElementRef-class.html

つまり、ここでの実装は nativeElement が取得できるという点に依存しているため、それが取得できない web worker などでは機能しません。
その場合どうすればよいのかは（僕の中では）今のところ結論が出ていないので、直接DOM操作を行わないようなライブラリを探してきた方が早い気がします。

## おまけ

僕はグラフと言えば離散数学のグラフを思い浮かべるタイプの人間なので、その可視化を行う [vis.js](http://visjs.org/) というライブラリについても触れます。

基本的には chart.js と同じような手順で上手くいくはずですが、 polyfills.ts に import文を書いても `vis`オブジェクトが使用できませんでした。
該当箇所をソースコードから引っ張ってこれなかったのですが、グローバル領域に `vis`オブジェクトが定義される形になっていない気がします。
Network や DataSet などのオブジェクトは export されているので、直接これらのオブジェクトを呼び出せば良いかもしれません。

取り急ぎ、`vis`オブジェクトを呼び出すための解決策として、`index.html` に

```html
<script src="/assets/vis/dist/vis.min.js"></script>
```

を追加し、コンポーネントの定義ファイルで `declare const vis` としたら呼べました。
後は DOM操作でグラフ（ネットワーク）を埋め込んでいるので、上記のように nativeElement を呼び出して描画できました。

## まとめ

angular(>= 2.0.0) で chart.js（や、vis.js）のグラフを描画するための方法を考えました。