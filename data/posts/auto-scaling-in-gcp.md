Google Coloud Platform には、負荷に応じてインスタンス数を自動的に増やしてくれる機構（Autoscaling）があります。
Autoscaling（オートスケーリング）機能を使用するためには、以下の条件を満たす必要があります。

- Managed instance groups（管理されたインスタンスグループ）であること
- Autoscalingポリシーと target utilization（対象使用率）が定まっていること


Managed instance groups（管理されたインスタンスグループ）であること
-----------------------------------------------------------

Google Compute Engine（以下 GCE）では、インスタンスの集合を定義することができます。
これは、インスタンスグループと呼ばれ、例えばロードバランサに繋ぐときにこの単位で管理することができます。

インスタンスグループには 2種類あって、1つは Managed instance groups（管理されたインスタンスグループ）、もう 1つは Unmanaged instance groups（管理されていないインスタンスグループ）です。
Managed instance group を使うと以下の様な利点があります。

#### Managed instance group の利点

> - When your applications require additional compute resources, managed instance groups can automatically scale the number of instances in the group.

```markdown:拙訳
アプリケーションが追加リソースを必要とする時、managed instance group は自動的にグループ中のインスタンスの数をスケールできます。
```

> - Managed instance groups can work with load balancing services to distribute network traffic to all of the instances in the group.

```markdown:拙訳
Managed instance group はロードバランシングサービスと協働することができ、グループ中の全てのインスタンスにネットワークトラフィックを分散するのに役立ちます。
```

> - If an instance in the group stops, crashes, or is deleted by an action other than the instance groups commands, the managed instance group automatically recreates the instance so it can resume its processing tasks. The recreated instance uses the same name and the same instance template as the previous instance, even if the group references a different instance template.

```markdown:拙訳
もしグループ中のインスタンスがコマンド以外によって停止、クラッシュまたは削除されたら、managed instance group は自動的にそのインスタンスを再生成し、処理中のタスクを再開します。再生成されたインスタンスは、たとえグループが他のインスタンステンプレートを参照していたとしても、以前のものと同じ名前、同じテンプレートを使用します。
```

> - Managed instance groups use an instance template to define the properties for every instance in the group. You can easily update all of the instances in the group by specifying a new template in a rolling update.

```markdown:拙訳
Managed instance group はグループ中の全てのインスタンスについてプロパティを定義するために、インスタンステンプレートを使います。ローリングアップデート（無停止アップデート）で新しいテンプレートをグループ中の全てのインスタンスに簡単に適用できます。
```

---

まとめると、予めポリシー（例えば CPU使用率）を設定しておけば、それに応じて勝手にスケールしてくれて、ロードバランサの下に配置し、仮にインスタンスが死んだとしたら勝手に同じ状態で生き返らせてくれる、ということです。

逆に言えば、Unmanaged だとオートスケーリング機能は使用できないようなので注意してください。
以後、インスタンスグループは managed instance group のみを対象とします。

### Managed instance group の作り方

#### インスタンステンプレートの作成（新規作成）

まだ GCP上にインスタンスが構築されていない場合は、先にインスタンスグループを作成しておくことをオススメします。
コンソール（Web GUI）から作るとマウスでポチポチ選んでいくだけで作れます。
マシンタイプはある程度カスタマイズできますが、組み合わせによっては作成できないこともあるようです。

gcloud を使う場合は、例えば以下のコマンドで作成できます。
カスタムのパラメータは適宜設定してください。

```bash:console
# テンプレートの作成（デフォルト値を使う）
$ gcloud compute instance-templates create テンプレート名

# テンプレートの作成（カスタムする）
$ gcloud compute instance-templates create テンプレート名 \
  --machine-type n1-standard-4 \
  --image centos-6 \
  --boot-disk-size 20GB
```

確認は以下のようにします。

```bash:console
$ gcloud compute instance-template describe テンプレート名
```

#### インスタンステンプレートの作成（既存のインスタンスから作成）

既にアプリケーションを運用している場合、インスタンスからイメージを作成したいということがあると思うので、その方法について説明します。

1. まず、対象のインスタンスが起動状態だと作成できないため、インスタンスのスナップショットを作成します。
2. その後、スナップショットからインスタンスを作成します。
3. 次に、インスタンスの編集画面で、「ブートディスクとローカルディスク」のところにある「インスタンスを削除する際にブートディスクを削除する」のチェックを外します（文言は変わるかもしれないので、適宜読み替えてください）
4. その後、クローンしたインスタンスを削除します。このとき、ブートディスクが削除されないことを確認してください
5. メニューの「ディスク」タブをクリックし、「新しいイメージ」を選択して、先ほどのディスクを選び、イメージを作成します
6. 作成したイメージを使って前節の手順でインスタンステンプレートを作成します

