# はじめに

[codecov](https://codecov.io/) で typescript のカバレッジを報告しようとしたら、 `no-reports-generated  error=Error` となってグラフが表示されなかった話です。
厳密に言うと、ソースコードは typescript で書いているものの、テストはトランスパイルされた javascript に対して行っている状況です。typescript でテストを書いたらそもそもこの状況は起こらないかもしれません。

## codecov とは

テストするときによく用いられる指標として、カバレッジ（coverage）ってありますよね。CI の過程でこの工程が手動というのはやはり良くないので、カバレッジを自動で計算して github の README にペタッと貼っておいてくれるというのは、エンジニアの自然な欲求なわけです。
そのうち、codecov がカバーしてくれるのは、"github の README にペタッと貼っておいてくれる" という部分です。

### codecov の使い方

まずは codecov のサイトに行きます。
https://codecov.io/

次に、サインアップまたはサインインします。
次に、リポジトリを選択する画面が出てくるので、対象のリポジトリをクリックします。
すると、下図のように、「オッケー！」って感じの画面が出てくるんですけど、ここからちょっと手間取ったので簡単に続きを書きます。

![スクリーンショット 2017-03-09 13.56.09.png](https://qiita-image-store.s3.amazonaws.com/0/52780/ce54da06-741e-aba6-fed0-b1b29b5a8372.png)


#### codecov のインストール

codecov にレポートを報告するためには、専用のツールを使います。
言語毎に用意されているようなのですが、ここでは node を例に説明します。
インストールは以下のように npm経由でします。

```bash
$ npm i --global codecov
```

#### coverage の計算

codecov自体には coverage を計算する機能（と、もちろんテストを実行する機能）はないので、それぞれ適宜好きなものをインストールします。
テストはともかくとして、coverage の計算には [istanbul](https://github.com/gotwarlost/istanbul) というツールが公式で採用されているので、とりあえずこちらを採用してみます。

```bash
$ npm i --save-dev istanbul
```

インストールが終わったら、カバレッジの計算をします。
今回は、mocha を使う前提です。

```bash
$ ./node_modules/.bin/istanbul cover _mocha -- -R spec
```

このコマンドを実行すると、何やら小気味よい出力が流れて、最後に coverage/ の下に保存したよ！という旨のコメントが表示されます。
もし coverage/ の下に何もなかったり、そもそも coverage/ がなかったりしたら失敗しています（私は何も出なかったのでエラーメッセージを読んで頑張って解決してください）。

#### codecov への報告

codecov へは先述の通り、 codecov という CLIツールを使って報告します。
とりあえず公式ページに載っている通り、以下のように実行したら失敗しました。

```bash
$ codecov
```

失敗の要因は次の２つでした。

* TOKEN が無い
* coverage.json のマッピングがおかしい

##### TOKEN が無い

これはエラーメッセージに表示されたので、すぐに解決しました。
具体的には、以下のように環境変数に設定すれば大丈夫です。

```bash
$ export CODECOV_TOKEN="..."
```

OSS のリポジトリだとトークンが書き込まれるのはあまり良くないので、travisCI や CircleCI などでも環境変数に設定すると良いかと思います。

##### coverage.json のマッピングがおかしい

これは 30分くらい悩んだのですが、結論から言うとこの issue と同じ問題でした。
https://github.com/codecov/codecov-node/issues/32

つまり、トランスパイルされた生成済みの javascript に対してカバレッジのレポートを作成したけど、ソースコードと違くない？ .mapファイルを同梱してよ！ということです。
なので、冒頭に書いた通り、

> ソースコードは typescript で書いているものの、テストはトランスパイルされた javascript に対して行っている状況です。typescript でテストを書いたらそもそもこの状況は起こらないかもしれません。

という推察になります。

ところで私はというと、mapファイルも生成するようにしていたので、？？となっていたのですが、結局 [remap-istanbul](https://github.com/SitePen/remap-istanbul) というツール（前述の issue で codecov の中の人が提案していたもの）を使うことで解決しました。

```bash
# インストール
$ npm i --save-dev remap-istanbul

# coverage.json のリマップ
$ cat coverage/coverage.json | ./node_modules/.bin/remap-istanbul > coverage/coverage-remap.json

# 報告
$ codecov -f coverage/coverage-remap.json
```

実際に動いているリポジトリがあるので、困ったら参考にしてください。
https://github.com/chase0213/extdate

特に、`.travis.yml` と `package.json` を見れば良いかと思います。

最後に、バッジを README にペタッと貼ったら完成です。強くなった気がします。

![スクリーンショット 2017-03-09 14.21.27.png](https://qiita-image-store.s3.amazonaws.com/0/52780/e50c8ac9-b541-4d2e-53aa-9f2e9adcf4fe.png)


# おわりに

目指せ快適 CI生活。