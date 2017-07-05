# RxJS で bリーグ開幕戦の時空を支配する

## この記事に書いてあること（兼目次）

- RxJS とは
- bリーグとは
- RxJS で bリーグ開幕戦を振り返る
	- Observable
	- delayWhen
	- filter


## RxJS とは

まずは github から引用します。
https://github.com/Reactive-Extensions/RxJS

> The Reactive Extensions for JavaScript (RxJS) 4.0　is a set of libraries to compose asynchronous and event-based programs using observable collections and Array#extras style composition in JavaScript

> The project is actively developed by Microsoft, in collaboration with a community of open source developers.

【拙訳】Reactive Extensions for Javascript (RxJS) 4.0 は、JavaScript における observable（観測できるもの）の集まりと、Array#extrasスタイルの構成を使用して非同期的でイベントベースのプログラムを構成するためのライブラリの集合です。
このプロジェクトは Microsoft によって活発に開発されていて、オープンソースの開発コミュニティと協働で進められています。

誤解を恐れずに噛み砕くと、Promise のような非同期処理をイベントベースで構築するためのライブラリの集合のようです。

また、9/27現在 beta版である RxJS 5 では以下のように書かれています。
https://github.com/ReactiveX/rxjs

> Reactive Extensions Library for JavaScript. This is a rewrite of Reactive-Extensions/RxJS and is intended to supersede it once this is ready. This rewrite is meant to have better performance, better modularity, better debuggable call stacks, while staying mostly backwards compatible, with some breaking changes that reduce the API surface.

【拙訳】JavaScript用の Reactive Extensionsライブラリです。これは Reactive-Extensions/RxJS の改訂版で、準備ができ次第、古いバージョンに取って代わられようとしています。この改訂は、より良いパフォーマンス、より良いモジュラリティ、より良いデバッグ可能なコールスタック、大部分の後方互換性と、いくつかの API を削減する破壊的変更を意味しています。

ちなみに、先日ついに production ready となった angular v2 の QUICKSTART では RxJS の 5.0.0-beta.12 が使用されています。
https://angular.io/docs/ts/latest/quickstart.html

なので、本記事でも 5.0.0-beta.15 を使用します。

余談ですが、

> with some breaking changes that reduce the API surface.

と書いてある通り、いくつかの API が削除されているので、古い記事にヒットして少しハマりました。

### 基本的な使い方

覚えておかないといけないことは、大体以下の３つです。

1. Observableオブジェクトは、配列やイベントから生成できる
2. Observableオブジェクトは、フィルタリングしたり、時系列に沿ってストリームを流したりできて、subscribe して使う
3. subscribe したものは unsubscribe する<small>（けど、<a href="https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87#.153swlo52">宣言的に書いた方が良いよって言ってる人</a>もいる）</small>

<small>
angular を使っている人はおなじみかと思いますが、angular では httpリクエストの結果は通常、Observable として受け取ることになります。
</small>

1 から順に簡単にスニペットを書いてみます。

#### 配列から生成する場合

```javascript
// 1. Observableオブジェクトは、配列やイベントから生成できる
const data = [1,2,3];
let observable = Observable.from(data);

// 2. Observableオブジェクトは、フィルタリングしたり、時系列に沿ってストリームを流したりできて、subscribe して使う
var subscription = observable.filter(function(x) {
  return x >= 2;
}).subscribe(
  data => {console.log(data)}, // 取得したデータ
  error => {console.error(error)}, // データが取得できなかった場合
  () => {console.info("completed.")} // データが取得できた場合、最後に呼ばれる
);
// => 2 3 completed.

// 3. subscribe したものは unsubscribe する
subscription.unsubscribe();
```

Promise の処理に似ていますね。そもそも Promise も非同期処理のためのものなので、それほど違和感はありません。
ではなぜ、Promise ではダメなのかという疑問が浮かびますが、RxJS の README にはこう書かれています。

> Using RxJS, you can represent multiple asynchronous data streams (that come from diverse sources, e.g., stock quote, tweets, computer events, web service requests, etc.), and subscribe to the event stream using the Observer object. The Observable notifies the subscribed Observer instance whenever an event occurs.

【拙訳】RxJS を使えば、あなたは複数の非同期データストリーム（複数のソースから得られるもの。例えば株価、ツイート、計算機のイベント、Webサービスのリクエストなど）を表現でき、そのイベントストリームを Observerオブジェクトを使って subscribe することができます。Observable は、イベントが発生するといつでも subscribe している Observerインスタンスに知らせます。

複数のデータストリーム、イベントが発生するといつでも、というところが強調されている気がしますね。
<small>今回のサンプルでは、この強調部分を活かしたプログラムを作ってはいないのですが、後日書いてみます。</small>

## bリーグとは

### TL;DR

日本には、2016年まで 2つのプロバスケットボールリーグが存在していました。それが今年、bリーグとして統一され、 9/22 に開幕戦を迎えました。

### bjリーグと JBL の対立構造

<small>技術関係ないので興味のない方は読み飛ばしてください</small>

2004年に、日本リーグ機構に所属していた新潟アルビレックスとさいたまブロンコスが新プロリーグ（bjリーグ）設立のため、機構と協会からの脱退を表明しました。それをきっかけとして、協会とbjリーグは断絶し、協会加盟チームなどに bjリーグに関わらないように通達を出すなどしました。その後、協会主導の完全プロリーグを発足しようとするも、企業の反対にあい完全プロ化は断念し、従来の企業チームと新たに設立されたプロチームとの混合で JBL を設立しました。
こうして、日本には bjリーグと JBL の 2つのプロリーグが設立されました。

