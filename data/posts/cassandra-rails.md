Cassandra とは？
---------------

Cassandra は 2008年に Facebook によってオープンソース化された分散型KVSです。
Amazon Dynamo の作者の一人である Avinash Lakshman と、Facebook のエンジニアである Prashant Malik によって設計されました。

Cassandra は、高可用性（High Availability）を持ち、コモディティハードウェアやクラウド基盤上で線形スケーラビリティ（Linear Scalability）と耐障害性（Fault-Tolerance）を提供します。
誤解を恐れずに平たく言えば、

- ノードに障害が発生してもサービスを提供し続けることができ、
- ノードを追加することで線形に性能が向上し、
- 通信障害などによってメッセージが損失しても継続してサービスを提供する

ということです。
分散コンピューティングにおいて、[CAP定理](http://ja.wikipedia.org/wiki/CAP%E5%AE%9A%E7%90%86)という[定理](http://webpages.cs.luc.edu/~pld/353/gilbert_lynch_brewer_proof.pdf)がよく知られていますが、そのうちの AP を重視したアーキテクチャです。

Apache Cassandra
http://cassandra.apache.org/


カラム指向の利点・欠点
------------------

MySQL を始めとする行指向のデータベースでは、少数行の複数列からなるデータを扱うのに適していますが、大量の行に関して少数の列へ変更を加えるといった処理には適していません。一方で、列指向のデータベースはその逆の特性を持ちます。

例えば、サーバーログなどの大量のデータを扱いたいが、実際に使用するのは 2つか 3つの列であるというような場面では、理論上列指向のデータベースの方が優れていると言えます。
逆に、同様にしてサーバーログを扱う場面でも、複数列の結果を併せて使用したいという要件では、カラム指向は最適な選択とは言えないかもしれません（ただし、時系列データに関しては、RDB もあまり得意とする分野ではありません）。

Rails で Cassandra を使う
------------------------

さて、実際に Cassandra を Rails から使用してみます。
今回は、MacBook上に 1ノードからなる Cassandraクラスタを構築して使用してみます。

Cassandra は、[Apache Cassandra](http://cassandra.apache.org/) からダウンロードできますが、Mac の場合は homebrew から以下のコマンドを叩くだけでインストールできるので、そちらを使用します。

```bash:terminal
$ brew install cassandra
```

インストールが完了した後で、以下のコマンドを打つと、Cassandra がフォアグラウンドで起動します。
daemonモードで起動したい場合は、```-f``` を消してください。

```bash:terminal
$ cassandra -f
```

フォアグラウンドで起動すると terminal が 1画面占領されるので、新しく terminal を開くなり、tmux を使用するなりして別ウィンドウで起動してください。

次に、Rails で新しいアプリケーションを作成します。この際、ActiveRecord は使用しないため、skip します。

```bash:teminal
$ rails new CassandraRails --skip-active-record
```

ActiveRecord に似たインターフェースで Cassandra を操作するために、Gemfile に [cequel](https://github.com/cequel/cequel) を追加します。

```ruby:Gemfile
gem 'cequel'
```

その後、いつものように ```bundle install``` をして、必要な gem をインストールします。cequel と cassandra-driver がインストールされるはずです。

インストールが完了したら、設定を行います。

```bash:terminal
$ rails g cequel:configuration
```

これにより、```config/cequel.yml``` が作成されます。
中身はおおよそ Cassandraクラスタに関する情報です。
今回はとりあえず 開発環境として localhost上に 1ノードからなる Cassandraクラスタを構築するので、このままで大丈夫です。

最後に、Cassandra上に keyspace を作成します。RDB で言うところの DB に対応します。

```
$ rake cequel:keyspace:create
```

これで設定は完了です。試しに tweet の情報を格納する Tweetモデルを作成してみます。

```ruby:app/models/tweet.rb
class Tweet
  include Cequel::Record

  key :id, :text
  column :username, :text
  column :body, :text
  column :retweeted, :int
  column :favarited, :int
end
```

自動的に primary key を作成しないため、明示的に指定してあげる必要があります。
ここでは、```key :id, :text``` として指定しています。tweet_id をナチュラルキーとして用いる想定で作成しています。
今回は使用していませんが、belongs_to / has_many などが使えるようです。
ちなみに、Cassandra に対するクエリ言語である CQL で使用できるデータ型については [CQL data types](http://docs.datastax.com/en/cql/3.1/cql/cql_reference/cql_data_types_c.html)に一覧があります。cequel でコレクション型（list, set, map）を使うためには、例えば以下のように model に記述します。

```ruby:app/models/tweet.rb
class Tweet
  include Cequel::Record

  （中略）
  set :reply_to, :text
end
```

モデルの記述が終わったら、migration を実行します。

```bash:terminal
$ rake cequel:migrate
Synchronized schema for Tweet
```

migration を実行しても、migrationファイルが追加されることはありません。

以上で Cassandra を Rails から使用する準備が整いました。
実際に rails console からデータを入力してみます。

```bash:terminal
$ rails c
Loading development environment (Rails 4.2.1)

irb(main):001:0> t = Tweet.new(id: 't123')
=> #<Tweet id: "t123", username: nil, body: nil, retweeted: nil, favarited: nil, reply_to: #<Set: {}>>

irb(main):002:0> t.username = '_c_hase'
=> "_c_hase"

irb(main):003:0> t.reply_to << 't122'
=> #<Set: {"t122"}>

irb(main):004:0> t.save
=> true
```

という感じで、ActiveRecord を使用するのと同じように Cassandra にアクセスできています（見やすいように改行
を入れています）。
find は model中で指定したキーに対して実行可能です。

```ruby:irb
> t = Tweet.find('t123')
=> #<Tweet id: "t123", body: nil, favarited: nil, reply_to: #<Set: {"t122"}>, retweeted: nil, username: "_c_hase">

> t.username
=> "_c_hase"
```

ただし、RDB のように whereメソッドで絞り込もうとすると、ArgumentError となります。

```
> Tweet.where(username: '_c_hase')
ArgumentError: Can't scope by non-indexed column username
```

エラーコードにあるままなのですが、特定のカラムで絞り込みたい場合は、index を作成します。

```diff:terminal
$ git diff
diff --git a/app/models/tweet.rb b/app/models/tweet.rb
index 80d2400..be18e40 100644
--- a/app/models/tweet.rb
+++ b/app/models/tweet.rb
@@ -2,7 +2,7 @@ class Tweet
   include Cequel::Record

   key :id, :text
-  column :username, :text
+  column :username, :text, :index => true
   column :body, :text
   column :retweeted, :int
   column :favarited, :int
```

migration を実行したタイミングで index が貼られるので、```$ rake cequel:migrate``` を忘れずに実行してください。

```ruby:irb
> Tweet.where(username: '_c_hase')
=> [#<Tweet id: "t123", body: nil, favarited: nil, reply_to: #<Set: {"t122"}>, retweeted: nil, username: "_c_hase">]
```

まとめ
-----

cequel を使用することで、ActiveRecord と似た感じで Cassandra を操作できることを確認しました。
まだ発展途上という感じがするのですが、時系列データを扱いたいときなどには手軽に使用できるので、検討してみてはいかがでしょうか。

次回予告
-------

もう少し理論的なところから、Cassandra について実験・考察をしたいと思っています。
Cassandraメインの記事で、おまけとして Rails で使用するという感じになるかと思います。

Appendix
---------

本件のサンプルプロジェクトは今後も加筆していく予定なので、コードは github にあげてあります（```commit 2b93f1211ace3ffde4c0217a32b4d2a29ba6dcda``` まで）。
https://github.com/chase0213/CassandraRailsSample