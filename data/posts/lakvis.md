# はじめに

Angular + firebase が非常に強力だという風の噂を聞いて、ふむふむそれならやってみようではないかと思い立ったのがこの記事執筆の動機である。
それぞれの公式サイトへのリンクを貼っておくので、それをもってそれぞれの説明とするという、怠惰極まりない導入だがお許しいただきたい。

- Angular
https://angular.io/

- Angular(github)
https://github.com/angular/angular

- firebase
https://firebase.google.com/?hl=ja


# このアプリは何なのか？

私が作成した Lakvis というアプリは、パスワードジェネレータを使って乱数を発生させて、あぁこれなら読めるなという文字列を適当に引っ張ってきて名付けたものである。
しかし内容は実用的なものにしようということで、かつて mixi が支配していたコミュニティの領域を、これでもかというくらいに機能を削り落として作った言わばサークル検索エンジンである。

https://ring-5e5c7.firebaseapp.com/#/

使い方はいたって簡単で、地域と競技を絞り込んで、後は Search と書かれたボタンをタップして、あとはお好きなサークルの幹事様と連絡をとってくれというものだ。
メッセージ機能は火種になるから付けていないし、このプラットフォームの上で交流することも望んでいない。

# 仕様について

さてまずはアプリの仕様について話していこう。

## システム構成

このシステムは Angular と firebase を使うところに動機がある。
従って当然、Angular と firebase が使われている。
詳しくは以下の表を見てもらいたい。

### Angular関連

| 名称 | npm | 期待する機能 |
| :---: | :---: | :--- |
| Angular | @angular | フロントエンドのフレームワークとして、安定的かつ迅速にアプリケーション開発を行える |
| Angular Material | @angular/material | 基礎的な部品について、高い UX を低コストで得たい |
| Angular Router | @angular/router | SPA にルーティング機能を追加したい |

### firebase関連

| 名称 | 説明 |
| :---:  | :--- |
| firebase database | リアルタイムの NoSQLデータベース |
| firebase authentication | 面倒な Authentication を非常に簡単に扱える |
| firebase storage | オンラインストレージ機能（画像のストレージとして使用） |
| firebase hosting | 静的ファイルのホスティングサービス |


## アプリケーション設計

### サービス設計

多くの時間はこの設計に割かれることになる。
まずは何をするアプリケーションなのか、誰のためのサービスなのか、どんなデバイスを想定しているのかなどなど考えることは尽きない。
尽きないのだが、この記事の目的は実はサービス設計に関する話ではないので、ここは丸っと省略しようと思う。

### オブジェクトデザインの話（Angular の話）

タイトルをなんとしようか迷ったのだが、ここでいうデザインとはユーザーが目の当たりにする小綺麗なインターフェースのことではない。
OOP では往々にしてオブジェクトという概念が出てくるが、ここでも例に漏れずオブジェクトベースの設計を行っている。

Angular の場合は @angular/cli という便利ツールを使うとベストプラクティス通りのディレクトリを勝手に整形してくれて非常に助かっているが、それでもちょっと気に食わない場所があるのでそこは少し手を加える。
例えばサービスが src以下に展開されてしまうと、ソースだけならまだしもテストファイルとかも同じディレクトリに置かれるので非常に煩雑になって読みにくい。なので私はいつも services というディレクトリを切って、そこに書いていくようにしている。

そんな細かい話はともかくとして、現実世界の問題をオブジェクトとしてどう抽象化するかというのが我々エンジニアという職についたものがすべきただ一つの仕事である。リズムの問題でただ一つと付けたが、実際にはただ一つでないことは私も重々承知している。大抵は紙詰まりしただけで壊れたとレッテルを貼られたプリンタを直すのもエンジニアの仕事である。

本題に戻ろう。
裏側が NoSQL だということが確定していたので、さて表側も煩雑な処理をギュッと圧縮して一つのサービス（service）として使える方が便利だなと思い、そのように切り分けた。
ここでいうサービスは、ユーザーに価値を提供するWEBアプリケーションという意味ではなくて、Angular内の共通言語してのサービスである。
わからない人はぜひ公式ドキュメントを見て欲しい。
おそらくこのあたりが良いだろう。
https://angular.io/docs/ts/latest/tutorial/toh-pt4.html


さて全体の設計についてざっと考えたところで、このアプリケーションでは firebase と通信するための低レイヤにおけるサービスと、グループや地域などのよりオブジェクトに近いところを抽象化する高レイヤにおけるサービスが必要だと気づいた。

#### 低レイヤにおけるサービス

