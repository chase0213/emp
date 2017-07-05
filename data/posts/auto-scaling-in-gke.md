## はじめに

以前、「[GCP で Autoscaling Groups を使う](http://qiita.com/chase0213/items/6cad4475a5b57895aca1)」という記事で、インスタンスグループからオートスケーリングを設定する方法をご紹介しました。
あれからおよそ 10ヶ月が経ち、docker を始めとするコンテナ化が主流となりつつありますので、docker に対応したオートスケーリングの方法を書きます。

## 対象読者

- GCP をコマンドラインツールから操作したことがある人
- GCP上でシステム（またはアプリケーション）を完結させたい人
- docker を用いた開発・運用経験のある人
- kubenetes を触ったことがあるか、英語のドキュメントに抵抗がない人


## おさらいと課題

前回の手順を確認すると、おおむね次のような手順をたどるとオートスケーリングが設定できていました。

1. インスタンステンプレートを作成
2. マネージドインスタンスグループの作成
3. オートスケーリングポリシーの設定

言葉にすると簡単なんですが、おそらく詰まりやすいのは以下の点だと思います。

> 作成されたインスタンスは、アプリケーションレベルでの自動起動の設定がされている必要があります。
> 例えば Rails のアプリケーションであれば、nginx、unicorn などが自動的に起動する設定になっていないといけません。

実際にデプロイする場面を想像していただきたいのですが、インスタンスがアプリケーションレベルで正しく動作しているかどうかは、デプロイ先の環境が異なる場合、考慮しなければならない点が多いです。例えば IAM の設定だったり、サーバー側の /etc/なんとか の設定だったり、環境変数の設定だったりです。
よくやるのは、本番環境相当のステージングを用意して、serverspec とかでテストしてみるという運用だと思いますが、たとえ chef や ansible で環境構築していたとしても、ステージングと本番を等価に保つことは非常に難しいです。

そこで、docker のようなコンテナ技術を用いることで、どんな環境（厳密には吸収しきれていない部分もあるそうですが）でも同一条件でアプリケーションを稼働することができるようになります。

## 本題（オートスケーリングを設定するまで）

GCP で dockerコンテナを使用したい場合、GKE（Google Container Engine）と一緒に用いると運用が非常に楽です。
なので本記事では、GKE に dockerコンテナを載せる前提で話を進めます。


### 全体の流れ

全体の流れは以下の通りです。

1. dockerイメージを作成し、ビルドする
2. dockerイメージを GKE にアップロードする
3. kubectlコマンドを用いて service、replication controller を作成する
4. オートスケーリングを設定する

ステップにすると前回より多くなってしまっていますが、2〜4 はほとんど 1コマンドで実行できます（設定ファイルを書くのは別として）。

### Step 0. gcloudコマンドで認証する

本記事では基本的に gcloudコマンドを用いて GCP上のリソースを操作するため、認証を行う必要があります。
以下のコマンドを打つと、GCP に対してアクセスできる状態になります。

```
$ gcloud auth login
```

gcloud auth login
https://cloud.google.com/sdk/gcloud/reference/auth/login


### Step 1. dockerイメージを作成し、ビルドする

この部分は本題とそれるので割愛します。

```
$ docker build ...
```

というやつです。
ただし、GKE にアップロードする都合上、タグを付けておく必要があります。

```bash
# 日本の場合は ${リージョン毎の GCP のドメイン} は asia.gcr.io が多いかと思います（2016.10.31現在）
$ docker tag ${ビルド時のイメージのタグ} ${リージョン毎の GCP のドメイン}/${プロジェクト名}/${イメージのタグ}:${イメージのバージョン}
```

### Step 2. dockerイメージを GKE にアップロードする

Step 1 で適切にタグが付けられていると、以下のコマンドで自動的にイメージの格納場所を判別して、適切な場所にアップロードしてくれます。

```bash
$ gcloud docker push ${リージョン毎の GCP のドメイン}/${プロジェクト名}/${イメージのタグ}:${イメージのバージョン}
```

### Step 3. kubectlコマンドを用いて service、replication controller を作成する

GKE の実体は Kubernetes のため、kubernetes を操作するために kubectlコマンドを多用します。
https://cloud.google.com/container-engine/

Kubernetes に関しては、この記事内で書くには内容が多すぎるため、リファレンスを貼ります。
具体的なコマンドとしては、以下のコマンドを打てば良いはずです。

```bash
# service の作成
$ kubectl create -f service.yml

# replication controller の作成
$ kubectl create -f rc.yml
```

これらのコマンドを実行すると、service と replication controller が作成され、GCP上でサービスが稼働した状態になります。

Service Operations
http://kubernetes.io/docs/user-guide/services/operations/

Replication Controller Operations
http://kubernetes.io/docs/user-guide/replication-controller/operations/


---

Kubernetes を使用したことのない方は、上記のドキュメントを読んでから作業することをおすすめしますが、設定ファイルは例えば以下のようになります（だいたいこんな感じというイメージなので間違えていたらすみません）。

```yaml:service.yml
apiVersion: v1,
kind: Service,
metadata:
  name: sample-on-qiita
spec:
  ports:
    - port: 443
      targetPort: 443
  selector:
      app: sample
  type: LoadBalancer
```

```yaml:rc.yml
apiVersion: v1,
kind: ReplicationController
metadata:
  name: sample-on-qiita
spec:
  replicas: 2
  selector:
    app: sample
  template:
    spec:
      containers:
        - name: sample
          image: asia.gcr.io/sampleapp/sample:v1.0.0
          ports:
            - containerPort: 443
              protocol: TCP
```



### Step 4. オートスケーリングを設定する

実は上記の Step によって作成されたサービスは、managed instance groups が使用されています。
それの何が嬉しいかというと、以前書いた記事が再利用できます（エンジニア冥利に尽きます）。

[GCP で Autoscaling Groups を使う # Autoscalingポリシーの設定](http://qiita.com/chase0213/items/6cad4475a5b57895aca1#autoscaling%E3%83%9D%E3%83%AA%E3%82%B7%E3%83%BC%E3%81%AE%E8%A8%AD%E5%AE%9A)

もう少し説明すると、以下のコマンドでインスタンスグループ名を取得して、

```bash
$ gcloud compute instance-groups managed list
```

得られたグループ名に対して

```bash
$ gcloud compute instance-groups managed set-autoscaling ${得られたグループ名} \
  --max-num-replicas 10 \
  --target-cpu-utilization 0.75 \
  --cool-down-period 60
```

などとするだけです。

## まとめ

dockerイメージを GCP（GKE）上にデプロイし、オートスケーリングさせる方法について書きました。
（前回書いた）テンプレートを手動で作成する方法は、書かれていない大変さが多く詰まっているので、こちらの手順の方がオススメです。