2013年に入り、新リーグ NBL が開幕しましたが、初年度時点では bjリーグからの参加は千葉ジェッツのみで、2リーグの溝は深まらないままいました。

そして、2014年、国際バスケットボール連盟（FIBA）は、プロリーグが 2リーグ存在する日本のプロバスケットボールの現状について、リーグの統一を要求しました。FIBA はその期限を 2014年10月としましたが、期限内に統合合意が事実上不可能となったため、FIBA より日本バスケットボール連盟（JBA）の国際大会への出場資格停止処分が下されました。

そこで、バスケットボール界にしがらみのない人選として、サッカーJリーグ発足人である川淵三郎氏を会長とする新体制を発足し、日本のプロバスケットボールリーグは bリーグとして統一されました。

Wikiペディア "日本バスケットボール協会"
https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E3%83%90%E3%82%B9%E3%82%B1%E3%83%83%E3%83%88%E3%83%9C%E3%83%BC%E3%83%AB%E5%8D%94%E4%BC%9A#.E3.83.88.E3.83.A9.E3.83.96.E3.83.AB

## RxJS で bリーグ開幕戦を振り返る

というわけで、先日 2016年9月22日に bリーグの開幕戦が行われたのですが、bリーグの公式サイトにスコアボードが載っています。
https://www.bleague.jp/game_detail/?YMD=20160922&TAB=P&CLUB=tt

一方で、RxJS は時空を制するライブラリ群と呼ばれています。

つまり、掛け合わせると・・・？
RxJS で bリーグの試合が再現できます！

というわけで、まずはこちらをご覧ください。

https://chase0213.github.io/reactive-blg/

Subscribe を押すと、プレイが時系列に沿って流れてきます！
また、filter によって、好きなプレイヤーやチーム、速度を変えたりして観たい状況を再現することができます。

それでは、コードを読みます。
まず、リポジトリはこれです。
https://github.com/chase0213/reactive-blg

angular の記法が入っていて、RxJS そのものが隠れてしまっているのですが、RxJS が活躍しているのは <a href="https://github.com/chase0213/reactive-blg/blob/master/src/app/data.service.ts">src/app/data.service.ts</a> の中です。

今回、github pages だけで動かしたかったので、データは全て JavaScript のオブジェクトまたは配列の形でハードコーディングされています。通常であれば、外部APIに読みに行くところですが、心の目で置き換えてください。

主要な処理は `getObservableForQuarter`関数と `getObserverForQuarter`関数の中に書かれています。

```javascript
  getObservableForQuarter(q:number):Observable<any> {
    // 配列としてデータを取得
    let data = this.getDataForQuarter(q);

    // 配列から Observableオブジェクトに変換し、返却
    return Observable.from(data);
  }

  getObserverForQuarter(q:number, scale:number) {
    //
    // ...
    //

    // getObservableForQuarter で指定されたクォーターのデータに関する Observable を取得する
    var observable = this.getObservableForQuarter(q)
      // delay関数で指定された時間だけ delay をいれることで、実際のプレイ時間との整合性をとる
      .delayWhen(delay)
      // 観たいプレイ、プレイヤー、チームだけにフィルタリングする
      .filter(filter);

    // Observableオブジェクトを返却して、subscribe して使う
    return observable;
  }
```

その後、<a href="https://github.com/chase0213/reactive-blg/blob/master/src/app/reactive-view/reactive-view.component.ts">src/app/reactive-view/reactive-view.component.ts</a> で以下のように subscribe します。

```javascript
  private subscribe() {
    // actions配列（プレイを格納している配列）を初期化
    this.actions = [];

    // 指定されたスピードでデータストリームからデータを取得する
    this.dataSubscription = this._data.getObserverForQuarter(+this.quarter, 1.0 / this.speed)
      .subscribe(x => {
        // データを取得した時の処理
        this.actions.push(x);
      }, error => {
        // データが取得できなかった時の処理
        console.error(error);
      }, () => {
        // データの取得が完了した時の処理
        console.info("The quarter is over.");
      });
  }
```

subscribeボタンを押すと、 `onClickSubscribe`関数が呼ばれ、その中で `subscribe`関数がコールされることでデータを取得し、同様にして unsubscribeボタンによってデータ取得を停止します。

あと細かなトリックとかバグとか仕込んでたり、保守性とか見通しの悪いコードになっていますが、思い立って 2日で作ったので温かい目で見てください。
よく分からない部分や良くない部分があれば、コメントなどでご指摘いただけると励みになります。

## さて、それって setTimeout でできるよね？

あ、はい、そうです。。。
ただ、僕がこのコードを最初に見たときに、まず見通しの良さを感じました。
それから、実は RxJS はまだまだ強力な API群を隠し持っていて（たぶん隠してないけど）、こちらのスライドとかが参考になります。
https://speakerdeck.com/jooohn/rxjsdeshi-kong-wozhi-sitahua

実際、ストリームのマージとかは setTimeout と Promise では簡単にはできませんよね？<small>（簡単とはなんなのかという議論についてはここではしませんが）</small>

## まとめ

RxJS の基本的な部分についてデモを交えながら説明しました。
もっと Rx な部分については、後続の記事で書いて行きたい所存です。
