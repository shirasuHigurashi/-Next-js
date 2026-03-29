// 1. JWTを扱うための便利な道具（joseライブラリ）を読み込む
import { JWTPayload, SignJWT, jwtVerify } from "jose";

// 2. 暗号化に使う「秘密の合言葉」を決める（サーバーだけが知っている文字列）
const secretKey = "secret";

// 3. 合言葉をコンピューターが扱いやすい「バイナリデータ（Uint8Array）」に変換する
const encodeKey = new TextEncoder().encode(secretKey);

/**
 * 4. encrypt（暗号化）関数：中身（payload）を渡すと、署名付きチケットを返す
 */
export function encrypt(payload: JWTPayload) {
    // 5. 新しいチケット（JWT）の作成を開始し、中にデータ（payload）を入れる
    return new SignJWT(payload)
        // 6. チケットの「ヘッダー」を設定（HS256というアルゴリズムで署名することを宣言）
        .setProtectedHeader({ alg: "HS256" })         
        // 7. 「いつ発行されたか」というタイムスタンプを刻印する
        .setIssuedAt()        
        // 8. 「いつまで有効か」を設定（ここでは7日間有効）
        .setExpirationTime("7d")
        // 9. 最後に「秘密の合言葉（encodeKey）」でハンコを押して、文字列として完成させる
        .sign(encodeKey);
}

export async function decrypt(session: string | undefined = "") {
    try {
        // 1. jwtVerify で「チケットの正当性」を厳重にチェックする
        // - session: 検査するチケット
        // - encodeKey: サーバーだけが持っている「本物のハンコ（秘密鍵）」
        const { payload } = await jwtVerify(session, encodeKey, {
            // 2. 「HS256」という決まったルールで作られたチケットか確認
            algorithms: ["HS256"],
        });

        // 3. 検査に合格したら、チケットの中に書いてあるデータ（ユーザーIDなど）を返す
        return payload;

    } catch (error) {
        // 4. 検査に落ちた場合（偽造、期限切れ、そもそもチケットがない等）
        // コンソールにエラーを記録し、「この人は未認証」という意味で null を返す
        console.log("Failed to verify session");
        return null;
    }
}