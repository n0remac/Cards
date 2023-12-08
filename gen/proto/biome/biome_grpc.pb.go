// Code generated by protoc-gen-go-grpc. DO NOT EDIT.
// versions:
// - protoc-gen-go-grpc v1.2.0
// - protoc             (unknown)
// source: proto/biome/biome.proto

package biome

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
// Requires gRPC-Go v1.32.0 or later.
const _ = grpc.SupportPackageIsVersion7

// BiomeServiceClient is the client API for BiomeService service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type BiomeServiceClient interface {
	CreateBiome(ctx context.Context, in *CreateBiomeRequest, opts ...grpc.CallOption) (*CreateBiomeResponse, error)
	GetBiome(ctx context.Context, in *GetBiomeRequest, opts ...grpc.CallOption) (*GetBiomeResponse, error)
	GetBiomes(ctx context.Context, in *GetBiomesRequest, opts ...grpc.CallOption) (*GetBiomesResponse, error)
}

type biomeServiceClient struct {
	cc grpc.ClientConnInterface
}

func NewBiomeServiceClient(cc grpc.ClientConnInterface) BiomeServiceClient {
	return &biomeServiceClient{cc}
}

func (c *biomeServiceClient) CreateBiome(ctx context.Context, in *CreateBiomeRequest, opts ...grpc.CallOption) (*CreateBiomeResponse, error) {
	out := new(CreateBiomeResponse)
	err := c.cc.Invoke(ctx, "/biome.BiomeService/CreateBiome", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *biomeServiceClient) GetBiome(ctx context.Context, in *GetBiomeRequest, opts ...grpc.CallOption) (*GetBiomeResponse, error) {
	out := new(GetBiomeResponse)
	err := c.cc.Invoke(ctx, "/biome.BiomeService/GetBiome", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *biomeServiceClient) GetBiomes(ctx context.Context, in *GetBiomesRequest, opts ...grpc.CallOption) (*GetBiomesResponse, error) {
	out := new(GetBiomesResponse)
	err := c.cc.Invoke(ctx, "/biome.BiomeService/GetBiomes", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// BiomeServiceServer is the server API for BiomeService service.
// All implementations should embed UnimplementedBiomeServiceServer
// for forward compatibility
type BiomeServiceServer interface {
	CreateBiome(context.Context, *CreateBiomeRequest) (*CreateBiomeResponse, error)
	GetBiome(context.Context, *GetBiomeRequest) (*GetBiomeResponse, error)
	GetBiomes(context.Context, *GetBiomesRequest) (*GetBiomesResponse, error)
}

// UnimplementedBiomeServiceServer should be embedded to have forward compatible implementations.
type UnimplementedBiomeServiceServer struct {
}

func (UnimplementedBiomeServiceServer) CreateBiome(context.Context, *CreateBiomeRequest) (*CreateBiomeResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method CreateBiome not implemented")
}
func (UnimplementedBiomeServiceServer) GetBiome(context.Context, *GetBiomeRequest) (*GetBiomeResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetBiome not implemented")
}
func (UnimplementedBiomeServiceServer) GetBiomes(context.Context, *GetBiomesRequest) (*GetBiomesResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetBiomes not implemented")
}

// UnsafeBiomeServiceServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to BiomeServiceServer will
// result in compilation errors.
type UnsafeBiomeServiceServer interface {
	mustEmbedUnimplementedBiomeServiceServer()
}

func RegisterBiomeServiceServer(s grpc.ServiceRegistrar, srv BiomeServiceServer) {
	s.RegisterService(&BiomeService_ServiceDesc, srv)
}

func _BiomeService_CreateBiome_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(CreateBiomeRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(BiomeServiceServer).CreateBiome(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/biome.BiomeService/CreateBiome",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(BiomeServiceServer).CreateBiome(ctx, req.(*CreateBiomeRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _BiomeService_GetBiome_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetBiomeRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(BiomeServiceServer).GetBiome(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/biome.BiomeService/GetBiome",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(BiomeServiceServer).GetBiome(ctx, req.(*GetBiomeRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _BiomeService_GetBiomes_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetBiomesRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(BiomeServiceServer).GetBiomes(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/biome.BiomeService/GetBiomes",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(BiomeServiceServer).GetBiomes(ctx, req.(*GetBiomesRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// BiomeService_ServiceDesc is the grpc.ServiceDesc for BiomeService service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var BiomeService_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "biome.BiomeService",
	HandlerType: (*BiomeServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "CreateBiome",
			Handler:    _BiomeService_CreateBiome_Handler,
		},
		{
			MethodName: "GetBiome",
			Handler:    _BiomeService_GetBiome_Handler,
		},
		{
			MethodName: "GetBiomes",
			Handler:    _BiomeService_GetBiomes_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "proto/biome/biome.proto",
}