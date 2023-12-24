package user

import (
	"cards/gen/proto/user"
	"cards/pkg/database"
	"fmt"

	"github.com/upper/db/v4"
)

type User struct {
	ID       int    `db:"id,omitempty"`
	Username string `db:"username"`
	Email    string `db:"email"`
	Password string `db:"password"` // This should be a hashed password
}

func createUser(u *user.User) (*user.User, error) {
	sess := database.GetSession()
	hashedPass, err := hashPassword(u.Password)
	if err != nil {
		fmt.Println("Error hashing password:", err)
		return nil, err
	}
	fmt.Println("Hashed password:", hashedPass)
	newUser := User{
		Username: u.Username,
		Email:    u.Email,
		Password: hashedPass, // Ensure this is hashed before calling this function
	}

	_, err2 := sess.Collection("users").Insert(newUser)
	if err2 != nil {
		return nil, err2
	}
	return u, err2
}

func getUserFromDBByUsername(username string) (*user.User, error) {
	sess := database.GetSession()
	var dbUser User

	// Find the user with the given username
	res := sess.Collection("users").Find(db.Cond{"username": username})
	err := res.One(&dbUser)
	if err != nil {
		return nil, err
	}

	// Convert the database user to a protobuf user
	u := &user.User{
		Id:       int32(dbUser.ID),
		Username: dbUser.Username,
		Email:    dbUser.Email,
        Password: dbUser.Password,
	}

	return u, nil
}

func getUserFromDB(id int32) (*user.User, error) {
	sess := database.GetSession()
	var dbUser User

	// Find the user with the given ID
	res := sess.Collection("users").Find(db.Cond{"id": id})
	err := res.One(&dbUser)
	if err != nil {
		return nil, err
	}

	// Convert the database user to a protobuf user
	u := &user.User{
		Id:       int32(dbUser.ID),
		Username: dbUser.Username,
		Email:    dbUser.Email,
		// Do not include the password in the response
	}

	return u, nil
}

func updateUserInDB(u *user.User) (*user.User, error) {
	sess := database.GetSession()
	var dbUser User

	// Find the user and update their details
	res := sess.Collection("users").Find(db.Cond{"id": u.Id})
	err := res.One(&dbUser)
	if err != nil {
		return nil, err
	}

	dbUser.Username = u.Username
	dbUser.Email = u.Email
	// Update the password only if it's not empty and ensure it's hashed
	if u.Password != "" {
		dbUser.Password = u.Password // Ensure this is hashed
	}

	err = res.Update(dbUser)
	if err != nil {
		return nil, err
	}

	return u, nil
}

func deleteUserFromDB(id int32) error {
	sess := database.GetSession()

	// Delete the user with the given ID
	res := sess.Collection("users").Find(db.Cond{"id": id})
	err := res.Delete()
	return err
}
