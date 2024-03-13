package database

import (
	"log"

	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/sqlite"
)

var sess db.Session

func InitDB() {
	var err error
	var settings = sqlite.ConnectionURL{
		Database: `mydatabase.db`, // Your SQLite database file
	}

	// Open a session to your SQLite database
	sess, err = sqlite.Open(settings)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Now, let's create the Posts table
	createPostsTable()
}

func createPostsTable() {
	// SQL command to create the Posts table
	sqlCommand := `
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		author TEXT NOT NULL
	);`

	// Execute the SQL command
	_, err := sess.SQL().Exec(sqlCommand)
	if err != nil {
		log.Fatalf("Failed to create Posts table: %v", err)
	} else {
		log.Println("Posts table created successfully")
	}
}

func GetSession() db.Session {
	return sess
}
