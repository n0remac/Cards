import React, { useEffect, useState } from 'react';
import { blogService } from '../../service'; // Update this path to where your service is defined
import { Post, Posts, GetPostsRequest } from '../../rpc/proto/blog/blog_pb'; // Update these imports based on your actual file structure

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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Blog Posts</h1>
      
      <div className="flex flex-wrap justify-center">
        {posts && posts.posts.map((post) => (
          <PostComponent key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

interface PostComponentProps {
  post: Post
}

export const PostComponent: React.FC<PostComponentProps> = ({ post }) => {
  return (
    <div className="border rounded-lg shadow-lg p-4 m-2 w-1/3">
      <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
      <p className="text-gray-700 text-base mb-4">{post.content}</p>
      <div className="text-right text-sm font-medium">{post.author}</div>
    </div>
  );
};

