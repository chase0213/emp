## この記事の目的

pandas を使って何かする系の記事は散見されるものの、pandas で扱うデータ構造とかの説明が日本語で見当たらなかったので、学習中のノートとして。

## 対象読者

- pandas を使ったことがない
- pandas を使おうとしたら、データ構造がよく分からず挫折した
- python はなんとなく書ける
- データ解析（特に Visualization）をしたい

## 前提

本文書では、python処理系において、以下の処理を共通して行っているものとします：

```python
import pandas as pd
import numpy as np
```

なお、python のバージョンは 3.4.3 を使用しています。
もし pandas や numpy が入っていない場合は、pip などでインストールしてください（特につまらなかったので省略します）。

## Pandasってなに？

> pandas is a Python package providing fast, flexible, and expressive data structures designed to make working with “relational” or “labeled” data both easy and intuitive. It aims to be the fundamental high-level building block for doing practical, real world data analysis in Python. Additionally, it has the broader goal of becoming the most powerful and flexible open source data analysis / manipulation tool available in any language. It is already well on its way toward this goal.

【原文】
http://pandas.pydata.org/pandas-docs/stable/index.html


【拙訳】pandas は、「リレーショナル」または「ラベル付き」なデータと上手くやっていくのを簡単で直感的に行えるようにデザインされた、高速で柔軟で表現性に富んだデータ構造を提供する pythonパッケージです。...（後略）

というわけで、データ周りの操作とか視覚化を簡単かつ直感的に行なうためのものです。

（心の声｛この序文を書いている時点では、numpy とかを駆使したら必要ないんじゃないの？って思っています。どこまで簡単で直感的に扱えるのか期待です。}）

## データ構造

【原文】
http://pandas.pydata.org/pandas-docs/stable/dsintro.html#dsintro

pandas のデータ構造には、主として Series と DataFrame とがあります。

### Series

Series は 1次元のラベル付き配列を扱うためのものです。
軸（axis）のラベルは index として参照されます。
この index に軸のラベルのリストを渡すと、データをラベル毎に分類してくれます。

#### Series作成の基本形

Series は基本的に以下の形で作成します：

```python
s = pd.Series(data, index = index)
```

#### Series の生成例とか

例えば、numpy の ndarray から作成する場合には、以下のようにします：

```python
>>> raw_array = [1, 2, 3]
>>> np_array = np.array(raw_array)
>>> np_array
array([1, 2, 3])

>>> s = pd.Series(np_array, index=['first', 'second', 'third'])
>>> s
first     1
second    2
third     3
dtype: int64
```

dictオブジェクトから生成することもできます（この場合、index は dict の key がそのまま使われます）。

```python
>>> d = {'fl': 4, 'sl': 5, 'tl': 6}
>>> s = pd.Series(d)
>>> s
fl    4
sl    5
tl    6
dtype: int64
```

ちなみに Seriesオブジェクトは numpy の ndarray のようにベクトル演算ができます：

```python
>>> s
first     1
second    2
third     3

>>> s + s
first     2
second    4
third     6
dtype: int64

>>> s * 3
first     3
second    6
third     9
dtype: int64
```

（心の声｛なるほど、numpy の ndarray をラベルを付けて扱いやすくなっているのかな。データ表示まで考えると、この拡張は確かに便利かもしれない}）

### DataFrame

DataFrame は、2次元のラベル付きデータ構造です。カラムは異なる型を指定できます。スプレッドシートや SQLテーブル、Seriesオブジェクトの辞書（dict）のようなものと考えることができます。
pandasオブジェクトの中で、最も良く使われるものです。

#### DataFrame作成の基本形

DataFrame は基本的に以下の形で作成します：

```python
df = pd.DataFrame(data, index=index, columns=columns)
```

index と columns にはラベルのリストと使用するデータのカラム名が入ります。

#### DataFrame の生成例とか

例えば Seriesオブジェクトの dict から生成する場合、以下のように書きます：

```python
>>> s
first     1
second    2
third     3
dtype: int64

>>> t
fl    4
sl    5
tl    6
dtype: int64

>>> d = {'d-1': s, 'd-2': t}
>>> df = pd.DataFrame(d)
>>> df
        d-1  d-2
first   1.0  NaN
fl      NaN  4.0
second  2.0  NaN
sl      NaN  5.0
third   3.0  NaN
tl      NaN  6.0
```

index と columns を省略した場合、dict の key や Seriesオブジェクトから自動的に作られます。
ここで、`d-1` のデータのみに注目したくなったとします。
このとき、DataFrame の生成を以下のように書くと、`d-1` に関してのみからデータ生成ができます：

```python
>>> df = pd.DataFrame(d, index=['first', 'third', 'fl'], columns=['d-1'])
>>> df
       d-1
first  1.0
third  3.0
fl     NaN
```

`fl` というラベルは `d-1` には存在しないので、`NaN` となっています。pandas には、このような欠損値を上手く扱うための機能がありますが、本題からそれるので割愛します。

詳しくは以下のリンクをご覧ください：
http://pandas.pydata.org/pandas-docs/stable/missing_data.html


## まとめ

pandas の Seriesオブジェクトと DataFrameオブジェクトについての概説を日本語にしました。
印象として、ラベルとデータ構造とを上手く扱って、視覚化（Visualization）などをより簡単に、また統一的に扱えるようにするという点で貢献しているプロダクトかなと思います。
なので、matplotlib / seaborn や tensorflow / chainer などとの連携記事が多いようです。