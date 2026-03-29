import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Post } from './Post'; // 投稿（Post）データの型を読み込む

// 1. @Entity("user") は「データベースに 'user' という名前のテーブルを作る」という宣言
@Entity("user")
export class User {
    // 2. @PrimaryGeneratedColumn() は「自動で増える背番号（ID）」
    // 1, 2, 3... と自動で番号が振られ、データを区別するのに使います
    @PrimaryGeneratedColumn()
    id!: number;

    // 3. @Column() は「普通のデータの列」
    @Column()
    userName!: string; // ユーザー名

    // 4. { unique: true } は「重複禁止」の設定
    // すでに登録されているメールアドレスは使えないようにします
    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string; // パスワード

    // 5. @CreateDateColumn() は「データが作られた日時」を自動保存
    @CreateDateColumn()
    createdAt!: Date;

    // 6. @UpdateDateColumn() は「データが更新された日時」を自動保存
    @UpdateDateColumn()
    updatedAt!: Date;

    // 7. @OneToMany は「一対多」の関係（リレーション）
    // 「1人のユーザー」に対して「複数の投稿（posts）」が紐づくことを表します
    // (post: Post) => post.user は、Post側では 'user' という名前で自分を参照しているよ、という意味
    @OneToMany('post', (post: Post) => post.user)
    posts!: Post[];
}