## はじめに

JavaScript の Dateオブジェクトは色々と悪名高く、その代替ライブラリは片手で数え切れないほど存在する。有名どころで言えば、[moment](https://github.com/moment/moment)、[Datejs](https://github.com/datejs/Datejs) などがある。しかし私は Rails の Timeオブジェクトに魅せられてからというもの、その使用感が忘れられなくなってしまい、どうにかして js や ts でも使えないものかと苛立ちと悲しみの間で煩悶していた最中、ついにその感情が溢れ出てしまい、自分で実装してしまった次第である。

## インストール

百聞は一見にしかず、まずは是非使ってもらいたい。
https://github.com/chase0213/extdate

インストールは例にもれず、`npm install --save extdate` とするだけである。

動作しない場合は気軽に issue や PR などであげていただければと思う。
もし仮に何かの間違いで広く使われるようになってしまった場合に日本語で埋め尽くされていると、非日本語圏の方が萎縮してしまうかもしれないので、できれば英語で書いてほしい。

## 使い方

Rails の Timeオブジェクトの操作感を目指した。
使用できるメソッドは README に書いてあり、そちらが最新なので追ってほしい。

試しに、昨年度のクリスマスから30日後が何曜日なのかを日本語で得たい場合の例文を書いてみる。

```typescript
let lastChristmas = new ExtDate(2016, 12, 25);
let dayOfWeek = lastChristmas.nextDay(30).dayOfWeek('ja');
console.info(dayOfWeek);
=> 火曜日
```

なるほど、火曜日らしい。特にこの日に思い入れがあるわけではないが、Rails のようにメソッドチェーンができることを示すためにわざわざこの偏屈な例を選択した。

## 所感

typescript で npmパッケージを作ったのは初めてだったのだが、型があるというのは素晴らしい。自動生成された型定義ファイルを貼っておくだけでとりあえずドキュメントの代わりになるし、テストでわざわざ型チェックを書く必要も（`any` や `a|b` としていない限り）あまりない。

## おわりに

<s>We</s> I need help to develop `extdate` together!