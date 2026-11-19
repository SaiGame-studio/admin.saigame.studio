Sai Server を通じて、プレイヤーが Google アカウントで Unity ゲームにサインインできるようにします。`GoogleBackendLogin` コンポーネントがブラウザで Google のサインインページを開き、Sai Server がログインを完了するのを待ってから、トークンを `SaiAuth` に渡します。Unity プロジェクトに Google SDK は不要です。

**このガイドで行うこと：**
- Unity インスペクターから Google ログインを試す
- 自分のコードから同じログインを呼び出す
- キャンセル、タイムアウト、拒否の結果を処理する

## 事前準備

- 有効な Game ID で Sai Server に接続済みの Unity プロジェクト（[Unity Package のインポート](/tutorials/guides/import-unity-package)を参照）
- 端末にブラウザがあること。サインインページはシステムブラウザで開きます。

## Google ログインの仕組み

1. Unity が Sai Server にゲーム用の **ログインセッション** の作成を依頼します。
2. Sai Server がサインイン URL を返し、Unity がブラウザで開きます。
3. プレイヤーがブラウザで Google にサインインします。アカウントで二要素認証が有効な場合は、ブラウザのページで 2FA コードも求められます。

> 🖼️ **画像プレースホルダー** · `/tutorial-guides/unity-google-login/2fa-browser-page.png`  
> 撮影内容：2FA を有効にしたアカウントで Google サインイン後に表示される、6 桁の 2FA コード入力ページ。  
> ⚙️ **Unity での撮影が必要：** このページは Unity で **Start Login** を押した後にのみ表示されます。手動で撮影してください。

4. Unity は数秒ごとにセッションを確認します。ログインが完了すると、アクセストークンとリフレッシュトークンを受け取ります。
5. トークンは `SaiAuth` に渡されるため、他の Sai Server 呼び出しはパスワードでログインした場合と同じように動作します。

Sai Server は Google アカウントをメールアドレスで照合します。同じメールのアカウントがあればそのアカウントにサインインし、なければ初回サインイン時に新しいアカウントを作成します。

## ステップ 1：インスペクターで Google ログインを試す

1. **Play モード** に入ります。
2. `SaiServer` オブジェクト上の `GoogleBackendLogin` コンポーネントを選択します。
3. **Start Login** をクリックします。ブラウザで Google のサインインページが開きます。
4. ブラウザで Google にサインインします。

![インスペクターの GoogleBackendLogin コンポーネント](/tutorial-guides/unity-google-login/step-01.jpg)

> 🖼️ **画像プレースホルダー** · `/tutorial-guides/unity-google-login/google-signin-page.png`  
> 撮影内容：**Start Login** クリック後にシステムブラウザで開いた Google サインインページ（実際のメールアドレスは隠す）。  
> ⚙️ **Unity での撮影が必要：** このページは Unity で **Start Login** を押した後にのみ表示されます。手動で撮影してください。


**期待される結果：** コンポーネントにアクセストークンとユーザーデータが表示され、`SaiAuth` がログイン状態になります。`SaiAuth` の **Get Me** で確認してください。

> 🖼️ **画像プレースホルダー** · `/tutorial-guides/unity-google-login/login-success.png`  
> 撮影内容：ログイン成功後のインスペクターの `GoogleBackendLogin`（トークンとユーザーデータが入った状態、トークンは一部ぼかす）と **Get Me** の Console ログ。  
> ⚙️ **Unity での撮影が必要：** Unity エディター（Play モード）で手動撮影してください。


その他のボタン：
- **Cancel Login** – 現在のログイン待機を中止
- **Open Auth URL** – ブラウザが開かなかった場合にサインインページを再度開く
- **Set Token To SaiAuth** – 保存済みトークンを再度 `SaiAuth` にコピー
- **Clear Auth Data** – このコンポーネントに保存されたトークンを消去

## ステップ 2：コードから Google ログインを開始する

```csharp
using SaiGame.Services;
using UnityEngine;

public class GoogleLoginButton : MonoBehaviour
{
    public void OnClickGoogleLogin()
    {
        SaiServer.Instance.GoogleBackendLogin.StartLogin(
            response => Debug.Log($"Google login OK: {response.user.username}"),
            error => Debug.LogWarning($"Google login failed: {error}"));
    }
}
```

ログイン成功後は通常どおり進めます。たとえば [Gamer Progress](/tutorials/guides/create-gamer-progress) でプレイヤーの進行データを読み込むか作成します。

`GoogleBackendLogin` の `OnLoginSuccess`、`OnLoginFailure`、`OnSessionCreated` イベントを購読することもできます。

## ステップ 3：ログイン結果を処理する

エラーコールバックは次のいずれかを返します。

| エラー | 意味 | 対処 |
|---|---|---|
| `cancelled` | `CancelLogin()` が呼ばれた | ログイン方法を再表示する |
| `user_denied:...` | プレイヤーが Google サインインを拒否した | 別のログイン方法を提示する |
| `session_expired` | プレイヤーが完了する前にセッションが期限切れになった | 新しいログインを開始する |
| `timeout` | Unity が待機をやめた。デフォルトは 300 秒（**Max Login Duration Seconds**） | 新しいログインを開始する |
| `create_session_failed: ...` | セッションを作成できなかった。主にネットワークか Game ID の問題 | 接続と Game ID を確認する |
| `server_error:...` | サーバーが Google ログインを完了できなかった | 再試行し、続く場合はサポートに連絡する |

同時に実行できるログインは 1 つだけです。ログイン中に再度 `StartLogin` を呼ぶと `Login already in progress!` が返ります。

## よくある問題

- **ブラウザが開かない。** **Open Auth URL** をクリックするか、コードで `AuthUrl` を読み取って自分で開いてください。
- **常にタイムアウトする。** プレイヤーが制限時間内にサインインを完了しているか、端末から Sai Server API にアクセスできるか確認してください。
- **Google でログインしたがゲームデータがない。** Google ログインはサインインのみです。`GamerProgress.GetProgress` または `CreateProgress` を呼んでセーブを読み込んでください。

## FAQ

### Unity 用の Google Sign-In SDK は必要ですか？
いいえ。サインインはブラウザで行われ、Unity は Sai Server とだけ通信します。

### Google アカウントとパスワードのアカウントは同じプレイヤーですか？
Sai Server は **メールアドレス** で照合します。同じメールの Sai Server アカウントがあれば、そのアカウントにサインインして進行データを引き継ぎます。なければ初回の Google サインイン時に新しいアカウントが作成されます。

### Google ログインは二要素認証に対応していますか？
はい。アカウントで 2FA が有効な場合、ログイン完了前にブラウザのページでコードが求められます。

## 次のステップ

- [Gamer Progress を作成する](/tutorials/guides/create-gamer-progress)
- [クロスプラットフォームのクラウドセーブ](/tutorials/guides/cross-platform-save)
