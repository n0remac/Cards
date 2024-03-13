package blog

import (
	"cards/gen/proto/blog"
	"context"

	"github.com/bufbuild/connect-go"
)

type BlogService struct{}

// CreateBlog creates a new blog entry.
func (s *BlogService) CreatePost(ctx context.Context, req *connect.Request[blog.CreatePostRequest]) (*connect.Response[blog.CreatePostResponse], error) {
	p, err := createPost(req.Msg.Post)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&blog.CreatePostResponse{
		Post: p,
	}), nil
}

func (s *BlogService) GetPosts(ctx context.Context, req *connect.Request[blog.GetPostsRequest]) (*connect.Response[blog.GetPostsResponse], error) {
	var p *blog.Posts

	posts, err := getPosts(p)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&blog.GetPostsResponse{
		Posts: posts,
	}), nil
}
