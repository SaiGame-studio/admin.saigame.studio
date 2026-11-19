Unity プロジェクトを Sai Server バックエンドに接続します。SaiGame Unity SDK をインポートし、`SaiServer` プレハブを追加して Game ID を設定し、接続テストとログインを行います。完了すると、Unity から Sai Server 上のゲームと通信できるようになります。

**このガイドで行うこと：**
- SaiGame Unity パッケージをインポートする
- `SaiServer` プレハブに Game ID を設定する
- （任意）`.env` ファイルから設定を読み込む
- 接続をテストし、`SaiAuth` でログインする

## 事前準備

- Sai Server で作成済みのゲームとその **Game ID**（[ゲームスタジオ作成](/tutorials/guides/create-a-studio)を参照）
- **Unity 6.x 以降**（推奨）。古いバージョンで問題が発生した場合は [Discord で Sai に相談](https://discord.gg/UU3YarmVde)してください。

## ステップ 1：SaiGame Unity パッケージをインポートする

1. [SaiGame SDK のリリースページ](https://github.com/SaiGame-studio/ss-unity/releases)から最新の Unity パッケージをダウンロードします。
2. パッケージを Unity プロジェクトにインポートします。
3. `Assets/SaiGame/Prefabs` から `SaiServer` プレハブをシーンにドラッグします。すべてのサービス（認証、クラウドセーブ、アイテム、クエスト、バトルなど）が内部で接続済みです。

![SaiGame Unity パッケージをダウンロード](/tutorial-guides/import-unity-package/step-01.png)

![シーン内の SaiServer プレハブ](/tutorial-guides/import-unity-package/step-02.png)

パッケージ名とバージョンは `SaiServer` インスペクターの上部に表示されます。サポートを依頼する際はこのバージョンを伝えてください。

## ステップ 2：Server Endpoint と Game ID を設定する

Hierarchy で `SaiServer` オブジェクトを選択します。

1. **Server Endpoint：** 読み取り専用の本番 URL **https://api.saigame.studio** を確認します。
2. **Game ID：** 管理画面でゲームの **Game Detail** ページを開き、Game ID をコピーして **Game ID** 欄に貼り付けます。

Game ID が正しければ、読み取り専用の **Game Name** 欄にゲーム名が表示されます。横の **Refresh** で名前を再読み込みできます。

![Server Endpoint の設定](/tutorial-guides/import-unity-package/step-03.png)

![Game Detail ページで Game ID をコピー](/tutorial-guides/import-unity-package/step-04.png)

![SaiServer コンポーネントに Game ID を貼り付け](/tutorial-guides/import-unity-package/step-05.png)

## ステップ 3（任意）：.env ファイルで設定を管理する

`.env` ファイルを使うと、Game ID やテスト用の認証情報をシーンファイルに保存せずに済みます。

1. `SaiServer` インスペクターの **Environment** セクションで **Create .env** をクリックします。Unity が `Assets/SaiGame/env.example.txt` をプロジェクトルート（`Assets` フォルダの隣）に `.env` としてコピーします。`.env` が既にある場合、このボタンは無効です。
2. `.env` を開き、必要なキーを入力します。

```ini
GAME_ID=your-game-id-here
USERNAME=your-username-here
PASSWORD=your-password-here
```

3. **Load .env on Play** を有効にし、以下のトグルで Play モード開始時に適用する設定を選びます。
   - **Override game id** – `GAME_ID` を使用
   - **Override credentials** – `USERNAME` と `PASSWORD` を `SaiAuth` に渡す

![Load .env on Play の設定](/tutorial-guides/import-unity-package/step-06.png)

> **セキュリティ：** `.env` は絶対にソース管理にコミットしないでください。読み込んだ認証情報は PlayerPrefs にのみ保存され、シーンファイルには保存されません。

**ビルドの場合：** **Load .env.build on build** セクションも同様に動作します。**Create .env.build** をクリックして `GAME_ID` を設定します。**Override game id** をオンにすると、Game ID はビルドされたプレイヤーにのみ適用され、シーンアセットは変更されません。

## ステップ 4：接続をテストする

`SaiServer` インスペクターで **Test Connection** をクリックします。

**期待される結果：** Console に `✓ Connection test passed!` と表示されます。**Show Service Info** は現在のベース URL とログイン状態を出力します。

`✗ Connection test failed!` と表示された場合は、下の「よくある問題」を参照してください。

## ステップ 5：SaiAuth でログインする

Hierarchy で `SaiServer` を選択し、Inspector の **Sai Auth (Script)** を展開します。**Play モード** に入り、`SaiAuth` コンポーネントを使います。

- **Register** – 新規アカウントを作成（メール、ユーザー名、パスワード）
- **Login (Check 2FA)** – ユーザー名とパスワードでログイン
- **2FA Login** – アカウントで二要素認証が有効な場合、Console にコードが必要という警告が出ます。**2FA Code** に 6 桁のコードを入力し、**2FA Login** をクリックします。
- **Get Me** – 現在のユーザーを取得。**Refresh Token** – アクセストークンを更新。**Logout** – ログアウト

![Login、2FA Login、Register、Refresh Token、Get Me が表示された SaiAuth Inspector](/tutorial-guides/import-unity-package/step-07.png)

コードからも同じ処理を呼び出せます。

```csharp
using SaiGame.Services;

SaiServer.Instance.SaiAuth.Login(
    "username", "password",
    response => Debug.Log($"Logged in as {response.user.username}"),
    error => Debug.LogError(error));
```

**期待される結果：** Console に `Login successful.` と表示され、**Get Me** でユーザー名が出力されます。

プレイヤーは Google でもサインインできます。[UnityでのGoogleログイン](/tutorials/guides/unity-google-login)を参照してください。

## インスペクターのログからコードを探す

テストボタンを押すたびに、Console に **色付きログ** が出力されます。ログをクリックすると、その処理を行う関数が開きます。ゲームのスクリプトを書く際の参考にしてください。

たとえば **Show Service Info** は、色付きの操作名に続いてベース URL と認証状態を出力します。以下の画像はログイン前に撮影しています。

![ログイン前の Unity Console に表示された Show Service Info のログ](/tutorial-guides/import-unity-package/step-09.png)

## よくある問題

- **Connection test failed。** インターネット接続と Sai Server の稼働状況を確認してください。解決しない場合は [Discord でサポートに相談](https://discord.gg/UU3YarmVde)してください。
- **Game Name が空のまま。** Game ID が間違っているか、別のゲームのものです。Game Detail ページからコピーし直してください。
- **.env の値が反映されない。** `.env` が `Assets` 内ではなくプロジェクトルートにあり、**Load .env on Play** が有効か確認してください。
- **ログイン時に 2FA コードを求められる。** アカウントで 2FA が有効です。**2FA Code** と **2FA Login** を使ってください。

## FAQ

### Sai Server SDK はどの Unity バージョンに対応していますか？
Unity 6.x 以降を推奨します。

### ログインすればゲームのプレイヤーになりますか？
いいえ。ログインは Sai Server のユーザーを作成または読み込むだけです。Gamer Progress を作成した時点で、そのユーザーはゲームの **プレイヤー** になります。次のレッスンで説明します。

## 次のステップ

- [UnityでのGoogleログイン](/tutorials/guides/unity-google-login)
- [Create Gamer Progress](/tutorials/guides/create-gamer-progress)
