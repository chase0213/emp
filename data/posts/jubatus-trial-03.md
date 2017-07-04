前回、 [あまりにも有益でない classifier](http://chase0213.hatenablog.com/entry/2014/07/12/135747) を作ったので、もう少し使えるものを作ります。

facebook のデータダウンロード
--------------------------

[facebook](https://www.facebook.com) で、右上（2014年7月現在）にある「▼」マークをクリックして、
「設定」の項目を表示すると、「一般アカウント設定」の下の方に「Facebookデータをダウンロード」というリンクがあります。
これをクリックして認証とかを色々すると、自分の今まで facebook にあげたデータが htm形式でダウンロードできます。
軽い気持ちでこれをダウンロードしてみたんですが、正直クリティカルな情報が多すぎて若干引きました。
こんなデータを使ってレコメンダーとか作ったら、さぞかし精度の高いものができるのだろうなというのを感じています。

security
-------

それで、今回の話は、上でダウンロードしたデータの中に、「セキュリティ」という項目があり、
facebook上で誰がどこからこのアカウントにログインしたか、などがわかるので、
これを使って不正アクセスを見抜こうというものです。

使用するのは相変わらず [Jubatus](http://jubat.us/ja/index.html) です。
異常値検知のための、 [jubaanomaly](http://jubat.us/ja/api_anomaly.html) という API が用意されているので、これを使います。

configration
-----------

Jubatus server の設定ファイルはこちらです。
https://github.com/chase0213/anomal_facebook_activity/blob/master/lof.json

基本的にサンプルそのままなので、特に説明することはないです。
サンプルをそのまま流用しても、ある程度使えるものが作れるのも Jubatus の良いところです。

今回は「Jubatus で〜 (1)」 なので、(2) を公開するときにはこの辺りのチューニングをちゃんとやっていると思います。

pre-processing
-------------

facebook からダウンロードしてきたデータは、htm形式でマークアップされているので、適宜変形します。
今回は、適当に pythonスクリプトを作成して変形しました（python 2.6）。
https://github.com/chase0213/anomal_facebook_activity/blob/master/data/trim.py

（string_rules とかに書いても良いのですが、もう少しちゃんと整形する必要があったので）

anomaly detection
----------------

データの準備ができたら、それを Jubatusサーバに渡して、異常度を計算してもらいます。

```
client = jubatus.Anomaly(HOST,PORT,NAME)
```

として Jubatusサーバを起動しておいて、

```
ret = client.add(datum)
```

としてデータを追加します。
datum は、jubatus.common.Datum形式のデータです。
そうすると、ret にはそのデータの id と異常度が返ってきます。
最初はこの client.add(Datum) の返り値を見て、ちゃんと 1.0 付近にデータが分布していることを見たほうが良いです。
その中で、1.0 から明らかに離れているものがあったら、そのデータを注視してみてください。
不正アクセスの可能性があります。

それで、ある程度データを Jubatusサーバに蓄積したら、
試しに普段と全然違うデータを与えてみます。

```
anomal_datum = Datum({
    "activity": "DELETE",
    "time":     "2014年7月15日 17:59 UTC+12",
    "ip_address": "127.0.0.1",
    "brawser": "IE6",
    "cookie": "???"
})
```

データを定義したら、Jubatusサーバに異常度を計算させます。
ここでは、データを登録せずに異常かどうかだけ見て欲しいので、client.add の代わりに client.calc_score を使います。

```
anomality = client.calc_score(anomal_datum)
```

calc_score は float値を返り値として持っているので、煮るなり焼くなり好きにしてください。

「普段のデータ」も見せられたら良かったのですが、自ら anomaly access を増やすことになるので割愛します。

まとめるとこんな感じになります。
https://github.com/chase0213/anomal_facebook_activity/blob/master/anomaly.py

それで、試しに実行してみた結果がこちらです。

```
$ python anomaly.py
anomality(anomal datum): 2.33819794655
anomality(nomal datum): 0.999999880791
```

2行目が上で定義した異常なデータを与えたもの、3行目が「普段のデータ」を与えたものです。
異常なデータに関して、異常度が明らかに大きくなっています。
たぶん、統計的な検定とか閾値とか設定してアラートをあげるようにしたら良いのだと思います。

以上、前回よりも少しだけ有益な Jubatus を使ってみる話でした。
次回はこれをもう少し真面目にチューニングしたいと思います。

余談ですが、「Jubatus Anomaly」で Google検索したときに、古い API用のページがヒットしている気がします。
バージョンによって API が上手く動かなかったりする（今回しました）ので、気をつけてください。