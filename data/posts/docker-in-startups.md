昨年ごろから急に docker って流行り出しましたよね。
https://www.docker.com/

僕も docker のチュートリアルをひと通りやってなんとなくコマンド覚えたんですけど、chef で良くない？ってなって結局使わずじまいでした。

ただ、最近になって、ちょっと思い直している部分があって、



<blockquote class="twitter-tweet" lang="ja"><p lang="ja" dir="ltr">Docker は Kubernetes 使ってこそだろーと思って勝手に自社サーバ持ってる企業だけが恩恵にあずかれると思っていたのだけど、その管理はクラウド屋さんに任せて dockerfile 書いておけば dev/stg/prd 全て共通だよっていう享受の仕方もありかな、と。</p>&mdash; C. Hasegawa (@_c_hase) <a href="https://twitter.com/_c_hase/status/636944596337979392">2015, 8月 27</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

ということです。
おそらく同じような懸念をいただいている方はそれなりの数いると思うので、なんとなく疑問に思っていたことを綴ってみようかと思います。

### 疑問１：それって chef で良くない？

僕の環境に関しての結論ですが、docker の方が楽になるかもしれません。
まず、弊社におけるスタンダードな開発環境というのは、

- MacOS上で Rails Server を立ち上げて開発する
- 機能の関係で、elasticsearch を立ち上げないといけない
- けっこう色々な DB を見ている

です。

まず、新しく人がジョインする度にこれをやるのがけっこうツライです。
リモートでのセットアップになるともう泣きそうです。
そもそも ruby のインストールに数分かかるからそれまでなんとかして会話を持たせないといけません。
elasticsearch の管理平気ですか？
あっ、DB は database.yml を書き換えて、こうしてください！

という様々な問題があります。
さらに、意外と色々なエラーが出てくるので、その都度僕も対応しないといけません。

開発環境も chef で構築すれば良いんですが、MacOS上にインストールするので、ちょっと手伝って欲しいって人にとったら結構重い作業ですし、そもそも OSX と linux の違いを吸収できていないので、stg にあげてみたら上手く行かなかったから修正してくださいとか、ほぼ無理ゲーです。
あとは、chefサーバーに接続するための鍵配ったり credential 用意したりと、結構手間がかかります。

これって、docker にしたら docker 入れて dockerfile 落として build するだけで済むんじゃない？
って思っています。

ただまぁ、

> そもそも ruby のインストールに数分かかるからそれまでなんとかして会話を持たせないといけません。

この件だけは問題が肥大化しますが。
近くに珈琲屋さんがあるのでそれとなく誘導することで回避できます。

### 疑問２：Docker って Kubernetes ないと意味なくない？

これに関しては、未だに僕はそう思っています。
AWS にインスタンス作ってその上で docker を展開するなら、インスタンス上に直で環境構築した方が余計なオーバーヘッドもないし制約もないし、楽だと思います。

ただ、最近考えなおした点は、Kubernetes を自社で運用する必要なくない？というところです。

冒頭の twitter でも言っている通り、Kubernetes の運用はクラウド屋さんに任せてしまえば良いと思っています。
それでも我々が Kubernetes から享受できる恩恵は何ら変わりません。

例えば、Kuernetes では個々のコンテナは pod と呼ばれるより小さな単位で管理されますが、その pod が死んだときの動作を色々と規定できるようです。
さらっと書こうとしたのですが、思ったよりも条件分岐が多かったので、詳しくは以下のページをご覧ください。

Pods
http://kubernetes.io/v1.0/docs/user-guide/pods.html#durability-of-pods-or-lack-thereof

The life of a pod
http://kubernetes.io/v1.0/docs/user-guide/pod-states.html

Kubernetes が Google によって開発されたプロダクトであることを考えると、GCP を使用する方がスッキリするかもしれません（あくまで Kubernetes を使用するという前提での意見です）。
AWS でもコンテナサービスは提供されていますが、Kubernetes が使われているかどうかまでは調べていません。

GCP
https://cloud.google.com/container-engine/

AWS
https://aws.amazon.com/jp/ecs/

### 疑問３：学習コストが・・・

メリットがデメリットを上回るのであればコストは払いましょう、以上です。

### 疑問４：dockerfile とか docker image ってどこに置くの？

dockerfile はただのテキストファイルなので、git とか subversion とかで管理するのが望ましいかと思います。

docker image はバイナリファイルなので、差分管理システムに載せるのはあまり賢くないかも知れません。
それは当然 docker社も把握しているようで、

- Docker Registry
https://docs.docker.com/registry/
- Docker Hub
https://hub.docker.com/
- Docker Trusted Registry
https://docs.docker.com/docker-trusted-registry/

というようなサービスやらプロダクトを提供しています。
GCP とか AWS でも同様のサービスがあるのかもしれませんが、ちょっと見きれていません。

一応簡単に（本当に表面的に）それぞれの違いを見ておきます。

#### Docker Registry

https://docs.docker.com/registry/

> The Registry is a stateless, highly scalable server side application that stores and lets you distribute Docker images. The Registry is open-source, under the permissive Apache license.

拙訳

```text
このレジストリは、ステートレスでスケーラブルな、Docker image を保持したり頒布したりするためのサーバーサイドアプリケーションです。
オープンソース（Apacheライセンス）です。
```

つまり、会社の規約上クラウドなどにイメージファイルが載せられなかったりするときに、Docker Registry をデプロイしておけば、そこに docker image が置けるよ、というもののようです。

