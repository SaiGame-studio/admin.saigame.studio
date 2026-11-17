このガイドでは、SaiGame SDKをUnityプロジェクトに統合するための初期設定について説明します。

### 1. 前提条件とインストール

* **ゲームの登録:** SaiGameシステムでゲームが作成済みであることを確認してください。
* **Unityバージョン:**
    * 推奨: **Unity 6.x** 以降。
    * 旧バージョン: 古いバージョンを使用して問題が発生した場合は、[**Sai** のサポート](https://discord.gg/UU3YarmVde)までご連絡ください。
* **SDKのセットアップ:**
  1. [こちらのリンク](https://github.com/SaiGame-studio/ss-unity/releases)から最新の **Unity Package** をダウンロードします。
![alt](/tutorial-guides/import-unity-package/step-01.png)

  2. パッケージをプロジェクトにインポートします。
  3. `Assets/SaiGame/Prefabs` にある `SaiServer` プレハブをシーンにドラッグします。すべてのサービス（認証、アイテム、クエスト、バトルなど）はプレハブ内に設定済みです。
![alt](/tutorial-guides/import-unity-package/step-02.png)

---

### 2. 設定

Hierarchyで `SaiServer` オブジェクトを選択します。バックエンドへの接続に必要な設定はすべてそのインスペクターにあります。

#### Server Endpoint
**Server Endpoint** を `Production API (HTTPS) - api.saigame.studio` に設定し、本番データと通信できるようにします。これはデフォルト値です。
![alt](/tutorial-guides/import-unity-package/step-03.png)

#### ゲームの識別
1. ダッシュボードの **Game Detail** ページに移動し、**Game ID** をコピーします。
![alt](/tutorial-guides/import-unity-package/step-04.png)
2. Unityのインスペクターで `SaiServer` コンポーネントを選択します。
3. **Game ID** フィールドにコピーしたIDを貼り付けます。
![alt](/tutorial-guides/import-unity-package/step-05.png)

#### オプション: `.env` ファイルを使う
Game IDやテスト用の認証情報をインスペクターに直接入力する代わりに、`.env` ファイルで管理できます。
1. `SaiServer` のインスペクターで **Create .env** をクリックします。`Assets/SaiGame/env.txt` がプロジェクトのルートに `.env` としてコピーされます。
2. `.env` を開き、`GAME_ID`、`USERNAME`、`PASSWORD` を入力します。
3. **Load .env on Play** を有効にします。Play Mode に入ると、Game ID が `SaiServer` に、認証情報が `SaiAuth` に適用されます。

> **注意:** `.env` は絶対にソース管理にコミットしないでください。ここから読み込まれた認証情報は PlayerPrefs にのみ保存され、シーンファイルには保存されません。

![alt](/tutorial-guides/import-unity-package/step-06.jpg)

#### 接続の確認
`SaiServer` のインスペクターで **Test Connection** をクリックします。コンソールに `✓ Connection test passed!` と表示されれば、Unityからサーバーに接続できています。**Show Service Info** は現在のベースURLとログイン状態を表示します。

---

### 3. 認証とテスト

Unityを **Play Mode** に切り替えて、連携のテストを開始します。

#### ユーザー認証
`SaiAuth` コンポーネントを使用して、以下のアクションを実行できます：
* **Register**：新規アカウントの作成。
* **Login**：既存の認証情報でのログイン。
* **Get Me**（現在のユーザーの取得）、**Refresh Token**、**Logout**。
![alt](/tutorial-guides/import-unity-package/step-07.png)

#### Googleログイン（オプション）
プレイヤーは `GoogleBackendLogin` コンポーネントを使ってGoogleでログインすることもできます。
1. **Start Login** をクリックします。ブラウザでGoogleのログインページが開きます。
2. ブラウザでログインを完了します。Unityがサーバーの状態を確認し、ログインに成功するとトークンが自動的に `SaiAuth` に渡されます。
3. 中止する場合は **Cancel Login**、ブラウザが開かない場合は **Open Auth URL** を使用します。

![alt](/tutorial-guides/import-unity-package/step-08.jpg)

#### デバッグと実装
インスペクターには、迅速なテストのためのヘルパーボタンが含まれています。
* **コンソールショートカット:** テストボタンをクリックするたびに、コンソールに **カラーログ (Color Log)** が表示されます。
* **コードナビゲーション:** ログエントリをクリックすると、そのロジックを担当する関数に直接ジャンプします。カスタムゲームスクリプトを作成する際の参考にしてください。
![alt](/tutorial-guides/import-unity-package/step-09.png)
---

### 4. 次のステップ
* ログインやアカウント作成に成功するとシステムユーザーが作成されますが、特定のゲームの「プレイヤー」として自動的に登録されるわけではありません。
* ユーザーをアクティブなプレイヤーに変換するロジックについては、**次回のチュートリアル**で説明します。
* `SaiServer` と `SaiAuth` コンポーネントには、まだ多くの機能があります。ぜひ自由に探索してみてください。
