package blog

import (
	"cards/gen/proto/blog"
	"cards/pkg/database"
)

type Post struct {
	ID      int    `db:"id,omitempty"`
	Title   string `db:"title"`
	Content string `db:"content"`
	Author  string `db:"author"`
}

func createPost(p *blog.Post) (*blog.Post, error) {
	// createPost creates a new blog post in the database and returns the created blog post along with any error encountered.

	// Get a session from the database
	sess := database.GetSession()

	// Create a new Blog struct with the provided details
	newPost := Post{
		Title:   p.Title,
		Content: p.Content,
		Author:  p.Author,
	}
	// Save the new blog post to the database
	_, err := sess.Collection("posts").Insert(newPost)
	if err != nil {
		return nil, err
	}

	return p, nil
}

func getPosts(p *blog.Posts) (*blog.Posts, error) {
	sess := database.GetSession()
	var posts []*blog.Post
	var dbPosts []Post

	res := sess.Collection("posts").Find()

	err := res.All(&dbPosts)
	if err != nil {
		return nil, err
	}

	// Convert the JSON data back into card structs
	for _, dbPost := range dbPosts {
		p := &blog.Post{
			Id:      int32(dbPost.ID), // Assuming you want to convert int to int32
			Title:   dbPost.Title,
			Content: dbPost.Content,
			Author:  dbPost.Author,
		}

		posts = append(posts, p)
	}
	returnPosts := &blog.Posts{
		Posts: posts,
	}

	return returnPosts, nil
}