#### Docker Hub

https://hub.docker.com/

公式ページから一言説明が取ってこれなかったのですが、誤解を恐れずに簡単に言うと github の docker image版です。
インフラ部分なので、ここから取ってきて使うとなるとなかなか抵抗がありますが、chef の cookbook とかも外部から取ってきて使うのであまり変わらないかもしれません。
使用して良いのは企業が出しているものに限るとか、適当に運用ポリシーを定めれば良いのかも知れません。

ちなみに private docker hub というものもあって、これはちょうど github の private リポジトリに相当するものかと思います。

#### Docker Trusted Registry

https://docs.docker.com/docker-trusted-registry/

> Docker Trusted Registry (DTR) lets you run and manage your own Docker image storage service, securely on your own infrastructure behind your company firewall. This allows you to securely store, push, and pull the images used by your enterprise to build, ship, and run applications. DTR also provides monitoring and usage information to help you understand the workloads being placed on it.

拙訳

```text
Docker Trusted Registry（以下 DTR）は、あなたの会社のファイアウォールの後ろで docker imageストレージサービスをセキュアに提供します。エンタープライズによって使用されるイメージをセキュアに保存し、プッシュし、そしてプルすることで、ビルドし、シップし、そしてアプリケーションを起動できます。DTR はそのサーバーの負荷や、使用状況をモニタリングする機能をも兼ね備えています。
```

完全にエンタープライズ向けという感じですね。
Docker Registry でめんどくさいところ（Docker Registry の走るサーバーの状態監視とかセキュリティとか）を引き受けるからお金をください、という OSS系企業によく見るビジネスモデルだと思います。
Docker Registry とどちらを使うのかは経営判断なので、割愛します。

僕がどちらにするか迫られたら、private docker hub を使うという判断をするかと思います。
おそらくイメージファイルのサイズはそれなりに大きくなるでしょうから、クラウドにあげておくのは料金体系的にキツそうなので。
（真面目に検証したわけではないので、この意見はあまり信用しないでください。）

### 疑問５：金銭的コスト面

GCP に関しては、インスタンス立ち上げるのと同額です（2015年8月現在）。
https://cloud.google.com/container-engine/#pricing

AWS もインスタンスとか ELB の料金だけとのことなので、変わりません
https://aws.amazon.com/jp/ecs/pricing/

つまり、上記２社のどちらを使っても料金は通常通り VM / インスタンスを立ち上げるのと同額です。

---

というわけで、なぜベンチャーで docker を使うのかという仮説質問に対して自分を説得する形で回答してみました。
まだ弊社で導入するかどうかは決まったわけではないのですが、少なくとも検証の余地はあるかと思っています。
「私も docker 使いたい！混ぜて！」という方がいらっしゃいましたら、twitter とかで是非ご連絡ください。

---


弊社の代表が NHK の某番組に出演させていただく機会がありまして、実はこんなことをしていました。

- [gatling による負荷試験とテレビ露出見積り](http://qiita.com/chase0213/items/b5ecd4377f60605332e1)
- [GCP で Autoscaling Groups を使う](http://qiita.com/chase0213/items/6cad4475a5b57895aca1)

前者はあまり関係ないのですが、後者に関して docker を使っていると便利そうだな、というケースがあったので、ごく短い記事ですが続編として投稿します。

さて、後者の記事で、[Managed instance group の作り方](http://qiita.com/chase0213/items/6cad4475a5b57895aca1#managed-instance-group-%E3%81%AE%E4%BD%9C%E3%82%8A%E6%96%B9) という節を書きました。
記事中ではイメージからインスタンスグループを作成する、という方法を紹介していますが、実はここで docker形式のイメージをマウントすることができます。
ここで考えたいのは、dockerイメージを使用しない場合の autoscaling の運用です。

記事中で紹介している方法では、スナップショットを基にイメージを作成しています。
この状態で、アプリケーションの更新を行った場合に何が起こるかを考えます。
オートスケーリングの際に作成するインスタンスのイメージには、更新前のアプリケーションがデプロイされているため、改めてアプリケーションをデプロイする必要が生じます。
従って、アプリケーションを最新の状態に保つためには、

1. 既存のインスタンスが規定の負荷を超える
2. オートスケーリング機能によってインスタンスが立ち上がる
3. 立ち上がったインスタンスに対して新しいアプリケーションをデプロイする

というステップが必要になります。
それが嫌ならば、アプリケーションに更新がある度に、[決して簡単とはいえない手順](http://qiita.com/chase0213/items/6cad4475a5b57895aca1#%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%B3%E3%82%B9%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88%E3%81%AE%E4%BD%9C%E6%88%90%E6%97%A2%E5%AD%98%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%B3%E3%82%B9%E3%81%8B%E3%82%89%E4%BD%9C%E6%88%90)でイメージを作成しなければいけません。

あれっ？これって dockerイメージをデプロイした方が直感的だし、簡単じゃない？というのが、本記事で書きたかったモチベーションです。

メディアへの露出は、比較的大きなサービス（例えば MAU が 1億を超えるような）を運営しているところではあまり気にすることでもないですが、普段小さなインスタンス数台で運用しているようなスタートアップにおいては、このような自動化は重視されるべきことかと思います。
急なスパイクに明示的に対応しなければいけないベンチャーこそ、docker を使うべきだ、という主張が僕の中で強くなってきましたが、それは観測された事実ではなくて僕の意見なのでこの辺りで。