このテンプレートを使うことで毎回環境構築スクリプトを実行しないで済みます。

その他の注意点や運用については <a href='#instance-templates'>リファレンス</a>の Instance Templates に情報があります。

ちなみにイメージから gcloud でインスタンステンプレートを作成する場合、例えば以下のようなコマンドでできます。

```bash:console
gcloud compute instance-templates create instance-template-prd-crp-web-sm \
--image image-prd-crp-web \
--machine-type n1-highcpu-2 \
--metadata startup-script='#! /bin/bash
sudo service unicorn start'
```

### Managed instance group の作成

これ以降は gcloudコマンドによる方法しか示しませんが、コンソール（Web GUI）からでも同様に実行できます。

前節の手順で作成したインスタンステンプレートの名前を以下のコマンドで取得します。

```bash:console
$ gcloud compute instance-templates list
NAME        MACHINE_TYPE PREEMPTIBLE CREATION_TIMESTAMP
tmp-example n1-highcpu-8             2015-12-24T22:00:00.000-08:00
```

その後、インスタンステンプレートを用いて managed instance group を作成します。

```bash:console
$ gcloud compute instance-groups managed create グループ名 \
  --base インスタンスのprefix \
  --template 使用するインスタンステンプレート \
  --size 2
```

base は自動的に作成されるインスタンスの prefix、template は使用するテンプレートの名前、size は初期状態で構築するインスタンスの数です。
上記のコマンドを打つと、managed group が作成され、インスタンスが自動生成されます。

この手順で作成されたインスタンスは、アプリケーションレベルでの自動起動の設定がされている必要があります。
例えば Rails のアプリケーションであれば、nginx、unicorn などが自動的に起動する設定になっていないといけません。

Autoscalingポリシーの設定
-----------------------

最後に、スケールポリシーを設定します。
スケールポリシーは個別の項目があるわけではなく、managed instance group の設定項目の 1つとして提供されます。

例えば、CPU の負荷を基準としてスケールさせる場合、以下のように書きます。

```bash:console
$ gcloud compute instance-groups managed set-autoscaling example-group \
  --max-num-replicas 10 \
  --target-cpu-utilization 0.75 \
  --cool-down-period 60
```

`cool-down-period` はオプションで、公式には以下のように説明されています。

> Optionally, you can use the --cool-down-period flag, which tells the autoscaler how many seconds to wait after a new instance has started before it starts to collect usage. After the cool-down period passes, the autoscaler begins to collect usage information from the new instance and determines if the group requires additional instances. This accounts for the amount of time it might take for the instance to initialize, during which the collected usage is not reliable for autoscaling. The default cool-down period is 60 seconds.

つまり、`cool-down-period` で指定された秒数はスケーリングの対象にしないということです。デフォルトでは 60秒に設定されています。
ここからわかることは、これを短くし過ぎるとインスタンス起動時の CPU負荷で上限まで一気にインスタンスが起動してしまいます。逆に長くし過ぎると、テレビ放送のような急激なスパイクに対応できなくなります。

ここまで終わったら、ロードバランサに作成した managed instance group を指定して完了です。


Enjoy scaling!

## 続報

[GCP で Autoscaling Groups を使う（docker対応版）](http://qiita.com/chase0213/items/7c8fbee2814fa51f7296) を書きました。

Referrenses
------------

<ol>
<li id="autoscaling-groups-of-instances"><a href='https://cloud.google.com/compute/docs/autoscaler/'>Autoscaling Groups of Instances（Google公式）<a/></li>
<li id="creating-groups-of-instanses"><a href="https://cloud.google.com/compute/docs/instance-groups/">Creating Groups of Instances</a></li>
<li id='machine-types'><a href="https://cloud.google.com/compute/docs/machine-types?hl=ja&_ga=1.86435800.1148060235.1450440566">Machine Types</a></li>
<li id="instance-templates"><a href='https://cloud.google.com/compute/docs/instance-templates'>Instance Templates</a></li>
<li id='scaling-based-on-cpu-or-load-balancing-serving'><a href='https://cloud.google.com/compute/docs/autoscaler/scaling-cpu-load-balancing'>Scaling Based on CPU or Load Balancing Serving Capacity</a></li>
<li id='scaling-based-on-cloud-monitoring-metrics'><a href='https://cloud.google.com/compute/docs/autoscaler/scaling-cloud-monitoring-metrics'>Scaling Based on Cloud Monitoring Metrics</a></li>
</ol>