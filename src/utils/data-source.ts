import 'reflect-metadata'; // TypeORMがデコレータ（@Entityなど）を正しく扱うために必須
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import path from 'path';
// src/utils/data-source.ts
// 1. 接続先の住所（URL）を環境変数から取得
const dbUrl = process.env.POSTGRES_URL;

// 2. データベースの接続設定（DataSource）を作成
const appDataSource = new DataSource(
  dbUrl
    ? {
        // --- 本番環境（PostgreSQL）の設定 ---
        type: 'postgres',
        url: dbUrl,
        synchronize: true, // 開発中：設計図(Entity)に合わせてテーブルを自動作成・更新する
        logging: true,     // 実行されたSQLをコンソールに表示する
        entities: [path.join(__dirname, '../entities/**/*.ts')], 
        migrations: [path.join(__dirname, '../migrations/**/*.ts')],
        subscribers: [],
        ssl: {
          rejectUnauthorized: false, // セキュリティ証明書のチェック（一部のクラウド環境で必要）
        },
      }
    : {
        // --- 練習環境（SQLite）の設定：dbUrlがない場合 ---
        type: 'sqlite',
        database: path.join(process.cwd(), 'database.sqlite'), // ファイルとして保存
        synchronize: false, // SQLiteでは自動更新をオフに（手動管理）
        logging: true,
        entities: ["src/entities/**/*.ts"],
        migrations: ["src/migrations/**/*.ts"],
        subscribers: [],
      }
);

// 3. 一度開いた「蛇口（接続）」を使い回すための変数
// 何度も接続し直すとアプリが重くなるため、ここに保存しておく
let initializedDataSource: DataSource | null = null;

/**
 * データベースの接続（初期化）を行い、使える状態のDataSourceを返す関数
 */
export const getDataSource = async (): Promise<DataSource> => {
  // すでに接続済みなら、新しく作らずに今のをそのまま返す（節約！）
  if (initializedDataSource && initializedDataSource.isInitialized) {
    return initializedDataSource;
  }

  // まだ接続されていない場合は、今から接続（initialize）を開始する
  if (!appDataSource.isInitialized) {
    initializedDataSource = await appDataSource.initialize();
  } else {
    initializedDataSource = appDataSource;
  }

  return initializedDataSource;
};

/**
 * 特定のテーブル（UserやPost）を操作するための「専用窓口（Repository）」を取得する関数
 * これを他のファイルから呼び出して、データの保存や取得を行う
 */
export const getRepository = async <T extends ObjectLiteral>(
  entity: EntityTarget<T>
): Promise<Repository<T>> => {
  const dataSource = await getDataSource(); // まず接続を確保する
  return dataSource.getRepository(entity);   // 指定されたエンティティの操作窓口を返す
};

// マイグレーション（ツールでの操作）などのために、設定自体も書き出しておく
export const AppDataSource = appDataSource;