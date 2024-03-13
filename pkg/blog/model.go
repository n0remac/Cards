package blog

import (
	"cards/gen/proto/blog"
	"cards/pkg/database"
	"crypto/rand"
	"encoding/hex"
)

type Post struct {
	ID      int `db:"id,omitempty"`
	Title   string
	Content string
	Author  string
}

func createPost(p *blog.Post) (*blog.Post, error) {
	// createPost creates a new blog post in the database and returns the created blog post along with any error encountered.

	// Get a session from the database
	sess := database.GetSession()

	// Generate a new unique ID for the blog post
	newID := generateUniqueID()

	// Create a new Blog struct with the provided details
	newPost := blog.Post{
		Id:      newID,
		Title:   p.Title,
		Content: p.Content,
		Author:  p.Author,
	}

	// Save the new blog post to the database
	_, err := sess.Collection("post").Insert(newPost)
	if err != nil {
		return nil, err
	}

	return &newPost, nil
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
			Id:      string(dbPost.ID), // Assuming you want to convert int to int32
			Title:   dbPost.Title,
			Content: dbPost.Content,
			Author:  dbPost.Author,
		}

		posts = append(posts, p)
	}
	p.Posts = posts
	return p, nil
}

func generateUniqueID() string {
	// Create a byte slice to hold the random bytes
	idBytes := make([]byte, 16)

	// Read random bytes from the cryptographic random number generator
	_, err := rand.Read(idBytes)
	if err != nil {
		// Handle error if reading random bytes fails
		panic(err)
	}

	// Encode the random bytes to a hexadecimal string
	id := hex.EncodeToString(idBytes)

	return id
}
