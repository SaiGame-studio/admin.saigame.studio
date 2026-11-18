敵と戦うには、まずプレイ可能なキャラクターのグループを作成します。

## 1. Item Definitions によるキャラクター作成
- このガイドでは、Item Definitions でキャラクターを定義し、Game Presets でパーティーを構成する手順を説明します。
- このシステムでは、**Item Definition** モジュールを使ってキャラクターを作成します。

### 設定手順:
* **Name:** 一意の識別子を設定します。JRPG では個別のキャラクター名、従来の RPG では職業クラス（Warrior、Mage など）を推奨します。
* **Category:** 必ず **Character** に設定します。
* **基本ステータス:** Battle Script に必要な次の 3 つの属性を最低限定義します。
    * `attack`
    * `defense`
    * `hp`

![alt](/tutorial-lua/3a-characters-preset/step-01.png)

> **注意**
> 独自のゲーム要素に対応するカスタム属性は後で追加できますが、上記の 3 属性はスクリプトの基本処理に必須です。

### 確認:
スクリプトをテストする前に、**Test Player** アカウントが作成したキャラクターアイテムを所有していることを確認します。
![alt](/tutorial-lua/3a-characters-preset/step-02.png)

---

## 2. Game Presets の設定

**Game Presets** は、Battle Scripts 用のパーティーにキャラクターを編成するための枠組みです。
![alt](/tutorial-lua/3a-characters-preset/step-03.png)
* **ロジックの注意点:** 標準の Battle Script には Preset からキャラクターをランダム選択する仕組みがありません。参加者をランダムに決める場合は、Lua スクリプト内でその処理を実装してください。

---

## 3. Game Client でパーティーを完成させる

設定を完了するには、**Game Client** で次の操作を行います。

1.  設定済みの Game Preset に基づいて **パーティーを作成** します。
2.  Item Definitions の **キャラクターを追加** して、Preset のスロットに配置します。

| ![alt](/tutorial-lua/3a-characters-preset/step-04.png) | ![alt](/tutorial-lua/3a-characters-preset/step-05.png) |
| :---: | :---: |

これらの手順が完了すると、**Battle Script** を実装する準備が整います。
