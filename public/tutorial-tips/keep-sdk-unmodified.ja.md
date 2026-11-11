Sai Server の Unity SDK は、プロジェクトの `Assets/SaiGame` フォルダーにあります。**このフォルダー内のファイルは編集しないでください。**

## 理由

Sai Game SDK は、不具合の修正や新機能を含む新しいバージョンを定期的にリリースしています。SDK を更新すると `Assets/SaiGame` 内のファイルが置き換えられるため、

- そこで行った変更は更新によって**上書き**される、または
- 更新があなたの変更と**競合**し、ゲームがコンパイルできなくなる可能性があります。

SDK を変更せずにおけば、新しいリリースにいつでも更新できます。

## 代わりにすること

- 自分のスクリプトは `Assets/SaiGame` の外にある**自分のフォルダー**に置きます。
- SDK の public なメソッドやイベント（例：`SaiAuth.OnLoginSuccess`）を使って、自分のスクリプトから SDK を呼び出します。
- 新しいバージョンの SDK は [Unity Package releases](https://github.com/SaiGame-studio/ss-unity/releases) から入手できます。

## SDK にない機能が必要な場合

問題が発生した場合や、必要な機能が SDK にない場合は、SDK を変更せずにご連絡ください。次のリリースで対応できれば、すべての利用者に役立ちます。[Discord](https://discord.gg/UU3YarmVde) でもお問い合わせいただけます。
