## はじめに

弊社では GCP（Google Cloud Platform）上の GKE（Google Container Engine）を使用して幾つかのサービスを提供しています。docker を使う理由というのは以前にも何度か（Appendix参照）書いたので、そちらを参照していただければと思います。
付け加えるとすれば、環境の差異を吸収してくれるし、pod が落ちたら勝手に生き返らせてくれるし、デプロイするのにダウンタイムとかエラーとか気にしなくて良いし（これは後述します）、控えめに言って後戻りはしたくないです。

とは言うものの、まだ日の浅い技術なので運用していくと色々と問題が出てきます。
そこで、わりとクリティカルな表題の問題に当たったので、自身への備忘の意味も込めて書いておきます。

## 想定読者

* docker に関する基礎的な知識を有している人
* kubernetes を触り始めた人
* GCP（GKE）を使用している人

## rolling-update とは

Kubernetes を用いると、コンテナをアップデートする際にダウンタイムを無くすことができます。
内部的には、既存のコンテナが稼働しているのを検知すると、新しいコンテナを稼働状態（ただしサービスインはしない）にし、新しいコンテナでエラーがないかどうか確認します。

もしエラーが発生していた場合、新しいコンテナと入れ替える作業を停止します。これにより、エラーが発生しているコンテナをサービス前面に出してしまうのを防ぐことができます。

もしエラーが無ければ、新しいコンテナと古いコンテナとを並行稼動状態にし、その後古いコンテナを削除して通常状態に戻ります。

以上の流れによって、Kubernetes はコンテナのアップデートによってサービスにダウンタイムが生じるのを防いでいます。

※ [この issue](https://github.com/kubernetes/kubernetes/issues/16737) のコメントを読むと勉強になります

## rolling-update の失敗例 on GKE

ここから GKE に特化した話になります。
GKE で docker を使用して rollling-update する場合、イメージをプッシュして

```
$ kubectl rolling-update ${SERVICE_NAME} --image=asia.gcr.io/${PROJECT_ID}/${CONTAINER_TAG_NAME}:${CONTAINER_TAG_VERSION}
```

とすればアップデートできます（v1.2.3現在）。
ここで、幾つかのエラーによって、アップデート自体が失敗することがあります。
今まで私が観測した中で、最も多かったのは次のエラーです。

```
error: timed out waiting for any update progress to be made
```

求めているのはこの情報ではないと言いたくなるメッセージです。
そこで、ここから調査をするために、以下のコマンドを使用します。

```
$ kubectl get pods
# => 現在 GKE で稼働している pods を一覧する

$ kubectl describe pod ${POD_NAME}
# => pod の状態を詳細に見る
```

2つ目のコマンドでアップデートしようとしている pod を見ると、Events という項目がありエラーの詳細が書いてあります。
私が直近ハマったエラーは、以下のようになっていました。

```
Events:
  FirstSeen     LastSeen        Count   From                    SubobjectPath   Type            Reason                  Message
  ---------     --------        -----   ----                    -------------   --------        ------                  -------
  6m            4s              27      {default-scheduler }                    Warning         FailedScheduling        pod (ポッド名) failed to fit in any node
fit failure on node (ノード名): Node didn't have enough resource: CPU, requested: 100, used: 970, capacity: 1000
```

つまり、リソース（CPU）足りないからアップデートできないよ！と裏で訴えられていたのですが、気づかずに timeout のエラーをググッていました。

実は、このノードは幾つかのサービスを相乗りさせており、リソースもそれほど確保していなかったために、このようなエラーが発生していました。普段は 20% くらいしか CPU を使っていなかったので、気づくのが遅れました。

そこで、ノードの数を増やし、再度 rolling-update を行うことで、無事にダウンタイム無しでアップデートを行うことができました。

### 余談

これは余談ですが、ノード台数の上げ下げは、

```
gcloud compute instance-groups managed set-autoscaling ${INSTANCE_GROUP_NAME} --max-num-replicas=2
```

とかすると変更できます。詳しくは、 [set-autoscaling](https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-autoscaling) 参照。

## まとめ

GKE上で docker + kubernetes運用をする際に現れるエラーの１つとその解決策、それから調査方法を書きました。


## Appendix

<aside id="internal-links">
<ol>
<li><a href="http://qiita.com/chase0213/items/6f08d5177e74f30b30f9">なぜベンチャーで docker を使うのか</a></li>
<li><a href="http://qiita.com/chase0213/items/f9019f745381c0cf1ff5">（続）なぜベンチャーで docker を使うのか</a></li>
</ol>
</aside>