// database/db.go
package database

import (
	"log"

	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/mysql"
)

var sess db.Session

func InitDB() {
	var err error
	var settings = mysql.ConnectionURL{
		Database: `carddatabase`,
		Host:     `localhost`,
		User:     `root`,
		Password: `password`,
	}

	sess, err = mysql.Open(settings)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
}

func GetSession() db.Session {
	return sess
}
