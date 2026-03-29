import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./utils/jwt"; // 暗号化されたセッション情報を読み取るための道具

// ログインしていなくても誰でも見れるページ（公共の場所）のリスト
const PUBLIC_PATH = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
    // 1. 今ユーザーがアクセスしようとしている「URLのパス（住所）」を取得
    const { pathname } = request.nextUrl;

    // 2. ブラウザに保存されている「session」という名前のクッキー（合言葉）を取り出す
    const cookie = request.cookies.get("session");

    // 3. 取り出したクッキー（暗号）を解読して、中身を確認する
    const session = await decrypt(cookie?.value);

    // 4. 「ユーザーID」が入っていれば、ログイン済み（認証OK）とみなす
    // !! は、値があれば true、なければ false に変換するテクニックです
    const isAuthenticated = !!session?.userId;

    // 5. 今見ようとしているページが「誰でも見れるページ」リストに含まれているかチェック
    const isPublicPath = PUBLIC_PATH.some((path) => pathname.startsWith(path));

    // --- ここからが「ガードマン」の判断ロジック ---

    // 【パターンA】ログイン済み なのに ログイン画面やサインアップ画面を見ようとした場合
    if (isAuthenticated && isPublicPath) {
        // すでにログインしてるなら、トップページ（/）に強制的に追い返す（リダイレクト）
        return NextResponse.redirect(new URL("/", request.url));
    }

    // 【パターンB】未ログイン なのに 公開されていない秘密のページを見ようとした場合
    if (!isAuthenticated && !isPublicPath) {
        // ログインしてないなら、ログイン画面（/login）へ強制的に連行する
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // 【パターンC】それ以外（適切なアクセス）の場合
    // そのまま次の処理（ページ表示）へ進めてOK！
    return NextResponse.next();
}

// このガードマンが働く「場所（範囲）」の設定
export const config = {
    // APIや画像ファイル、システム用ファイル以外の「すべてのページ」でこのチェックを行う設定です
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"]
};