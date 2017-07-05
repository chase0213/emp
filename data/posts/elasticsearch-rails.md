## はじめに

WEBアプリケーションの中で、検索機能を付けたくなることありますよね。
普通に考えたら、検索エンジン用のサーバーを構築して、そこに solr なり elasticsearch なりを入れて、Rails から httpリクエストを飛ばして・・・ってやれば良いと思うんですが、Rails のモデルと elasticsearch のドキュメントの対応関係を考えたり、
その周りの設計をしたりと結構手間がかかります。
うーん、もっとこう、モデルとドキュメントが一対一くらいの感じで対応してくれて、使いやすいやつないかなぁー

というわけで、こちらの gem の検証です。

[elasticsearch-rails](https://github.com/elastic/elasticsearch-rails)

よく見たら elasticsearch の公式リポジトリでしたね。
elasticsearch は公式サイトからダウンロードしてきて、適当に設定しておいてください。この記事では説明しません。

## 概要とか使い方とか

### 概要

まず疑問に思うのが、Installation のところで、

```
gem 'elasticsearch-model', git: 'git://github.com/elasticsearch/elasticsearch-rails.git'
gem 'elasticsearch-rails', git: 'git://github.com/elasticsearch/elasticsearch-rails.git'
```

ってなってるところです。

えっ、2つあるっ、なにこれっ

となったので、それぞれの説明を読んでみます。

- elasticsearch-rails

> The elasticsearch-rails library is a companion for the the elasticsearch-model library, providing features suitable
for Ruby on Rails applications.

【拙訳】

```
elasticsearch-railsライブラリは、elasticsearch-modelライブラリの友だちだよ！Ruby on Rails のアプリケーションに適した機能を提供するからねっ！
```

- elasticsearch-model

> The elasticsearch-model library builds on top of the the elasticsearch library.
>
> It aims to simplify integration of Ruby classes ("models"), commonly found e.g. in Ruby on Rails applications, with
the Elasticsearch search and analytics engine.

【拙訳】

```
elasticsearch-modelライブラリは elasticsearchライブラリの上に構築されているよ。

（例えば Ruby on Railsアプリとかの中で）よく目にする、Rubyのクラス（モデル）と Elasticsearch の検索・解析エンジンとの結合を単純化することが目的としているんだ。
```

ふむふむ。なるほど、わからん。

いや、わかることは分かるんですけど、具体的に何がどう違うのかよくわからなかったので、もう少し README を読んでみました。
すると（ここからは個人の感想です）、-rails の方は、rakeコマンドを提供しているように見えます。
例えば、

```
$ bundle exec rake environment elasticsearch:import:model CLASS='Article'
```

とかしています。
一方で、-model の方は、実際に model に Elasticsearch の機能を追加しているようです。

```ruby:article.rb
require 'elasticsearch/model'

class Article < ActiveRecord::Base
  include Elasticsearch::Model
end
```

つまり、rakeコマンドを使わないでガリガリスクラッチする勢は -model の方だけ組み込んでおけば良いのかもしれません。
（ここまでが個人の感想です。）

### 使い方

#### インストール

さて、とりあえず両方とも入れてみます。

```ruby:Gemfile
gem 'elasticsearch-model', git: 'git://github.com/elasticsearch/elasticsearch-rails.git'
gem 'elasticsearch-rails', git: 'git://github.com/elasticsearch/elasticsearch-rails.git'
```

で、```bundle install``` しておきます。

#### モデルと紐付ける

前提として、既に作成されているモデルに対して Elasticsearch の機能を付けることにします。
新規に作成する際には、-rails の方を参考に rakeコマンドを叩けば簡単だと思います。

さっきもちらっと書きましたけど、モデルに紐付けます。

```ruby:article.rb
require 'elasticsearch/model'

class Article < ActiveRecord::Base
  include Elasticsearch::Model
end
```

これで Article というモデルに、searchメソッドとかが組み込まれました。
本当かどうか試しに Rails console 上で遊んで見ます。

```ruby:console
> Article.import
  Article Load (0.6ms)  SELECT  `articles`.* FROM `articles `  ORDER BY `articles `.`id` ASC LIMIT 1000
Faraday::ConnectionFailed: Connection refused - connect(2) for "localhost" port 9200
```

あぁ、はい。
elasticsearch を起動しないとダメですよ。

余談なんですが、少し前に elasticsearch をデフォルトで使っていたら知らない人とクラスタ作ってたｗｗみたいなツイートがあって笑いました。

elasticsearch を起動してから再挑戦した結果がこんな感じです。

```ruby:console
> Article.import
  Article Load (0.3ms)  SELECT  `articles`.* FROM `articles`  ORDER BY `articles`.`id` ASC LIMIT 1000
=> 0
```

デフォルトで import すると、~~1000件だけ~~（1,000件毎に）import してくれるみたいですね。


これで elasticsearch にインデックスされたので、

```ruby:console
> response = Article.search('hoge')
```

とかすると、ドキュメントを検索できます。
response に検索結果を含み色々入ってますが、長くなるので公式ドキュメントを読んでください。

https://github.com/elastic/elasticsearch-rails/tree/master/elasticsearch-model

ちなみに斜め読みしたら、

```ruby:console
response.records.to_a
```

が便利そうです。

- 疑問1: もっと沢山インポートしたいときにはどうするか
- 疑問2: 差分だけインポートするにはどうするか

という疑問が出たので、後で考えます。


## 複数モデルにまたがるクエリ

さて、前節で Articleモデルを elasticsearch にインデックスさせて検索してみたわけですが、実用上はこれだと困ります。
RDB を使っている場合、通常テーブルは正規化されていると思いますので、この Article というモデルには著者の情報などが入っていないわけです。
Article を検索したいという要請があったとき、著者名でも検索できるようにしてよというのはごく自然な発想なので、その検証をします。

んー、まぁ includes してから import すればいいんじゃないかなーと思って

```ruby:console
Article.all.includes(:authors).import
```

と書いたらとりあえずノーエラーにはなったので、「お、いけた？」と思って schema を確認してみたら、ダメでした。

```bash:terminal
$ curl -XGET http://localhost:9200/_mappings?pretty
{
  "articles" : {
    "mappings" : {
      "article" : {
        "properties" : {
          "created_at" : {
            "type" : "date",
            "format" : "dateOptionalTime"
          },
          "id" : {
            "type" : "long"
          },
......
}

# => authors に関する情報が index されていない

```

そもそも authors に関する情報も article の index として保存してしまうと、authers の index を作成するときに情報が重複することになるので、index の更新時間が単純に考えて重複した index分だけ増えます。
なのでこういう使い方は、仮にできたとしてもアンチパターンまっしぐらかも知れません。

というわけで、方針転換して、1モデル 1インデックスという感じで（当初書いたとおり）なんとかします。

### 方針

とりあえず、複数のモデルから検索したいところは変わらないので、その方法を調べます。

[Searching multiple models](https://github.com/elastic/elasticsearch-rails/tree/master/elasticsearch-model#searching-m
ultiple-models)

上記リンクにある通り、```Elasticsearch::Model.search```メソッドに対象のモデル名を Array で突っ込めば良いようです。

```ruby:console
> res = Elasticsearch::Model.search('hoge*', [Article, Author])
```

これで ```res.results``` や ```res.records``` とするとヒットした結果にアクセスできます。
当然、```res``` には Article と Author とが入り交じっているため、Rails側で何らかの対応が必要です。

元々の目的は、「特定の Author を含む Article を取得したい」というところだったと思うので、以下のように書きます。

```ruby:hoge.rb
res_article = []
res_author  = []

# モデルが混在しているので、振り分ける
res.records.to_a.each do |r|
  case r.class.to_s
  when 'Article'
    res_article << r
  when 'Author'
    res_author << r
  end
end

# Author を含む Article を DB から検索
articles = Article.includes(:author).where(※適当な条件).to_a
# 結果をマージする
articles = (articles + res_articles).uniq
```

「※適当な条件」はモデルがどうリレーションを持っているかに依るので、適宜埋めてください。


DB は 1回しかなめていないですし、多くの場合「※適当な条件」は id の一致で queryとれば良いと思うので、DB負荷はそれほど高くないはずです。
加えて、自然言語による検索部分を elasticsearch に委ねているので、リッチな検索を提供できるかと思います。

今回の方法だと、```res.records.to_a``` してしまっているので、ハイライト機能とかは使用できません。
それから、rank param の情報も落としてしまっているので、検索キーワードに良く適合したものが上位に来るようにすることもできません。

前者はともかく、後者に関しては検索エンジンの良いところを一つ潰してしまっているので、アプリ側で少し工夫しないといけないと思います（この記事では言及しません）。

## importのタイミング

bulk import は上記の通り、Model.import などを行うと import できます。
ただし、やっていることは DB から SELECT してきて、それを elasticsearch でインポートしているだけなので、DB側にも elasticsearch側にも高負荷がかかります。
実際に 10,000件のデータを import してみたところ、手元の MacBookPro late 2014 Retina で数十秒から数分かかり、その間 CPU を ruby と java のプロセスで食い合っている状態でした。
意外にもメモリはあまり食っていなかったので、設定次第でもう少し高速にできるのだと思います。

ただし、elasticsearch-rails ではデフォルトで、モデルが更新されたタイミングで elasticsearch側でも import を行ってくれます（※）。

コードで言うとこの辺りです。

https://github.com/elastic/elasticsearch-rails/blob/master/elasticsearch-model/lib/elasticsearch/model/adapters/active_record.rb#L72

:create, :update, :destroy の commit後に index のアップデートを行ってくれるようになっています（便利）。

規模によってはこれが嫌な場合があると思いますが、その場合はこの callback をどうにかすれば良いのだと思います（調べてません）。

※ 補足

対象のモデルに以下の 1文を書いておく必要があります。

```
include Elasticsearch::Model::Callbacks
```

## Q&A

- 疑問1: もっと沢山インポートしたいときにはどうするか

batch_size を指定すれば良さそうです（[ソースコード](https://github.com/elastic/elasticsearch-rails/blob/master/elasticsearch-model/lib/elasticsearch/model/importing.rb)）。

```
> Article.import batch_size: 10000
  Article Load (0.4ms)  SELECT  `articles`.* FROM `articles `  ORDER BY `articles `.`id` ASC LIMIT 10000
=> 0
```

- 疑問2: 差分だけインポートするにはどうするか

model の更新のタイミングでインポートするので困っていないので、これ以上は調べていません、悪しからず。。


---

# 後日談

## 結局採用したの？

目次に 4つ項目が並んでいる時点でお察しですが、採用しました。

## どういうコンセプト？

前回、[複数モデルにまたがるクエリ](http://qiita.com/chase0213/items/ca6acc5d6bfecbd72be5#%E8%A4%87%E6%95%B0%E3%83%A2%E3%83%87%E3%83%AB%E3%81%AB%E3%81%BE%E3%81%9F%E3%81%8C%E3%82%8B%E3%82%AF%E3%82%A8%E3%83%AA) のところで、

> そもそも authors に関する情報も article の index として保存してしまうと、authers の index を作成するときに情報が重複することになるので、index の更新時間が単純に考えて重複した index分だけ増えます。
なのでこういう使い方は、仮にできたとしてもアンチパターンまっしぐらかも知れません。

と書いたのですが、若気の至りと言いますか、RDB と KVS では違うよねというところに気づいて、リレーションごとネストして持たせる方法をとっています。
この方法によって解決される問題は、あるカテゴリに属する記事に関して、そのカテゴリ名でも hit するし、記事のタイトルや本文でも hit するという、ある種全文検索エンジンとして真っ当な使い方ができることです（しかも RDB は舐めないので速い）。

## 設定方法は？

前回と重複するところもありますが、バージョンが変わったりしているかもしれないので書いていきます。

### モデルへ全文検索機能の追加

elasticsearch-rails の機能を使用するために、`Elasticsearch::Model` を include します。

```ruby
class Category < ActiveRecord::Base

  # これを追加
  include Elasticsearch::Model

  # コールバックをフックして Elasticsearch のドキュメントを更新する場合はこちらも
  # include Elasticsearch::Model::Callbacks

  ...
```

### アナライザーとかの設定

同モデルにおいて、例えば以下のように設定を書いていきます。
[kuromoji](http://www.atilika.org/) というよく使われる形態素解析器を使っています。
細かい話をしだすとこの記事ではスペースが足りないので、ここでは割愛します。
とりあえず、この設定ファイルがわからない場合は、まずは全文検索エンジンの仕組みについての学習を先にされることをオススメします。

```ruby
settings analysis: {
  filter: {
    pos_filter: {
      type: 'kuromoji_part_of_speech',
      stoptags: ['助詞-格助詞-一般', '助詞-終助詞'],
    },
    greek_lowercase_filter: {
      type: 'lowercase',
      language: 'greek',
    },
  },
  tokenizer: {
    kuromoji: {
      type: 'kuromoji_tokenizer',
    },
    ngram_tokenizer: {
      type: 'nGram',
      min_gram: '2',
      max_gram: '3',
      token_chars: [
        'letter',
        'digit'
      ]
    }
  },
  analyzer: {
    kuromoji_analyzer: {
      type: 'custom',
      tokenizer: 'kuromoji_tokenizer',
      filter: ['kuromoji_baseform', 'pos_filter', 'greek_lowercase_filter', 'cjk_width'],
    },
    ngram_analyzer: {
      tokenizer: 'ngram_tokenizer'
    }
  }
}
```

### Elasticsearch側のインデックスの設定

今回、index をネストさせることを前提としているので、dynamicインデックスを使うのを止めて、手動で設定します。

```ruby
settings index: { number_of_shards: 3 } do
  mappings dynamic: 'false' do
    indexes :id, type: :long, index: :not_analyzed
    indexes :name, type: :string, index: :analyzed, analyzer: :kuromoji_analyzer

    indexes :articles, type: :nested do
      indexes :title, type: :string, index: :analyzed, analyzer: :ngram_analyzer
      indexes :body, type: :string, index: :analyzed, analyzer: :kuromoji_analyzer
    end
  end
end
```

実際に私が運用しているものよりかなり簡略化していますが、雰囲気はこんな感じです。
ポイントは、中腹辺りで宣言している、`indexes :articles, type: :nested` のところです。
この設定を行うことで、Elasticsearch に「あ、Category は Article をネストして持ってるのね、ふむふむ」ということを理解させます。

ただし、あくまでこれは Elasticsearch が理解する話なので、Railsから送り出すデータがその形式になっているか否かは別の問題です。なので、Rails側で送り出すデータを以下のように書いて変形してあげます。

```ruby
def as_indexed_json(options={})
  # カテゴリについて
  category_attrs = {
    id: self.id
    name: self.name
  }

  # カテゴリに紐づく記事について
  category_attrs[:articles] = self.articles.map do |article|
    {
      title: article.title,
      body: article.body,
    }
  end

  category_attrs.as_json
end
```

`as_indexed_json`メソッドは、elasticsearch-model の中で import が実行される際に呼ばれます。
https://github.com/elastic/elasticsearch-rails/blob/b6d485748c71a07d064ea2a46a6da82d64a04cd7/elasticsearch-model/lib/elasticsearch/model/adapters/active_record.rb#L111

従って、このメソッドをオーバーライドすることで、（Elasticsearch への）import時に実行されるデータの変換をコントロールすることができます。

### インデックスの作成＆インポート

ここまでできたら、あとは Elasticsearch にインデックスを登録して、ドキュメント（Elasticsearch の用語で、検索対象の単位です）をアップロードすれば、検索を行うことができます。

#### インデックス作成

```irb
> Category.__elasticsearch__.create_index! force: true
```

#### インポート

```irb
> Category.import
```

### Nested Search

実際に使っているクエリを簡略化したものなので、間違えているかもしれません、雰囲気こんな感じです。
`nested`、`path`、`articles.title`辺りが肝かと思います。

```ruby
keyword = #...

# クエリの組み立て
query = {
  "bool" => {
    "should" => [
      {
        "match" => {
          "name" => keyword
        }
      },
      {
        "nested" => {
          "path" => "articles",
          "query" => {
            "match" => {
              "articles.title" => keyword
            }
          }
        }
      }
    ]
  }
}

# 検索
Category.search(query)
```

ここまで来て、検索対象って普通カテゴリじゃなくて記事だよねって気づいたのですが、今更なのでもうこのままにします。記事を検索したい場合は、上の手順の Category と Article を全て逆にすると大体正しいかと思います。


## 困ったところある？

あまりないのですが、クエリの組み立てが結構大変というのが唯一かつ最大の問題点です。
booleanクエリ（AND/ORなど）は elasticsearch ２系以降、should/must を使用する形式が採用されたのですが、英語ネイティブでないからなのかあまり直感的に書けずに毎回ドキュメントを参照している気がします。
まぁこれは elasticsearch-rails の問題ではないのですが・・・。

しかしこの点において、elasticsearch-rails では query が ruby のオブジェクトとして構築できるので、例えば must の条件を動的に変えたいという場面で、

```ruby
query[...]['must'] << some_condition
```

などと書けるのは大変良いです。

## まとめ

#### 結局採用したの？
しました

#### どういうコンセプト？
前言撤回して、ネストして（非正規化して）保持しています

#### 設定方法は？
上述の通りです

#### 困ったところある？
あまりないです