低レイヤにおけるサービスは、アプリケーションがバックエンドと安全かつ安定的に通信することに責任を持つ。従って、実際に作成したものは以下のようなサービスだ。

| Service Name | Description |
| :---: | :--- |
| FirebaseService | firebase との通信に責任を持つ |
| AuthService | 認証系について責任を持つ（FirebaseService を DI している） |
| WebStorageService | Webストレージに対して責任を持つ（cookie、local storage などを DI している） |


#### 高レイヤでのサービス

高レイヤに置けるサービスは、ユーザーのアクションによって発生されたイベントのハンドリングに対して責任を持つ。以下のサービスが作成された。

| Service Name | Description |
| :---: | :--- |
| GroupService | グループに対して責任を持つ |
| GenreService | ジャンルに対して責任を持つ |
| AreaServcie | 地域に対して責任を持つ |
| SearchServcie | 検索に対して責任を持つ |

どの高レイヤにおけるサービスは、低レイヤのサービスを DI していることが多い。


## データベース設計（firebase database の話）

NoSQL / KVS だとスキーマレスだから設計しなくても良いという言及がされることがあるが、あれは控えめに言って言いすぎだろう。
実際にはどのユーザーがどの情報にアクセスできるべきなのかといったことを延々考えることになる。ここでネストを深くしてしまうとルールが非常に煩雑化してしまって、作った本人ですらメンテナンスをするのが億劫になるので、公式で謳われている[ベストプラクティス](https://firebase.google.com/docs/database/web/structure-data?hl=ja) に則っておいた方が得策である。
このベストプラクティスでは、

- データをネストしない
- データ構造を平坦化する
- 拡張可能なデータを作成する

と見出しがあり、しかしそれでは RDB と同じではないかと混乱したがとりあえずそれにしたがってみることにした自分を褒めてやりたい。

### スキーマ設計

例えばあなたがグループ「Enjoy Basketball!」の管理者であるとしよう。ネーミングセンスの有無についてはここでは目をつむっていただきたい。

そうすると firebase database（長いので以下 database と呼ぶ）上には以下のようなデータが格納される。

```json
{
  "group": {
    "g12345678": {
      "id": "g12345678",
      "name": "Enjoy Basketball!",
      "memberIds": [
        "u1234",
        "u2345"
      ],
      "adminIds": [
        "u1234"
      ]
    }
  }
}
```


これで良いだろうか？実際に修羅場を経験した私であれば次のように書く。

```json
{
  "group": {
    "g12345678": {
      "id": "g12345678",
      "name": "Enjoy Basketball!",
      "memberIds": {
        "u1234": true,
        "u2345": true
      },
      "adminIds": {
        "u1234": true
      }
    }
  }
}
```

違いがわかるだろうか？memberIds と adminIds のところで、配列で持つのをやめてオブジェクトの形で保持している。
なぜこうするのかと言えば判定その他が楽だからである。
例えばこのデータを javascript で扱うときに、memberIds でループを回さなければいけないのとオブジェクトのキーとして突っ込んでみれば良いという違いである。または firebase database では sort機能やフィルタ機能を提供しているが、これは基本的にオブジェクト形式を対象としたものであり、配列の形式では頭を抱えることがある。
https://firebase.google.com/docs/database/web/retrieve-data

しかしここでまた新しい問題が発生する。
これではグループに書き込めるかどうかの判定をするのに、group の下深くまで掘り下げなければならない。なので私は以下のように adminキーを追加することにした。

```json
{
  "admin": {
    "u1234": {
      "g12345678": true
    }
  }
}
```

これで誰がどう見ても、このグループ「Enjoy Basketball!」を編集できるのは "u1234" だけである。そしてまた大きな問題である。
なんと管理者情報が admin と group とで重複して管理されているのである。

実はこの冗長性に関しては公式ドキュメントでも触れられており、以下のように書いてある。

> これは、双方向の関係に必要な冗長性です。ユーザーやグループのリストが数百万件の規模に拡張された場合や、Realtime Database セキュリティ ルールで一部のレコードへのアクセスが禁じられている場合でも、この冗長性によって Ada のメンバーシップをすばやく効率的にフェッチできます。

https://firebase.google.com/docs/database/web/structure-data


そしてこのような構造をメンテナンスするのは、実はそれほど難しくない。
例えば今回の構造では以下のようにすれば良い。

```typescript
// groupId = ...
// userId  = ...

let updates = {};

updates['group/' + groupId + '/adminids/' + userId] = true;
updates['admin/' + userId + '/' + groupId] = true;

firebase.database().ref().update(updates);
```

これを高レイヤのサービスのメソッドとして持っていれば、そのメソッドを呼び出すだけでメンテナンスできる。ただしこのメソッドの見直し等のときに影響範囲にかなり気を使うことになるので、ドキュメントなりテストなりを整備しておくべきだろう。

### セキュリティルール

公式のドキュメントではさらっと書いてあるが、実はこれが非常に重要である。
https://firebase.google.com/docs/database/security/

他のグループの名前を他のグループの管理者が勝手に変えられてはならないし、メンバー全員のメールアドレスを引き出すなどもってのほかだ。

上の例についてルールを考えてみよう。
具体的な書き方についてはドキュメントに任せるとして、サービスレベルでは以下のような要件が考えられる。

- グループ情報を編集できるのは、そのグループの管理者だけである
- グループには管理者ではなくてもメンバーとして自由に参加できる
- グループ情報は管理者やメンバーでなくても自由に閲覧できる

このような要件を満たすセキュリティルールは以下のようになる。

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "group": {
      ".read": true,
      "$group": {
        ".write": "auth !== null && (!data.exists() || root.child('admin/' + auth.uid + '/' + $group).val() === true)",
        "memberIds": {
          ".write": "auth !== null"
        }
      }
    }
  }
}
```

わけがわからないと思うので順番に説明していこう。

#### 全体の read/write禁止

まずは全体に対して read/write を一括禁止にする。

```diff
{
  "rules": {
+   ".read": false,
+   ".write": false,
    "group": {
      ".read": true,
      "$group": {
        ".write": "auth !== null && (!data.exists() || root.child('admin/' + auth.uid + '/' + $group).val() === true)",
        "memberIds": {
          ".write": "auth !== null"
        }
      }
    }
  }
}
```

なぜこれをするかというと、firebase database のルールはネストの浅い方から順に評価されるためである。従って、最もネストの浅いところではデータアクセスを禁止しておき、個別のデータに関して少しずつ権限を与えていくという方法が安全である。
アプリケーションによっては、read は全体的に許可して良いということもあるかもしれないが、その場合は、 `".read": true` と書けば良い。
ちなみに、この ".read" や ".write" といった表記が読み書きの権限を表している。

#### グループ情報の読み取り許可

「グループ情報は管理者やメンバーでなくても自由に閲覧できる」という要件のため、特に認証がなくてもグループ情報にはアクセスできるようにする。

```diff
{
  "rules": {
    ".read": false,
    ".write": false,
+   "group": {
+     ".read": true,
      "$group": {
        ".write": "auth !== null && (!data.exists() || root.child('admin/' + auth.uid + '/' + $group).val() === true)",
        "memberIds": {
          ".write": "auth !== null"
        }
      }
    }
  }
}
```

グループ情報は、ルートから辿って "group" というキーに格納されているため、上記のように "group" というキーの下に権限を書く。これにより、グループの情報を呼び出そうとしたとき、ルートの `".read": false` で禁止、"group" の`".read": true` で許可となっているので、ネストの深い "gruop" の権限が優先され、情報を呼び出すことができる。

#### メンバーの追加

グループ情報の変更権限は複雑なので最後に回して、次はメンバーの追加権限について考える。「グループには管理者ではなくてもメンバーとして自由に参加できる」という要件であるが、実は暗黙の了解として、「ログイン済みのユーザーであれば」という条件が入っている。
これをルールに起こすと、以下の部分が該当する。

```diff
{
  "rules": {
    ".read": false,
    ".write": false,
    "group": {
      ".read": true,
      "$group": {
        ".write": "auth !== null && (!data.exists() || root.child('admin/' + auth.uid + '/' + $group).val() === true)",
+       "memberIds": {
+         ".write": "auth !== null"
+       }
      }
    }
  }
}
```

中腹辺りにある `$group` については後で触れるので、今のところは見なかったことにして欲しい。兎にも角にも、個別のグループの "memberIds" に書き込む権限は、`".write": "auth !== null"` で制限されるということである。
さて、突然でてきた `auth` とは何かというと、firebase の予約語の１つである。ログイン済みのユーザーに関しては、この `auth` に uid や name などの認証済みの値が代入される。従って、 `auth !== null` とは、ログイン済みのユーザーに限りという制約である。

#### グループ情報の更新

さてさて、ついにラスボスが登場してしまった。「グループ情報を編集できるのは、そのグループの管理者だけである」という要件である。さらに言うと、グループを新しく作成する場合には当然管理者などいないので、その場合には無条件に作れる必要があるということになる。
これをルール化したものが以下である。

```diff
{
  "rules": {
    ".read": false,
    ".write": false,
    "group": {
      ".read": true,
+     "$group": {
+       ".write": "auth !== null && (!data.exists() || root.child('admin/' + auth.uid + '/' + $group).val() === true)"
        }
      }
    }
  }
}
```

さきほど見て見ぬふりをした `$group` から先にいこう。これはこの URI にアクセスされたときにマッチした部分を表す変数である。
例えば、`/group/g12345678/memberIds` という URI にアクセスしたとすると、 `g12345678` が `$group` として参照できる。これにより、具体的にどのグループに対して書き込もうとしていて、ユーザーが権限を持っているのかどうかというのが規定できるのである。

さてそれでは、長大なルールについて読み解いていこう。

```
auth !== null && (!data.exists() || root.child('admin/' + auth.uid + '/' + $group).val() === true)
```

まず中腹あたりにある `&&` と `||` はお馴染みの AND演算子、OR演算子である。
これについての説明は不要だろう。

`auth !== null` については上述したので、次に、

```
!data.exists()
```

の部分について見ていこう。
`data` というのはユーザーがその操作を行う前のデータベースのスナップショットである。意味としては、ユーザーが書き込む前の段階で、その階層にデータが存在しなければ true とするという意味である。ここで `data` はルートから辿ったものではなく、該当する階層での値ということに注意して欲しい。

最後に

```
root.child('admin/' + auth.uid + '/' + $group).val() === true
```

の部分について説明しよう。
先程あげた `data` がその階層のデータを参照していたのに対して、`root` はその名の通りルートから辿っていく。従って `root.child('admin/' + auth.uid + '/' + $group)` は、例えば `/admin/u1234/g12345678` への "参照" を表している。参照というのがややこしいところである。firebase では、基本的に参照を取得してから、その参照に対して値を呼び出したりその子どもを調べたりする。ここでは `val()` によって値を呼び出している。その値が `true` であれば書き込んでも良いということだ。


# デプロイ

ここまで来たらあとはデプロイを残すのみである。
他のプロジェクトで firebase hosting を使ってその簡単さにすっかり虜になってしまった私は、firebase hosting でアプリケーションを提供することにした。
したのだが、実際にデプロイしてみると大変なことに気づいてしまった。firebase hosting ではルート以外のエンドポイントは 404 Not Found になってしまうのである。しかしここに来て nginx用のサーバーを建てることなどできない怠惰な感情が、angular の hash strategy についての調査を進めさせた。

結論から言えば、RouterModule をインポートする際に以下のように書けば良い。

```typescript
RouterModule.forRoot(ROUTES, {useHash: true})
```

これでこの Angularアプリは `/#/...` といったいわゆる Hash Strategy を用いることになり、フロントエンドルーティングを持つ SPA でも機能するようになるのである。これは github pages でも同じ問題があるので参考にしていただきたい。

