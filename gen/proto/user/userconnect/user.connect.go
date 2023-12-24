// Code generated by protoc-gen-connect-go. DO NOT EDIT.
//
// Source: proto/user/user.proto

package userconnect

import (
	user "cards/gen/proto/user"
	context "context"
	errors "errors"
	connect_go "github.com/bufbuild/connect-go"
	http "net/http"
	strings "strings"
)

// This is a compile-time assertion to ensure that this generated file and the connect package are
// compatible. If you get a compiler error that this constant is not defined, this code was
// generated with a version of connect newer than the one compiled into your binary. You can fix the
// problem by either regenerating this code with an older version of connect or updating the connect
// version compiled into your binary.
const _ = connect_go.IsAtLeastVersion0_1_0

const (
	// UserServiceName is the fully-qualified name of the UserService service.
	UserServiceName = "user.UserService"
)

// These constants are the fully-qualified names of the RPCs defined in this package. They're
// exposed at runtime as Spec.Procedure and as the final two segments of the HTTP route.
//
// Note that these are different from the fully-qualified method names used by
// google.golang.org/protobuf/reflect/protoreflect. To convert from these constants to
// reflection-formatted method names, remove the leading slash and convert the remaining slash to a
// period.
const (
	// UserServiceCreateUserProcedure is the fully-qualified name of the UserService's CreateUser RPC.
	UserServiceCreateUserProcedure = "/user.UserService/CreateUser"
	// UserServiceGetUserProcedure is the fully-qualified name of the UserService's GetUser RPC.
	UserServiceGetUserProcedure = "/user.UserService/GetUser"
	// UserServiceUpdateUserProcedure is the fully-qualified name of the UserService's UpdateUser RPC.
	UserServiceUpdateUserProcedure = "/user.UserService/UpdateUser"
	// UserServiceDeleteUserProcedure is the fully-qualified name of the UserService's DeleteUser RPC.
	UserServiceDeleteUserProcedure = "/user.UserService/DeleteUser"
	// UserServiceLoginProcedure is the fully-qualified name of the UserService's Login RPC.
	UserServiceLoginProcedure = "/user.UserService/Login"
)

// UserServiceClient is a client for the user.UserService service.
type UserServiceClient interface {
	CreateUser(context.Context, *connect_go.Request[user.CreateUserRequest]) (*connect_go.Response[user.CreateUserResponse], error)
	GetUser(context.Context, *connect_go.Request[user.GetUserRequest]) (*connect_go.Response[user.GetUserResponse], error)
	UpdateUser(context.Context, *connect_go.Request[user.UpdateUserRequest]) (*connect_go.Response[user.UpdateUserResponse], error)
	DeleteUser(context.Context, *connect_go.Request[user.DeleteUserRequest]) (*connect_go.Response[user.DeleteUserResponse], error)
	Login(context.Context, *connect_go.Request[user.LoginRequest]) (*connect_go.Response[user.LoginResponse], error)
}

// NewUserServiceClient constructs a client for the user.UserService service. By default, it uses
// the Connect protocol with the binary Protobuf Codec, asks for gzipped responses, and sends
// uncompressed requests. To use the gRPC or gRPC-Web protocols, supply the connect.WithGRPC() or
// connect.WithGRPCWeb() options.
//
// The URL supplied here should be the base URL for the Connect or gRPC server (for example,
// http://api.acme.com or https://acme.com/grpc).
func NewUserServiceClient(httpClient connect_go.HTTPClient, baseURL string, opts ...connect_go.ClientOption) UserServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	return &userServiceClient{
		createUser: connect_go.NewClient[user.CreateUserRequest, user.CreateUserResponse](
			httpClient,
			baseURL+UserServiceCreateUserProcedure,
			opts...,
		),
		getUser: connect_go.NewClient[user.GetUserRequest, user.GetUserResponse](
			httpClient,
			baseURL+UserServiceGetUserProcedure,
			opts...,
		),
		updateUser: connect_go.NewClient[user.UpdateUserRequest, user.UpdateUserResponse](
			httpClient,
			baseURL+UserServiceUpdateUserProcedure,
			opts...,
		),
		deleteUser: connect_go.NewClient[user.DeleteUserRequest, user.DeleteUserResponse](
			httpClient,
			baseURL+UserServiceDeleteUserProcedure,
			opts...,
		),
		login: connect_go.NewClient[user.LoginRequest, user.LoginResponse](
			httpClient,
			baseURL+UserServiceLoginProcedure,
			opts...,
		),
	}
}

// userServiceClient implements UserServiceClient.
type userServiceClient struct {
	createUser *connect_go.Client[user.CreateUserRequest, user.CreateUserResponse]
	getUser    *connect_go.Client[user.GetUserRequest, user.GetUserResponse]
	updateUser *connect_go.Client[user.UpdateUserRequest, user.UpdateUserResponse]
	deleteUser *connect_go.Client[user.DeleteUserRequest, user.DeleteUserResponse]
	login      *connect_go.Client[user.LoginRequest, user.LoginResponse]
}

