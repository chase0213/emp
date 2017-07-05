## 背景

年始の特番で、弊社の代表が NHK に出演することになりました
（Qiita の規約上、これが宣伝に当たるかどうか微妙なのでリンクは貼らないでおきます）。
おー、凄いね、良かったね、で終わらせたいのですが立場上そうすることでもできず、じゃあ対策しますか、となったわけです。

弊社のサーバーは外部に出せない情報を除いて全てクラウド上にあるので、インスタンスサイズを大きくまたは並列化して、Amazon へロードバランサのプレウォーム申請をすれば良いのですが、

1. なんで申請が手動なの
2. そもそもなんで自動でスケールしてくれないの

というのが大きな疑問でした。
そんな疑念を抱きながらフワフワと生活していたわけですが、

1. GCP を使うと AWS の XX%（< 100%、結構小さかった気がするけど覚えてない）にコストを抑えられるよ（確か第三者機関が提出したレポートで、優位性が認められていたはず）
2. ロードバランサは Google が普段、検索サービスである [Google](https://google.com) で使っているものと同じだよ

というようなことを色々なイベントで耳にするようになります。
そういえば昔、[GoogleのHTTPロードバランサーの破壊力があり過ぎる #gcpja](http://qiita.com/kazunori279/items/8d2417c8510021c697e7) という記事でロードバランサ凄いみたいな記事読んだなー。とか思い出します。

という経緯をもって、表題の件の検証をしました。

### この記事に載っていること

- この検証をした背景（上述）
- 検証の概要
- 結果的にどうしたか
- 後日談へのリンク（後日貼ります）

### この記事に載っていないこと

- Google Cloud Platform（GCP）とは何かの説明
- GCP や AWS の各サービスに関する説明
- Linuxディストリビューションに関する説明
- 特定の Linuxディストリビューション固有の設定
- Railsアプリケーションのデプロイ方法ならびに標準的なツールの説明、使用方法
- 各API の鍵

## 結果的にどうしたか

結果からお伝えします。
サービスを部分的に GCP へ移行して様子を見ることにしました。
続報は年明けとなります。

## 検証の概要

- GCP についての調査
- Google Compute Engine への Railsアプリケーション移行
- メール送信設定 with Mailgun


### GCP についての調査

まず、GCP でどんなサービスが提供されているのか知る必要があります。
自分で調べても良いですけど、Google の Greg Wilsonさんが比較しているのでそれを参照させていただきます。

[Amazon Web Services to Google Cloud Platform Service Mapping](https://gregsramblings.com/2015/05/07/aws-to-gcp-mapping/)

主要なところで言うと、

- EC2 は Compute Engine、
- S3 は Cloud Storage、
- RDS は Cloud SQL、
- DynamoDB は Cloud Datastore と Cloud Bigtable、
- Route53 は Cloud DNS と Google Domains

という感じで、一通り揃っている感じはあります。
ただし、Cloud SQL はフルマージドな MySQLサービスで、PostgreSQL やその他の RDBMS には対応していないようです。
もしかしたら他にも似たような制約があるかもしれません。

取り急ぎ、必要なサービスは揃っているわけで、料金も安いし可用性も高い！とうたわれているので検証したいと思います。

### Google Compute Engine への Railsアプリケーション移行

うん、どうやらそんなにコストをかけずに移行できそうだな、となったところで、実際に GCE のインスタンスを作成してみました。
とりあえず検証のため、以下のような構成でインスタンスを作成します。
「HTTPトラフィックを許可する」などにチェックを入れると、勝手にファイアウォールに穴を開けてくれます。
80/443以外のポートについては後述します。

![スクリーンショット 2015-12-14 17.46.20.png](https://qiita-image-store.s3.amazonaws.com/0/52780/bd3f0d54-c7be-a876-6ecd-45d22d0ea275.png)

ちなみに選べる OS はこんな感じです（2015年12月現在）。
下の方ちょっと切れてます。

![スクリーンショット 2015-12-14 17.50.11.png](https://qiita-image-store.s3.amazonaws.com/0/52780/48646f4a-2008-9182-faf1-96069e6b97fb.png)

デフォルトが Debian だったのでそのまま使いました。
CoreOS も使用できるのか・・でもコンテナ使うなら素直に Google Container Engine 使うな・・と思いました。

その後、インスタンスが起動した後でインスタンス名をクリックして、「SSH」を押すとブラウザ上からターミナルが開いて SSH できます（ユーザーは gmailアドレスを基に自動で作成され、sudo権限もついています）。
試しに色々コマンドを叩いてみましたが、AWS とは異なり、最小構成のようです。
具体的に言うと `gcc` とか `dig` とかも入っていないので、ansible とかで AWS を前提として構築している場合には依存パッケージを増やさないといけません
（また、当然 ruby も無ければ pipコマンドも使えません）。
もし chef で構築している場合には chef をインストールした状態のスナップショット（カスタムインスタンスも登録できるようです）を用意して、そこから自動構築すると良さそうです。
僕は最近 Ansible を使っているので何事も無く SSH して作ってもらいました。

というわけで、サーバーを自動構築して capistrano でデプロイしたら、特に問題なくアプリケーションが動作しました。
Cloud SQL や Cloud DNS の設定は見ればわかりますし、公式ドキュメントが充実しているので割愛します。
感覚的には AWS の設定とあまり変わらないので、AWS に慣れている人であれば特につまずくところは無いかと思います（メールサーバーに関しては後述）。

### メール送信設定 with Mailgun

さて、とりあえず上の手順で WEBサーバーとしては動作するようになったのですが、サーバーからメールを送る設定をしないとお問い合わせに応えることができません。
しかし、Google Compute Engine には以下の記述があります。

[Sending Email from an Instance](https://cloud.google.com/compute/docs/tutorials/sending-mail/)

> Google Compute Engine does not allow outbound connections on ports 25, 465, and 587 but you can still set up your instance to send mail using partner services like SendGrid, Mailgun, or using Google Apps.

拙訳）
Google Compute Engine は外側への 25番、465番、587番ポートの通信を許可していませんが、パートナーサービス（例えば SendGrid や Mailgun、または Google Apps）を使ってインスタンスからメールを送信することができます。

リンク先に理由も書いてありますが、要するにスパムの踏み台にされて悪用されるとかを防ぐ目的かと思います。出典は忘れましたが、そういった悪意のあるメールの 75% は標準ポート（上記3ポート）を狙った攻撃から始まるようです（この辺あやしいのであまり宛てにしないでください）。

というわけで、[Mailgun](https://mailgun.com/) を使ってみます。
実は [SendGrid](https://sendgrid.com/) も使ってみたのですが、認証段階で人間によるチェックが入るらしく、なかなか ready状態にならなかったので mailgun にしました。
放置した SendGridは、日曜日に申請して翌日の 17時ごろに ready になったので、もしかすると事業者のタイムゾーンで日中に申請すればその日中に使えるようになるのかもしれません。

さて、[Mailgun](https://mailgun.com/) についてですが、月に 10,000通までは無料で使えます。SendGrid は 2,000通までですね。

ここから先は、スクリーンショットは貼れませんので頑張って言葉で伝えようとします。

まずは、 `Domains` から `Add New Domain` を選択して、認証するドメインを設定します。

> We recommend using a subdomain with Mailgun, like “mg.mydomain.com”. Using a subdomain you will still be able to send emails from your root domain e.g. “you@mydomain.com”.

とある通り、サブドメインを登録した方が良いよーって書いてあります。
例えば、`example.com` というドメインを保持しているとしたら、 `hoge.example.com` などとします。
その後、TXTレコードと CNAMEレコードと MXレコードをそれぞれ設定するように言われるので、それぞれの値をそのまま Cloud DNS に打ち込んでいきます。

ここで、SPF の値（v=spf1 include:mailgun.org ~all）に関しては、そのまま入力すると

```
"v=spf1" "include:mailgun.org" "~all"
```

と変換されて上手く行かなかったので、

```
"v=spf1 include:mailgun.org ~all"
```

として入力しました。
（インターネットに繋がっている）ローカルマシンのターミナルから、

```
$ dig ホスト名 txt
```

と打って入力した値が返ってきていれば成功です。
全部うまく行くと State が Active になります。

その後、mailgun の document にあるメール送信テストでメールが送れることを確認したら、GCP に戻って 2525番ポート（tcp）を解放します。

---

ここからは Rails固有の設定です。
ruby に関しては、mailgun のドキュメントにかなり詳細に手順が書いてあるので、そのままラッパーを作ってメールを送っても良いですが、やっぱり Rails だったら ActionMailer を使いたいので、`mailgun_rails` を Gemfile に追加します。

```ruby:Gemfile
# Use mailgun to send emails
gem 'mailgun_rails'
```

その後、`bundle install` をして、`config/environments/production.rb` に以下のように設定を書きます。

```ruby:production.rb
config.action_mailer.delivery_method = :mailgun
config.action_mailer.mailgun_settings = {
  api_key: 'mailgun に書いてある api_key',
  domain: 'メールを送信するドメイン'
}
```

書いたらデプロイして、Rails Runner などからメールが送れることが確認できれば設定完了です。

---

で、いちおう簡単なシステムは走るようになったのですが、複雑なシステム（例えば elasticsearch を使っているもの）はまだ移行していません。
運用ノウハウもない段階でいきなり全てのサービスを移行するのはリスクが高いですし、そもそも世に出ている記事のコストとかの話はあくまで一般論なので、このケースでも安くなるという保証はありません。

というわけで、一部分を移行した状態で年を超え、そして DDoS攻撃（テレビ）に耐えてみたいと思います。


## 後日談

- [gatling による負荷試験とテレビ露出見積り](http://qiita.com/chase0213/items/b5ecd4377f60605332e1)
- [GCP で Autoscaling Groups を使う](http://qiita.com/chase0213/items/6cad4475a5b57895aca1)