"use server"

import { error } from "console"
import { getRepository } from "~/utils/data-source"
import { User } from "~/entities/User"
import bcrypt from "bcryptjs"
import { createSession, deleteSession } from "~/utils/session"
import { redirect } from "next/navigation"


export async function signup(formData: FormData) {
    // 1. 入力された値（ユーザー名、メール、パスワード）を取り出す
    const userName = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 2. 入力漏れがないかチェック
    if (!userName || !email || !password) {
        // ※ここのエラーメッセージは「入力してください」などが適切かもしれませんね
        return { error: "全ての項目を入力してください。" };
    }

    try {
        // 3. データベースの窓口を準備
        const userRepository = await getRepository(User);

        // 4. 重複チェック（同じメールアドレスの人がいないか？）
        const existingUser = await userRepository.findOneBy({ email });
        if (existingUser) {
            return { error: "このメールアドレスは既に使用されています。" };
        }

        // 5. 【超重要】パスワードのハッシュ化
        // パスワードをそのまま保存すると、万が一漏洩した時に大変です。
        // bcryptを使って、一見デタラメな文字列（ハッシュ）に変換します。
        // 「10」は計算の複雑さを表す数字（ソルト回数）です。
        const hashedPassword = await bcrypt.hash(password, 10);

        // 6. 新しいユーザーデータを作成
        const newUser = userRepository.create({
            userName: userName, // 修正：emailではなくuserNameを入れましょう
            email: email,
            password: hashedPassword, // 生のパスワードではなくハッシュを保存！
        });

        // 7. データベースに保存
        const savedUser = await userRepository.save(newUser);

        // 8. ログイン状態（セッション）を作成
        // 登録が完了したら、そのままログインした状態にしてあげます。
        await createSession(savedUser.id.toString());

    } catch (e) {
        console.log(e);
        return { error: "ユーザ登録中にエラーが発生しました" };
    }

    // 9. トップページへ移動
    redirect("/");
}



export async function login(formData:FormData){
    const email = formData.get("email") as string
    const password = formData.get("password") as string


    try {
        const userRepository = await getRepository(User);
        const user = await userRepository.findOneBy({email})

        if(!user){
            return {error:"メールアドレスまたはパスワードが正しくありません"}
        }


        await createSession(user.id.toString())

    }catch(e){
        console.log(e);
        return {error:"ログイン中にエラーが発生しました"}
    }
    redirect("/")
}


export async function logout(){
    await deleteSession()
    redirect("/login")

}