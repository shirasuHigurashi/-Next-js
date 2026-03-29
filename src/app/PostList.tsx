import Link from 'next/link';
import { getPosts } from '~/actions/post';

export default async function PostList() {
  const posts = await getPosts();
    if ("error" in posts) {
    return <div>エラーが発生しました: {posts.error}</div>;
}
  if (posts.length === 0) {
    return (
      <div className='card'>
        <p className='post-content'>投稿がありません</p>
      </div>
    );
  }

  return (
    <div className='post-list'>
      {posts.map((post) => {
        return (
          <div key={post.id} className='card'>
            <h3 className='post-title'>
              <Link href={`/posts/${post.id}`}>{post.title}</Link>
            </h3>
            <p className='post-meta'>
              投稿者: {post.user.userName} | 作成日: {post.createdAt.toLocaleDateString()}
            </p>
            {/* ↓ posts.content ではなく post.content に修正 */}
            <p className='post-content'>{post.content}</p>
          </div>
        );
      })}
    </div>
  );
}
