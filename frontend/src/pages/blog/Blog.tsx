import React, { useEffect, useState } from 'react';
import { blogService } from '../../service'; // Adjust this path to where your service is defined
import { Post, Posts, GetPostsRequest } from '../../rpc/proto/blog/blog_pb'; // Adjust these imports based on your actual file structure

export const AllPosts = () => {
  const [posts, setPosts] = useState<Posts>();

  useEffect(() => {
    const fetchPosts = async () => {
      const postsRequest = new GetPostsRequest(); // Adjust based on your actual request class, if needed
      
      try {
        const response = await blogService.getPosts(postsRequest);
        if (response.posts) {
          console.log('Fetched blog posts:', response.posts);
          setPosts(response.posts);
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="flex flex-col items-center my-8">
      <h1 className="text-3xl font-bold mb-8">All Blog Posts</h1>
      
      {posts && posts.posts.map((post) => (
        <PostComponent key={post.id} post={post} />
      ))}
    </div>
  );
};

interface PostComponentProps {
  post: Post;
}

export const PostComponent: React.FC<PostComponentProps> = ({ post }) => {
  return (
    <div className="bg-gray-800 text-white rounded-lg p-6 m-4 w-full max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">{post.title}</h2>
      <p className="text-base mb-4">{post.content}</p>
      <div className="text-right text-sm">{post.author}</div>
    </div>
  );
};