// CreateUser calls user.UserService.CreateUser.
func (c *userServiceClient) CreateUser(ctx context.Context, req *connect_go.Request[user.CreateUserRequest]) (*connect_go.Response[user.CreateUserResponse], error) {
	return c.createUser.CallUnary(ctx, req)
}

// GetUser calls user.UserService.GetUser.
func (c *userServiceClient) GetUser(ctx context.Context, req *connect_go.Request[user.GetUserRequest]) (*connect_go.Response[user.GetUserResponse], error) {
	return c.getUser.CallUnary(ctx, req)
}

// UpdateUser calls user.UserService.UpdateUser.
func (c *userServiceClient) UpdateUser(ctx context.Context, req *connect_go.Request[user.UpdateUserRequest]) (*connect_go.Response[user.UpdateUserResponse], error) {
	return c.updateUser.CallUnary(ctx, req)
}

// DeleteUser calls user.UserService.DeleteUser.
func (c *userServiceClient) DeleteUser(ctx context.Context, req *connect_go.Request[user.DeleteUserRequest]) (*connect_go.Response[user.DeleteUserResponse], error) {
	return c.deleteUser.CallUnary(ctx, req)
}

// Login calls user.UserService.Login.
func (c *userServiceClient) Login(ctx context.Context, req *connect_go.Request[user.LoginRequest]) (*connect_go.Response[user.LoginResponse], error) {
	return c.login.CallUnary(ctx, req)
}

// UserServiceHandler is an implementation of the user.UserService service.
type UserServiceHandler interface {
	CreateUser(context.Context, *connect_go.Request[user.CreateUserRequest]) (*connect_go.Response[user.CreateUserResponse], error)
	GetUser(context.Context, *connect_go.Request[user.GetUserRequest]) (*connect_go.Response[user.GetUserResponse], error)
	UpdateUser(context.Context, *connect_go.Request[user.UpdateUserRequest]) (*connect_go.Response[user.UpdateUserResponse], error)
	DeleteUser(context.Context, *connect_go.Request[user.DeleteUserRequest]) (*connect_go.Response[user.DeleteUserResponse], error)
	Login(context.Context, *connect_go.Request[user.LoginRequest]) (*connect_go.Response[user.LoginResponse], error)
}

// NewUserServiceHandler builds an HTTP handler from the service implementation. It returns the path
// on which to mount the handler and the handler itself.
//
// By default, handlers support the Connect, gRPC, and gRPC-Web protocols with the binary Protobuf
// and JSON codecs. They also support gzip compression.
func NewUserServiceHandler(svc UserServiceHandler, opts ...connect_go.HandlerOption) (string, http.Handler) {
	userServiceCreateUserHandler := connect_go.NewUnaryHandler(
		UserServiceCreateUserProcedure,
		svc.CreateUser,
		opts...,
	)
	userServiceGetUserHandler := connect_go.NewUnaryHandler(
		UserServiceGetUserProcedure,
		svc.GetUser,
		opts...,
	)
	userServiceUpdateUserHandler := connect_go.NewUnaryHandler(
		UserServiceUpdateUserProcedure,
		svc.UpdateUser,
		opts...,
	)
	userServiceDeleteUserHandler := connect_go.NewUnaryHandler(
		UserServiceDeleteUserProcedure,
		svc.DeleteUser,
		opts...,
	)
	userServiceLoginHandler := connect_go.NewUnaryHandler(
		UserServiceLoginProcedure,
		svc.Login,
		opts...,
	)
	return "/user.UserService/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case UserServiceCreateUserProcedure:
			userServiceCreateUserHandler.ServeHTTP(w, r)
		case UserServiceGetUserProcedure:
			userServiceGetUserHandler.ServeHTTP(w, r)
		case UserServiceUpdateUserProcedure:
			userServiceUpdateUserHandler.ServeHTTP(w, r)
		case UserServiceDeleteUserProcedure:
			userServiceDeleteUserHandler.ServeHTTP(w, r)
		case UserServiceLoginProcedure:
			userServiceLoginHandler.ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})
}

// UnimplementedUserServiceHandler returns CodeUnimplemented from all methods.
type UnimplementedUserServiceHandler struct{}

func (UnimplementedUserServiceHandler) CreateUser(context.Context, *connect_go.Request[user.CreateUserRequest]) (*connect_go.Response[user.CreateUserResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("user.UserService.CreateUser is not implemented"))
}

func (UnimplementedUserServiceHandler) GetUser(context.Context, *connect_go.Request[user.GetUserRequest]) (*connect_go.Response[user.GetUserResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("user.UserService.GetUser is not implemented"))
}

func (UnimplementedUserServiceHandler) UpdateUser(context.Context, *connect_go.Request[user.UpdateUserRequest]) (*connect_go.Response[user.UpdateUserResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("user.UserService.UpdateUser is not implemented"))
}

func (UnimplementedUserServiceHandler) DeleteUser(context.Context, *connect_go.Request[user.DeleteUserRequest]) (*connect_go.Response[user.DeleteUserResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("user.UserService.DeleteUser is not implemented"))
}

func (UnimplementedUserServiceHandler) Login(context.Context, *connect_go.Request[user.LoginRequest]) (*connect_go.Response[user.LoginResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("user.UserService.Login is not implemented"))
}
