"use server"
import { redirect } from 'next/navigation';
import { revalidateTag, cacheTag, updateTag } from 'next/cache';
import { AppDataSource, getRepository } from '../utils/data-source';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { verifySession } from '../utils/session';
import { error } from 'console';
import { use } from 'react';


export async function createPost(formData: FormData) {
    // 1. フォームから「タイトル」と「本文」を取り出す
    // formData.get("name属性名") で、HTMLの入力欄の中身を取得します
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    // 2. 入力チェック（バリデーション）
    // どちらかが空っぽだったら、保存せずにエラーメッセージを返して終了します
    if (!title || !content) {
        return { error: "タイトルと本文を入力してください" };
    }

    try {
        // 3. ログインチェック（本人確認）
        // セッション（ログイン情報）があるか、誰が操作しているかを確認します
        const session = await verifySession();
        if (!session || !session.userId) {
            return { error: "ログインしてください" };
        }

        // 4. データベースを操作するための「窓口（Repository）」を準備
        // Post（投稿）と User（ユーザー）それぞれのテーブルをいじる準備をします
        const postRepository = await getRepository(Post);
        const userRepository = await getRepository(User);

        // 5. 投稿主（ユーザー）をデータベースから探す
        // セッションにあるIDを使って、実在するユーザーかチェックします
        const user = await userRepository.findOneBy({
            id: Number(session.userId)
        });
        
        if (!user) {
            return { error: "ユーザーが見つかりません" };
        }

        // 6. 新しい投稿データを作成（まだ保存はされない）
        // 取り出したタイトル、本文、そして「見つかったユーザー情報」をセットにします
        const newPost = postRepository.create({
            title: title,
            content: content,
            user: user, // ここで「この投稿は、このユーザーのもの」と紐づけています
        });

        // 7. データベースに実際に保存
        // ここで初めて、データベースのテーブルに1行データが追加されます
        await postRepository.save(newPost);

    } catch (e) {
        // 何らかの理由（通信エラーなど）で失敗した時の処理
        console.log(e); // 開発者が原因を追えるようにログを出します
        return { error: "投稿の作成中にエラーが発生しました" };
    }

    // 8. キャッシュのリフレッシュと画面移動
    // "posts"という名前のデータを最新の状態に更新（再取得）するように指示します
    updateTag("posts");
    // 投稿が終わったら、自動的にトップページ（"/"）に画面を切り替えます
    redirect("/");
}

export async function getPosts() {
    // 1. Next.jsの最新のキャッシュ機能を使う宣言
    // 同じデータを何度もデータベースに読みに行かず、一時保存（キャッシュ）して高速化します
    "use cache";
    // このキャッシュに "posts" という名前（タグ）を付けます
    // 新しい投稿があった時に、このタグを指定してキャッシュを新鮮なものに入れ替えられます
    cacheTag("posts");

    try {
        // 2. データベースの「Post（投稿）」テーブルを操作する窓口を準備
        const postRepository = await getRepository(Post);

        // 3. データの検索（find）を開始
        const posts = await postRepository.find({
            // 【重要】リレーションの設定
            // 投稿データだけでなく、紐づいている「ユーザー情報」も一緒に持ってきてね！という指示です
            relations: {
                user: true,
            },
            // 並び順の設定
            // createdAt（作成日時）を "DESC"（降順：新しい順）で並べます
            order: {
                createdAt: "DESC",
            },
        });

        // 4. 取得したデータを「使いやすい形」に整えて返す
        // mapを使って、1件ずつの投稿データに対して処理を行います
        return posts.map((post) => ({
            ...post,          // 投稿のタイトルや本文などをすべて展開
            user: { ...post.user }, // 紐づいているユーザー情報もコピーしてセットにする
        }));

    } catch (e) {
        // エラーが起きたらコンソールに表示して、エラーメッセージを返します
        console.log(e);
        return { error: "投稿の取得中にエラーが発生しました" };
    }
}


export async function getPost(id: number) {
  // 1. この記事専用のキャッシュを作成
  // "use cache" で高速化し、IDごとのタグ（post-1, post-2など）で管理します
  "use cache"
  cacheTag(`post-${id}`)

  // 2. データベースの窓口を準備
  const postRepository = await getRepository(Post);

  // 3. 指定されたIDの記事を1件だけ探す
  const post = await postRepository.findOne({
    where: { id }, // IDが一致するものを検索
    relations: {
      user: true,  // 投稿主（User）の情報も一緒に持ってきてね！
    },
  });

  // 4. 見つからなかったら null（空っぽ）を返す
  if (!post) return null;

  // 5. データを整理して返す
  return {
    ...post,
    user: { ...post.user },
  };
}

export async function deletePost(id: number) {

    // 1. ログインしているかチェック
    const session = await verifySession()
    if(!session || !session.userId ){
        return {error:"ログインしてください"}
    }

    // 2. 削除したい記事をデータベースから探す
    const postRepository = await getRepository(Post);
    const post = await postRepository.findOne({
        where: { id },
        relations: { user: true }, // 誰の記事か確認するためにUser情報が必要
    });

    // 3. 記事が存在するかチェック
    if (!post) {
        return { error: '投稿が見つかりません' };
    }

    // 4. 【最重要】「自分の記事か？」を確認
    // 記事に紐づくユーザーIDと、今ログインしている人のIDが一致するか比較します
    if (post.user.id !== Number(session.userId)) {
        return { error: '削除権限がありません' }; // 他人の記事ならここでブロック！
    }

    // 5. データベースから削除を実行
    await postRepository.remove(post);

    // 6. キャッシュをリフレッシュ
    // 一覧画面("posts")と、その記事詳細("post-id")の古いキャッシュを捨てます
    updateTag("posts")
    updateTag(`posts-${id}`)

    // 7. 削除が終わったらトップページへ移動
    redirect("/")
}