**2017/02/27補足**
firebase側で rewrite の設定が行えるようである。これによって、リバースプロキシを噛ませたのと同じ状態にできるため、hash strategy をとる必要はなくなった。
https://firebase.google.com/docs/hosting/url-redirects-rewrites?hl=ja

具体的には、以下のように firebase.json に追記すれば良いだろう。

```diff
$ cat firebase.json
{
  "database": {
    "rules": "database.rules.json"
  },
  "hosting": {
    "public": "dist",
+   "rewrites": [
+     {
+       "source": "**",
+       "destination": "/index.html"
+     }
+   ]
  }
}
```

デプロイコマンドは以下の通りである。

```bash
# プロジェクトの初期化
# 色々聞かれるのでちゃんと読んで設定する
$ firebase init

# AoTコンパイル
$ ng build --aot --prod

# デプロイ
$ firebase deploy
```

本当にこれで良いのかというくらい簡単である。思わず他のアプリも移行してしまおうと思ったくらいだ。しかし現実にはその移行に多大な時間を費やすために現状維持という私の嫌いな逃げ口上で切り抜けることにした。

# おわりに

この時点ですでに長大な記事となってしまったために、具体的なソースコードや設計思考については大幅に割愛するが、およそ隠すところもそうそうないので詳しくは個別に聞いていただければと思う。

git のコミットログによれば、このアプリケーションは記事も含めて 20日程度で開発されたようだ。これでも日中は他の仕事をしていることが多いので、実際の開発期間は正味１週間ほどといったところか。これは私の開発速度の問題よりも Angular と firebase の開発性の高さを訴えるものである（が、もちろん日頃から Angularアプリの開発をしているという点を伝えないのはフェアではないと思うので、ここにひっそりと示しておこう）。