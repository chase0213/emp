昔話
----

僕が機械学習を学び始めた頃は、そもそも github なんてものはなくて、
ネットに落ちてるソースを落として来てコンパイルして「あー、よくわかんないけど動かない・・・」
となるか、「あー、よくわかんないけど動いた・・・」となるかどちらかでした。
そうでなければ、自分で拙いコードを書いて、どこまで正しく実装できているかわからない
（計算機科学的に効率の悪いコードだったことは間違いない）コードで実験していました。

ところが最近は、あまりに複雑な理論の実装であっても、たいていは github にあがっているのです。
そして github に公開されるということは、使い方が明示され、かつ誰でも使えるように
平易なインターフェースが容易してあります。

Jubatus はまさにそんなフレームワークで、複雑な理論を一切知らなくても機械学習ができてしまう夢の様なものです。
http://jubat.us/ja/

太鼓持ちはここまでにして。

Jubatus を使ってみた、という記事です。
まず何をしたいかというと、市町村名を入力したらどこの都道府県の地名かを教えてくれるものを作ります。
目的が「使ってみる」なので、対象ははっきり言って何でも良かったのですが、
都道府県名の住所録が [こちら][1] のサイトに csvファイルで提供されていたので使用させていただきました。

[1]: http://jusyo.jp/csv/document.html

pre-processing
-------------

上でダウンロードしてきたデータを使わせていただくのですが、ちょっと文字コードが SJIS で嫌なので、utf-8 に変換します。

```
wget http://jusyo.jp/downloads/new/csv/csv_zenkoku.zip
unzip csv_zenkoku.zip
nkf -w zenkoku.csv > zenkoku_utf-8.csv
```

これでデータが日本語として読めるようになったと思います。
ちなみに、Windows環境だとこの変換は不要ですが、今回は Linux（CentOS）を想定しています。
（そもそも jubatus を Windows で使おうとすると一筋縄ではいかないはずなので、この説明は不要と思いますが）

それで、一番最初の行が嫌（各列の説明）なので消してしまいます。

これで一応 jubatus に喰わせるデータは整ったのですが、このままだとデータの並びに規則性がありすぎて
何を言っても「北海道」と返す、北海道Lover が完成するだけなので、予め並びをシャッフルしておきます。

```
shuf zenkoku_utf-8.csv > shuffled_zenkoku.csv
```

これを data というディレクトリを切って保存しておきます。

configration
-----------

これでデータは整ったので、今度は Jubatus に喰わせるために json で設定を書きます。
https://github.com/chase0213/address_classifier/blob/master/adrs_clf.json

学習アルゴリズムには AROW を用います。
特に理由とかはないです。

それで、基本的に今のままだと入力ベクトルは文字列を要素として持つベクトルなので、
この文字列をどう扱うか、を string_rules の項目に書きます。
実用的なものを作ってみる企画ではないので、とりあえず unigram で分割した文字の個数を数えるだけにします。

```
"string_rules": [
      { "key": "*", "type": "unigram", "sample_weight": "bin", "global_weight": "bin" }
]
```

当然、実用的なものを作りたかったらこの部分はちゃんと考える必要があります。
（そもそも前処理の部分でほとんど何もしていないので実用的もなにもないのですが）

設定の詳細については [Jubatus公式ページ][2] を御覧ください。

[2]: http://jubat.us/ja/api_classifier.html

starting jubatus server
-------------------

設定が終わったら jubatusサーバを起動します。

```
$ jubaclassifier --configpath adrs_clf.json
```

エラーが出なかったら起動しています。

training
-------

設定が終わったらいよいよ学習フェーズに入ります。
いわゆる調教です。
https://github.com/chase0213/address_classifier/blob/master/train.py

データ全部突っ込んで学習したらタイムアウトしたので、とりあえず 50,000件くらい与えています。

```
tnum = 50000
```

普通は学習用のデータと分類用のデータを別に格納します。
今回は面倒なので（

特に難しいことはしていないので、ここまで読んでいただいている方ならコードを見れば何をしているかわかると思います。
ので説明は割愛します。

一点だけ重要なのは、

```
# training data must be shuffled on online learning!
random.shuffle(train_data)
```

ここです。
サンプルそのまま流用しているのでご丁寧にコメントまで入っていますが、
教師データをシャッフルしないで渡すと、データの並びの影響が反映されます。
アルゴリズムをよく理解しているわけではないので詳しくはなんとも言えないですが、
たぶん最後の方で喰わせたデータの影響力が強くなるのではないかと思います。
今回の場合、もともとデータをシャッフルしているのでので、
ここでシャッフルしなくてもそこまで顕著に性能劣化することはないですが、再利用するときに忘れるとあれなので。

シャッフルしたら、学習開始です。

```
# run train
client.train(train_data)
```

classification
-----------

こちらも特に難しいことはないので、コードを見てください。
https://github.com/chase0213/address_classifier/blob/master/detect.py

今回は、「伊勢崎」「高崎」「鎌倉」という3つの地名を与えて、どこの都道府県でしょう！？
というのをします。

結果はこちら。

```
$ python detect.py
群馬県 伊勢崎
群馬県 高崎
神奈川県 鎌倉
```

おぉ！！あってる！！すごい！！！


・・・・・・。


お手元の python で、50,000件の「都道府県-市区町村」の対を保存して、
これどこの都道府県でしょう？というものをやってみてください。
全体が 16万件くらいのはずなので、 1/3 くらいの確率で当たるはずです。

この例が賢くないことは始める前から分かっていたことなので良いのですが、
ただそれでも良い点があります。
それは、「未知のデータに対する分類能力」です。

classifier（ないしは機械学習）は元来、既知のデータを与えて未知のデータを予測する
というのもなので、もし教師データとして与えられなかった地名に対しても、
予測する（とりあえずの答えを返す）ことができます。
python のみでこれをやろうとしたら、結構難しいはずです。

以上、jubaclassifier を使ってみる、でした。