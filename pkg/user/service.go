package user

import (
	"cards/gen/proto/user"
	"context"
	"fmt"

	"github.com/bufbuild/connect-go"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	// Add any fields if needed
}

func (s *UserService) Login(ctx context.Context, req *connect.Request[user.LoginRequest]) (*connect.Response[user.LoginResponse], error) {
	u, err := getUserFromDBByUsername(req.Msg.Username)
	if err != nil {
		return nil, err
	}
	fmt.Println("User:", u)
	

	passHashStatus, err := checkPasswordHash(req.Msg.Password, u.Password)
	if err != nil {
		fmt.Println("Error checking password hash:", err)
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication failed"))
	}

	if !passHashStatus {
		fmt.Println("Password is incorrect")
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid username or password"))
	}

	return connect.NewResponse(&user.LoginResponse{
		Token: "token", // Generate a real token here
	}), nil
}

func (s *UserService) CreateUser(ctx context.Context, req *connect.Request[user.CreateUserRequest]) (*connect.Response[user.CreateUserResponse], error) {
	newUser, err := createUser(req.Msg.User)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&user.CreateUserResponse{
		User: newUser,
	}), nil
}

func (s *UserService) GetUser(ctx context.Context, req *connect.Request[user.GetUserRequest]) (*connect.Response[user.GetUserResponse], error) {
	u, err := getUserFromDB(req.Msg.Id)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&user.GetUserResponse{
		User: u,
	}), nil
}

func (s *UserService) UpdateUser(ctx context.Context, req *connect.Request[user.UpdateUserRequest]) (*connect.Response[user.UpdateUserResponse], error) {
	updatedUser, err := updateUserInDB(req.Msg.User)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&user.UpdateUserResponse{
		User: updatedUser,
	}), nil
}

func (s *UserService) DeleteUser(ctx context.Context, req *connect.Request[user.DeleteUserRequest]) (*connect.Response[user.DeleteUserResponse], error) {
	err := deleteUserFromDB(req.Msg.Id)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&user.DeleteUserResponse{
		Success: true,
	}), nil
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	fmt.Println("password:", password)
	fmt.Println("hash:", bytes)
	return string(bytes), err
}

func checkPasswordHash(password, hash string) (bool, error) {
	fmt.Println("password:", password)
	fmt.Println("hash:", hash)
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil, err
}
