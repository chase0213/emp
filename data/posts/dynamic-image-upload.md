やりたいこと
----------

画像の横のあるファイル選択ダイアログからファイルを選んだら、すぐにファイルをサーバーにアップロードして、アップロードに成功したら現在の画像をすり替える、ということをやりたいです。

環境
----

- Rails4 をベースにしたアプリケーション
- AngularJS 1系を JSフレームワークとして使用
- [paperclip](https://github.com/thoughtbot/paperclip) を使用して、画像格納用のモデルを作成
- [angular-file-upload](https://github.com/nervgh/angular-file-upload) を使用して、クライアント <=> サーバー間通信を行う

概要
----

ざっくり言うと、上であげた「やりたいこと」は以下の 2つの要素に分解できます。

- 画像を格納するモデルを作成する
- 画像をアップロードする機能を追加する

混ぜて書くとわかりにくくなるので、それぞれ説明します。

画像を格納するモデルを作成する
--------------------------

まず、アップロードされた画像をサーバーに格納するためのモデルを作成します。
一から作るのは面倒なので、[paperclip](https://github.com/thoughtbot/paperclip) という gem を使用します。

### インストール

- Gemfile に以下の 1行を追加します。

```
gem 'paperclip'
```

- bundle install します。

```
$ bundle install
```

### モデル作成

- 画像を格納するためのモデルとして、Pictureモデルを作成します。

```
$ rails g model Picture name:string
```

- Pictureモデルに avater という名前で ファイル名やパスを格納するためのアタッチメントを追加します。

```
$ rails g paperclip picture avater

# 作成された migrationファイルを表示
$ cat db/migrate/yyyymmddHHMMSS_add_attachment_avater_to_pictures.rb
class AddAttachmentPhotoToPictures < ActiveRecord::Migration
  def self.up
    change_table :pictures do |t|
      t.attachment :avater
    end
  end

  def self.down
    remove_attachment :pictures, :avater
  end
end
```

- db:migrate します。

```
$ bundle exec rake db:migrate
```

これで、Pictureモデルに avater が追加されました。
例えば、

```
picture = Picture.take
picture.avater.url
```

などとすると、画像の url を取得することができます。

画像をアップロードする機能を追加する
-------------------------------

これで画像を格納するためのモデルが構築できたので、次は実際に View から angular 経由でサーバーにファイルをアップロードするところを実装します。

### インストール

- Gemfile に以下の行を追加します。

```
gem 'angularjs-file-upload-rails'
```

- bundle install します。

```
$ bundle install
```

- application.js に以下の行を追加します。ただし、 **angularjs よりも後に** ロードされなければなりません。

```js:application.js
//= require angularjs-file-upload
```

### 実装

とりあえずコードを列挙した上で説明します。
ただし、コードは分かりやすさを重視しており、そのまま本番に埋め込むのは適切ではありません。

avater.html.erb

```erb:avater.html.erb
<div ng-contoller="avaterCtrl" ng-init="setAvater(#{@picture.id})">
  <img alt="avater" src="{{avater_url}}" />
  <input type="file" nv-file-select uploader="uploader"/>
</div>
```

avaterCtrl.js

```javascript:avaterCtrl.js
var myApp = angular.module('avaterApp', []);

myApp.controller('avaterCtrl', ['$scope', function($scope) {
  // uploaderインスタンスを作成
  $scope.uploader = new FileUploader({
    // /foo/bar のところには ajax_api_controller.rb で後述する post_new_avaterメソッドへのパスを入れてください
    url: '/foo/bar',
    headers : {
      // Rails用
      'X-CSRF-TOKEN': $('meta[name=csrf-token]').attr('content')
    }
  });

  // uploader にファイルが追加された際に呼び出されるコールバック関数
  $scope.uploader.onAfterAddingFile = function(item) {
    item.upload();
  };

  // upload が成功したときに呼び出されるコールバック関数
  $scope.uploader.onSuccessItem = function(item, response, status, headers) {
    // Queue を空にする
    $scope.uploader.clearQueue();
    // アバターの url を更新
    $scope.avater_url = response.avater_url;
  };

  $scope.setAvater = function(picture_id) {
    // /hoge/fuga のところには get_avaterメソッドへのパスを入れてください
    $http.get('/hoge/fuga', {
      picture_id: picture_id
    }).success( (data) ->
      $scope.avater_url = data.avater_url;
    )
  };
}]);
```

ajax_api_controller.rb

```ruby:ajax_api_controller.rb
  def get_avater
    picture = Picture.find(params[:picture_id])
    render json: { avater_url: picture.avater.url }
  end

  def post_new_avater
    picture = Picture.new()
    picture.avater = params[:file]
    if picture.save
      render json: { avater_url: picture.avater.url }
    else
      render text: 'failed to upload new avater'
    end
  end
```

### 解説

いくつか重要な点を説明します。

#### クライアント側の処理

まずは、uploaderインスタンスを宣言します。

avaterCtrl.js

```js:avaterCtrl.js
// uploaderインスタンスを作成
$scope.uploader = new FileUploader({
  // /foo/bar にはアップロード処理に関するコントローラーのパスを指定します
  url: '/foo/bar',
});
```

uploader にはいくつかの [コールバック関数](https://github.com/nervgh/angular-file-upload/wiki/Module-API#callbacks) が定義されており、それらをオーバーライドすることでイベントに応じた処理を行います。

まず、ファイル選択ダイアログにて画像が選択されると、その画像は Queue（キュー）に追加されます。
そのタイミングで、自動的に画像のアップロードを行いたいので、onAfterAddingFile関数をオーバーライドしています。

avaterCtrl.js

```js:avaterCtrl.js
// uploader にファイルが追加された際に呼び出されるコールバック関数
$scope.uploader.onAfterAddingFile = function(item) {
  item.upload();
};
```

次に、アップロードが成功したら既存の画像を差し替えます。

avaterCtrl.js

```js:avaterCtrl.js
// upload が成功したときに呼び出されるコールバック関数
$scope.uploader.onSuccessItem = function(item, response, status, headers) {
  // Queue を空にする
  $scope.uploader.clearQueue();
  // アバターの url を更新
  $scope.avater_url = response.avater_url;
};
```

この際、Queue をクリアしないと一度アップロードしたファイルがずっと Queue に残り続け、ファイルを選択する度に複数ファイルをアップロードしてしまいます。
removeAfterUpload というプロパティが定義されているため、それを true にしても同じ効果が得られるはずです（未検証）。
今回は 1画像しか保持しない構成なので clearQueue しても問題ないですが、複数ファイルをアップロードする際などにはタイミング等々もう少し考える必要があります。

基本的にクライアント側の処理はこれだけなのですが、Railsアプリケーションの場合には X-CSRF-TOKEN をサーバーに送信する必要があります。
関連issue: https://github.com/nervgh/angular-file-upload/issues/40

なので、実際には uploaderインスタンスの宣言は以下のようになります。

avaterCtrl.js

```js:avaterCtrl.js
// uploaderインスタンスを作成
$scope.uploader = new FileUploader({
  url: '/foo/bar',
  headers : {
    // Rails用
    'X-CSRF-TOKEN': $('meta[name=csrf-token]').attr('content')
  }
});
```

#### サーバー側の処理

まず、クライアント側ではページを読み込んだ際に avater への url を取得する必要があるため、その url を返却する api を定義します。

ajax_api_controller.rb

```ruby:ajax_api_controller.rb
def get_avater
  picture = Picture.find(params[:picture_id])
  render json: { avater_url: picture.avater.url }
end
```

angular-file-upload を使用してファイルをアップロードした場合、params[:file] にそのファイルに関するパラメータが代入されて渡されます。
なので、サーバー側ではそれを使用して新規に Pictureインスタンスを作成します。

ajax_api_controller.rb

```ruby:ajax_api_controller.rb
def post_new_avater
  picture = Picture.new()
  picture.avater = params[:file]
  if picture.save
    render json: { avater_url: picture.avater.url }
  else
    render text: 'failed to upload new avater'
  end
end
```

最後に、これらの apiメソッドに対して適宜 routing を行えば完了です。
routing に関しては他に素晴らしいドキュメントがいくつもあるので、ここでは割愛します。

まとめ
-----

これで動的にアバター画像を変更することができるはずです。
普段は個人的な趣味嗜好で、Rails のテンプレートエンジンには slimテンプレートを使っており、
また、js は coffeescript で書いているので、本記事のコードには文法エラーがたぶんに組み込まれている可能性があります。
何か気になる点等あればご連絡いただけると幸いです。