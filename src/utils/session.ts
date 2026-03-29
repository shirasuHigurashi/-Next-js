import 'server-only';
import { encrypt, decrypt } from './jwt';
import { cookies } from "next/headers";

export async function createSession(userId: string) {
    try {
        // 1. 有効期限の計算
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // 2. 暗号化処理（ここで失敗する可能性がある）
        const session = await encrypt({ userId, expiresAt });

        if (!session) {
            throw new Error("セッションの暗号化に失敗しました");
        }

        // 3. クッキーの設定
        const cookieStore = await cookies();
        
        // setメソッド自体が失敗する場合に備える
        await cookieStore.set("session", session, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // 本番環境のみ必須にする設定
            expires: expiresAt,
            sameSite: "lax",
            path: "/",
        });

    } catch (error) {
        // 4. エラーのログ出力と再スロー
        console.error("セッション作成中にエラーが発生しました:", error);
        
        // 呼び出し元（Login関数など）に「失敗した」ことを伝える
        throw new Error("ログイン処理に失敗しました。時間をおいて再度お試しください。");
    }
}

export async function verifySession() {
    try {
        const cookieStore = await cookies();
        const cookie = cookieStore.get("session");
        
        if (!cookie) return null; // クッキー自体がなければ即終了

        const session = await decrypt(cookie.value);

        if (!session?.userId) {
            return null;
        }
        return { isAuth: true, userId: session.userId as string };
    } catch (error) {
        console.error("セッション確認中にエラー:", error);
        return null; // 何か問題があれば安全のために未ログイン扱いにする
    }
}

export async function deleteSession(){
    const cookieStore = await cookies();
    cookieStore.delete("session")
}