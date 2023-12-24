// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.32.0
// 	protoc        (unknown)
// source: proto/card/card.proto

package card

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type GenerateCardsRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	Count  int32  `protobuf:"varint,2,opt,name=count,proto3" json:"count,omitempty"`
}

func (x *GenerateCardsRequest) Reset() {
	*x = GenerateCardsRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *GenerateCardsRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GenerateCardsRequest) ProtoMessage() {}

func (x *GenerateCardsRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GenerateCardsRequest.ProtoReflect.Descriptor instead.
func (*GenerateCardsRequest) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{0}
}

func (x *GenerateCardsRequest) GetUserId() string {
	if x != nil {
		return x.UserId
	}
	return ""
}

func (x *GenerateCardsRequest) GetCount() int32 {
	if x != nil {
		return x.Count
	}
	return 0
}

type GenerateCardsResponse struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Cards []*Card `protobuf:"bytes,1,rep,name=cards,proto3" json:"cards,omitempty"`
}

func (x *GenerateCardsResponse) Reset() {
	*x = GenerateCardsResponse{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *GenerateCardsResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GenerateCardsResponse) ProtoMessage() {}

func (x *GenerateCardsResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GenerateCardsResponse.ProtoReflect.Descriptor instead.
func (*GenerateCardsResponse) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{1}
}

func (x *GenerateCardsResponse) GetCards() []*Card {
	if x != nil {
		return x.Cards
	}
	return nil
}

type DeleteCardRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	CardId int32  `protobuf:"varint,2,opt,name=card_id,json=cardId,proto3" json:"card_id,omitempty"`
}

func (x *DeleteCardRequest) Reset() {
	*x = DeleteCardRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *DeleteCardRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*DeleteCardRequest) ProtoMessage() {}

func (x *DeleteCardRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use DeleteCardRequest.ProtoReflect.Descriptor instead.
func (*DeleteCardRequest) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{2}
}

func (x *DeleteCardRequest) GetUserId() string {
	if x != nil {
		return x.UserId
	}
	return ""
}

func (x *DeleteCardRequest) GetCardId() int32 {
	if x != nil {
		return x.CardId
	}
	return 0
}

type DeleteCardResponse struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	CardId int32 `protobuf:"varint,1,opt,name=card_id,json=cardId,proto3" json:"card_id,omitempty"`
}

func (x *DeleteCardResponse) Reset() {
	*x = DeleteCardResponse{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[3]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *DeleteCardResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*DeleteCardResponse) ProtoMessage() {}

func (x *DeleteCardResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[3]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use DeleteCardResponse.ProtoReflect.Descriptor instead.
func (*DeleteCardResponse) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{3}
}

func (x *DeleteCardResponse) GetCardId() int32 {
	if x != nil {
		return x.CardId
	}
	return 0
}

type GetCardsRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
}

func (x *GetCardsRequest) Reset() {
	*x = GetCardsRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[4]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *GetCardsRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetCardsRequest) ProtoMessage() {}

func (x *GetCardsRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[4]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetCardsRequest.ProtoReflect.Descriptor instead.
func (*GetCardsRequest) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{4}
}

func (x *GetCardsRequest) GetUserId() string {
	if x != nil {
		return x.UserId
	}
	return ""
}

type GetCardsResponse struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Cards []*Card `protobuf:"bytes,1,rep,name=cards,proto3" json:"cards,omitempty"`
}

func (x *GetCardsResponse) Reset() {
	*x = GetCardsResponse{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[5]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *GetCardsResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetCardsResponse) ProtoMessage() {}

func (x *GetCardsResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[5]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use GetCardsResponse.ProtoReflect.Descriptor instead.
func (*GetCardsResponse) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{5}
}

func (x *GetCardsResponse) GetCards() []*Card {
	if x != nil {
		return x.Cards
	}
	return nil
}

type NewCardRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	UserId string `protobuf:"bytes,1,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	Card   *Card  `protobuf:"bytes,2,opt,name=card,proto3" json:"card,omitempty"`
}

func (x *NewCardRequest) Reset() {
	*x = NewCardRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[6]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *NewCardRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*NewCardRequest) ProtoMessage() {}

func (x *NewCardRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[6]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use NewCardRequest.ProtoReflect.Descriptor instead.
func (*NewCardRequest) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{6}
}

func (x *NewCardRequest) GetUserId() string {
	if x != nil {
		return x.UserId
	}
	return ""
}

func (x *NewCardRequest) GetCard() *Card {
	if x != nil {
		return x.Card
	}
	return nil
}

type NewCardResponse struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Card *Card `protobuf:"bytes,1,opt,name=card,proto3" json:"card,omitempty"`
}

func (x *NewCardResponse) Reset() {
	*x = NewCardResponse{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[7]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *NewCardResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*NewCardResponse) ProtoMessage() {}

func (x *NewCardResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[7]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use NewCardResponse.ProtoReflect.Descriptor instead.
func (*NewCardResponse) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{7}
}

func (x *NewCardResponse) GetCard() *Card {
	if x != nil {
		return x.Card
	}
	return nil
}

type CreateCardRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Card   *Card  `protobuf:"bytes,1,opt,name=card,proto3" json:"card,omitempty"`
	Prompt string `protobuf:"bytes,2,opt,name=prompt,proto3" json:"prompt,omitempty"`
}

func (x *CreateCardRequest) Reset() {
	*x = CreateCardRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[8]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *CreateCardRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*CreateCardRequest) ProtoMessage() {}

func (x *CreateCardRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[8]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use CreateCardRequest.ProtoReflect.Descriptor instead.
func (*CreateCardRequest) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{8}
}

func (x *CreateCardRequest) GetCard() *Card {
	if x != nil {
		return x.Card
	}
	return nil
}

func (x *CreateCardRequest) GetPrompt() string {
	if x != nil {
		return x.Prompt
	}
	return ""
}

type CreateCardResponse struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Card *Card `protobuf:"bytes,1,opt,name=card,proto3" json:"card,omitempty"`
}

func (x *CreateCardResponse) Reset() {
	*x = CreateCardResponse{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[9]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *CreateCardResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*CreateCardResponse) ProtoMessage() {}

func (x *CreateCardResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[9]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use CreateCardResponse.ProtoReflect.Descriptor instead.
func (*CreateCardResponse) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{9}
}

func (x *CreateCardResponse) GetCard() *Card {
	if x != nil {
		return x.Card
	}
	return nil
}

type Card struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Id          int32  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
	Name        string `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
	Biome       string `protobuf:"bytes,3,opt,name=biome,proto3" json:"biome,omitempty"`
	Element     string `protobuf:"bytes,4,opt,name=element,proto3" json:"element,omitempty"`
	Animal      string `protobuf:"bytes,5,opt,name=animal,proto3" json:"animal,omitempty"`
	Description string `protobuf:"bytes,6,opt,name=description,proto3" json:"description,omitempty"`
	ImgUrl      string `protobuf:"bytes,7,opt,name=img_url,json=imgUrl,proto3" json:"img_url,omitempty"`
}

func (x *Card) Reset() {
	*x = Card{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[10]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Card) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Card) ProtoMessage() {}

func (x *Card) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[10]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Card.ProtoReflect.Descriptor instead.
func (*Card) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{10}
}

func (x *Card) GetId() int32 {
	if x != nil {
		return x.Id
	}
	return 0
}

func (x *Card) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Card) GetBiome() string {
	if x != nil {
		return x.Biome
	}
	return ""
}

func (x *Card) GetElement() string {
	if x != nil {
		return x.Element
	}
	return ""
}

func (x *Card) GetAnimal() string {
	if x != nil {
		return x.Animal
	}
	return ""
}

func (x *Card) GetDescription() string {
	if x != nil {
		return x.Description
	}
	return ""
}

func (x *Card) GetImgUrl() string {
	if x != nil {
		return x.ImgUrl
	}
	return ""
}

type CardTemplate struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Template     string   `protobuf:"bytes,1,opt,name=template,proto3" json:"template,omitempty"`
	Animals      []string `protobuf:"bytes,2,rep,name=animals,proto3" json:"animals,omitempty"`
	Elements     []string `protobuf:"bytes,3,rep,name=elements,proto3" json:"elements,omitempty"`
	Descriptions []string `protobuf:"bytes,4,rep,name=descriptions,proto3" json:"descriptions,omitempty"`
}

func (x *CardTemplate) Reset() {
	*x = CardTemplate{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[11]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *CardTemplate) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*CardTemplate) ProtoMessage() {}

func (x *CardTemplate) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[11]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use CardTemplate.ProtoReflect.Descriptor instead.
func (*CardTemplate) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{11}
}

func (x *CardTemplate) GetTemplate() string {
	if x != nil {
		return x.Template
	}
	return ""
}

func (x *CardTemplate) GetAnimals() []string {
	if x != nil {
		return x.Animals
	}
	return nil
}

func (x *CardTemplate) GetElements() []string {
	if x != nil {
		return x.Elements
	}
	return nil
}

func (x *CardTemplate) GetDescriptions() []string {
	if x != nil {
		return x.Descriptions
	}
	return nil
}

type CreateCardTemplateRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	CardTemplate *CardTemplate `protobuf:"bytes,1,opt,name=card_template,json=cardTemplate,proto3" json:"card_template,omitempty"`
	Biome        string        `protobuf:"bytes,2,opt,name=biome,proto3" json:"biome,omitempty"`
}

func (x *CreateCardTemplateRequest) Reset() {
	*x = CreateCardTemplateRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[12]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *CreateCardTemplateRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*CreateCardTemplateRequest) ProtoMessage() {}

func (x *CreateCardTemplateRequest) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[12]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use CreateCardTemplateRequest.ProtoReflect.Descriptor instead.
func (*CreateCardTemplateRequest) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{12}
}

func (x *CreateCardTemplateRequest) GetCardTemplate() *CardTemplate {
	if x != nil {
		return x.CardTemplate
	}
	return nil
}

func (x *CreateCardTemplateRequest) GetBiome() string {
	if x != nil {
		return x.Biome
	}
	return ""
}

type CreateCardTemplateResponse struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	CardTemplate *CardTemplate `protobuf:"bytes,1,opt,name=card_template,json=cardTemplate,proto3" json:"card_template,omitempty"`
}

func (x *CreateCardTemplateResponse) Reset() {
	*x = CreateCardTemplateResponse{}
	if protoimpl.UnsafeEnabled {
		mi := &file_proto_card_card_proto_msgTypes[13]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *CreateCardTemplateResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*CreateCardTemplateResponse) ProtoMessage() {}

func (x *CreateCardTemplateResponse) ProtoReflect() protoreflect.Message {
	mi := &file_proto_card_card_proto_msgTypes[13]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use CreateCardTemplateResponse.ProtoReflect.Descriptor instead.
func (*CreateCardTemplateResponse) Descriptor() ([]byte, []int) {
	return file_proto_card_card_proto_rawDescGZIP(), []int{13}
}

func (x *CreateCardTemplateResponse) GetCardTemplate() *CardTemplate {
	if x != nil {
		return x.CardTemplate
	}
	return nil
}

var File_proto_card_card_proto protoreflect.FileDescriptor

var file_proto_card_card_proto_rawDesc = []byte{
	0x0a, 0x15, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x2f, 0x63, 0x61, 0x72, 0x64, 0x2f, 0x63, 0x61, 0x72,
	0x64, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x04, 0x63, 0x61, 0x72, 0x64, 0x22, 0x45, 0x0a,
	0x14, 0x47, 0x65, 0x6e, 0x65, 0x72, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65,
	0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x17, 0x0a, 0x07, 0x75, 0x73, 0x65, 0x72, 0x5f, 0x69, 0x64,
	0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x75, 0x73, 0x65, 0x72, 0x49, 0x64, 0x12, 0x14,
	0x0a, 0x05, 0x63, 0x6f, 0x75, 0x6e, 0x74, 0x18, 0x02, 0x20, 0x01, 0x28, 0x05, 0x52, 0x05, 0x63,
	0x6f, 0x75, 0x6e, 0x74, 0x22, 0x39, 0x0a, 0x15, 0x47, 0x65, 0x6e, 0x65, 0x72, 0x61, 0x74, 0x65,
	0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x20, 0x0a,
	0x05, 0x63, 0x61, 0x72, 0x64, 0x73, 0x18, 0x01, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x0a, 0x2e, 0x63,
	0x61, 0x72, 0x64, 0x2e, 0x43, 0x61, 0x72, 0x64, 0x52, 0x05, 0x63, 0x61, 0x72, 0x64, 0x73, 0x22,
	0x45, 0x0a, 0x11, 0x44, 0x65, 0x6c, 0x65, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x71,
	0x75, 0x65, 0x73, 0x74, 0x12, 0x17, 0x0a, 0x07, 0x75, 0x73, 0x65, 0x72, 0x5f, 0x69, 0x64, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x75, 0x73, 0x65, 0x72, 0x49, 0x64, 0x12, 0x17, 0x0a,
	0x07, 0x63, 0x61, 0x72, 0x64, 0x5f, 0x69, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x05, 0x52, 0x06,
	0x63, 0x61, 0x72, 0x64, 0x49, 0x64, 0x22, 0x2d, 0x0a, 0x12, 0x44, 0x65, 0x6c, 0x65, 0x74, 0x65,
	0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x17, 0x0a, 0x07,
	0x63, 0x61, 0x72, 0x64, 0x5f, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52, 0x06, 0x63,
	0x61, 0x72, 0x64, 0x49, 0x64, 0x22, 0x2a, 0x0a, 0x0f, 0x47, 0x65, 0x74, 0x43, 0x61, 0x72, 0x64,
	0x73, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x17, 0x0a, 0x07, 0x75, 0x73, 0x65, 0x72,
	0x5f, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x75, 0x73, 0x65, 0x72, 0x49,
	0x64, 0x22, 0x34, 0x0a, 0x10, 0x47, 0x65, 0x74, 0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65, 0x73,
	0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x20, 0x0a, 0x05, 0x63, 0x61, 0x72, 0x64, 0x73, 0x18, 0x01,
	0x20, 0x03, 0x28, 0x0b, 0x32, 0x0a, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x61, 0x72, 0x64,
	0x52, 0x05, 0x63, 0x61, 0x72, 0x64, 0x73, 0x22, 0x49, 0x0a, 0x0e, 0x4e, 0x65, 0x77, 0x43, 0x61,
	0x72, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x17, 0x0a, 0x07, 0x75, 0x73, 0x65,
	0x72, 0x5f, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x75, 0x73, 0x65, 0x72,
	0x49, 0x64, 0x12, 0x1e, 0x0a, 0x04, 0x63, 0x61, 0x72, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b,
	0x32, 0x0a, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x61, 0x72, 0x64, 0x52, 0x04, 0x63, 0x61,
	0x72, 0x64, 0x22, 0x31, 0x0a, 0x0f, 0x4e, 0x65, 0x77, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x73,
	0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x1e, 0x0a, 0x04, 0x63, 0x61, 0x72, 0x64, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x0a, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x61, 0x72, 0x64, 0x52,
	0x04, 0x63, 0x61, 0x72, 0x64, 0x22, 0x4b, 0x0a, 0x11, 0x43, 0x72, 0x65, 0x61, 0x74, 0x65, 0x43,
	0x61, 0x72, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x1e, 0x0a, 0x04, 0x63, 0x61,
	0x72, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x0a, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e,
	0x43, 0x61, 0x72, 0x64, 0x52, 0x04, 0x63, 0x61, 0x72, 0x64, 0x12, 0x16, 0x0a, 0x06, 0x70, 0x72,
	0x6f, 0x6d, 0x70, 0x74, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x70, 0x72, 0x6f, 0x6d,
	0x70, 0x74, 0x22, 0x34, 0x0a, 0x12, 0x43, 0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64,
	0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x1e, 0x0a, 0x04, 0x63, 0x61, 0x72, 0x64,
	0x18, 0x01, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x0a, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x61,
	0x72, 0x64, 0x52, 0x04, 0x63, 0x61, 0x72, 0x64, 0x22, 0xad, 0x01, 0x0a, 0x04, 0x43, 0x61, 0x72,
	0x64, 0x12, 0x0e, 0x0a, 0x02, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52, 0x02, 0x69,
	0x64, 0x12, 0x12, 0x0a, 0x04, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x04, 0x6e, 0x61, 0x6d, 0x65, 0x12, 0x14, 0x0a, 0x05, 0x62, 0x69, 0x6f, 0x6d, 0x65, 0x18, 0x03,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x62, 0x69, 0x6f, 0x6d, 0x65, 0x12, 0x18, 0x0a, 0x07, 0x65,
	0x6c, 0x65, 0x6d, 0x65, 0x6e, 0x74, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x65, 0x6c,
	0x65, 0x6d, 0x65, 0x6e, 0x74, 0x12, 0x16, 0x0a, 0x06, 0x61, 0x6e, 0x69, 0x6d, 0x61, 0x6c, 0x18,
	0x05, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x61, 0x6e, 0x69, 0x6d, 0x61, 0x6c, 0x12, 0x20, 0x0a,
	0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x06, 0x20, 0x01,
	0x28, 0x09, 0x52, 0x0b, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x12,
	0x17, 0x0a, 0x07, 0x69, 0x6d, 0x67, 0x5f, 0x75, 0x72, 0x6c, 0x18, 0x07, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x06, 0x69, 0x6d, 0x67, 0x55, 0x72, 0x6c, 0x22, 0x84, 0x01, 0x0a, 0x0c, 0x43, 0x61, 0x72,
	0x64, 0x54, 0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74, 0x65, 0x12, 0x1a, 0x0a, 0x08, 0x74, 0x65, 0x6d,
	0x70, 0x6c, 0x61, 0x74, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x08, 0x74, 0x65, 0x6d,
	0x70, 0x6c, 0x61, 0x74, 0x65, 0x12, 0x18, 0x0a, 0x07, 0x61, 0x6e, 0x69, 0x6d, 0x61, 0x6c, 0x73,
	0x18, 0x02, 0x20, 0x03, 0x28, 0x09, 0x52, 0x07, 0x61, 0x6e, 0x69, 0x6d, 0x61, 0x6c, 0x73, 0x12,
	0x1a, 0x0a, 0x08, 0x65, 0x6c, 0x65, 0x6d, 0x65, 0x6e, 0x74, 0x73, 0x18, 0x03, 0x20, 0x03, 0x28,
	0x09, 0x52, 0x08, 0x65, 0x6c, 0x65, 0x6d, 0x65, 0x6e, 0x74, 0x73, 0x12, 0x22, 0x0a, 0x0c, 0x64,
	0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x18, 0x04, 0x20, 0x03, 0x28,
	0x09, 0x52, 0x0c, 0x64, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x22,
	0x6a, 0x0a, 0x19, 0x43, 0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d,
	0x70, 0x6c, 0x61, 0x74, 0x65, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x37, 0x0a, 0x0d,
	0x63, 0x61, 0x72, 0x64, 0x5f, 0x74, 0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74, 0x65, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x12, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x61, 0x72, 0x64, 0x54,
	0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74, 0x65, 0x52, 0x0c, 0x63, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d,
	0x70, 0x6c, 0x61, 0x74, 0x65, 0x12, 0x14, 0x0a, 0x05, 0x62, 0x69, 0x6f, 0x6d, 0x65, 0x18, 0x02,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x62, 0x69, 0x6f, 0x6d, 0x65, 0x22, 0x55, 0x0a, 0x1a, 0x43,
	0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74,
	0x65, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x37, 0x0a, 0x0d, 0x63, 0x61, 0x72,
	0x64, 0x5f, 0x74, 0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74, 0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0b,
	0x32, 0x12, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d, 0x70,
	0x6c, 0x61, 0x74, 0x65, 0x52, 0x0c, 0x63, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d, 0x70, 0x6c, 0x61,
	0x74, 0x65, 0x32, 0xa5, 0x03, 0x0a, 0x0b, 0x43, 0x61, 0x72, 0x64, 0x53, 0x65, 0x72, 0x76, 0x69,
	0x63, 0x65, 0x12, 0x39, 0x0a, 0x08, 0x47, 0x65, 0x74, 0x43, 0x61, 0x72, 0x64, 0x73, 0x12, 0x15,
	0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x47, 0x65, 0x74, 0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65,
	0x71, 0x75, 0x65, 0x73, 0x74, 0x1a, 0x16, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x47, 0x65, 0x74,
	0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x36, 0x0a,
	0x07, 0x4e, 0x65, 0x77, 0x43, 0x61, 0x72, 0x64, 0x12, 0x14, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e,
	0x4e, 0x65, 0x77, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x1a, 0x15,
	0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x4e, 0x65, 0x77, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x73,
	0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x3f, 0x0a, 0x0a, 0x44, 0x65, 0x6c, 0x65, 0x74, 0x65, 0x43,
	0x61, 0x72, 0x64, 0x12, 0x17, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x44, 0x65, 0x6c, 0x65, 0x74,
	0x65, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x1a, 0x18, 0x2e, 0x63,
	0x61, 0x72, 0x64, 0x2e, 0x44, 0x65, 0x6c, 0x65, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65,
	0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x48, 0x0a, 0x0d, 0x47, 0x65, 0x6e, 0x65, 0x72, 0x61,
	0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x73, 0x12, 0x1a, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x47,
	0x65, 0x6e, 0x65, 0x72, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65, 0x71, 0x75,
	0x65, 0x73, 0x74, 0x1a, 0x1b, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x47, 0x65, 0x6e, 0x65, 0x72,
	0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x73, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65,
	0x12, 0x57, 0x0a, 0x12, 0x43, 0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x54, 0x65,
	0x6d, 0x70, 0x6c, 0x61, 0x74, 0x65, 0x12, 0x1f, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x72,
	0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74, 0x65,
	0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x1a, 0x20, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43,
	0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x54, 0x65, 0x6d, 0x70, 0x6c, 0x61, 0x74,
	0x65, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x3f, 0x0a, 0x0a, 0x43, 0x72, 0x65,
	0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x12, 0x17, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43,
	0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61, 0x72, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74,
	0x1a, 0x18, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x2e, 0x43, 0x72, 0x65, 0x61, 0x74, 0x65, 0x43, 0x61,
	0x72, 0x64, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x42, 0x5b, 0x0a, 0x08, 0x63, 0x6f,
	0x6d, 0x2e, 0x63, 0x61, 0x72, 0x64, 0x42, 0x09, 0x43, 0x61, 0x72, 0x64, 0x50, 0x72, 0x6f, 0x74,
	0x6f, 0x50, 0x01, 0x5a, 0x14, 0x63, 0x61, 0x72, 0x64, 0x73, 0x2f, 0x67, 0x65, 0x6e, 0x2f, 0x70,
	0x72, 0x6f, 0x74, 0x6f, 0x2f, 0x63, 0x61, 0x72, 0x64, 0xa2, 0x02, 0x03, 0x43, 0x58, 0x58, 0xaa,
	0x02, 0x04, 0x43, 0x61, 0x72, 0x64, 0xca, 0x02, 0x04, 0x43, 0x61, 0x72, 0x64, 0xe2, 0x02, 0x10,
	0x43, 0x61, 0x72, 0x64, 0x5c, 0x47, 0x50, 0x42, 0x4d, 0x65, 0x74, 0x61, 0x64, 0x61, 0x74, 0x61,
	0xea, 0x02, 0x04, 0x43, 0x61, 0x72, 0x64, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_proto_card_card_proto_rawDescOnce sync.Once
	file_proto_card_card_proto_rawDescData = file_proto_card_card_proto_rawDesc
)

func file_proto_card_card_proto_rawDescGZIP() []byte {
	file_proto_card_card_proto_rawDescOnce.Do(func() {
		file_proto_card_card_proto_rawDescData = protoimpl.X.CompressGZIP(file_proto_card_card_proto_rawDescData)
	})
	return file_proto_card_card_proto_rawDescData
}

var file_proto_card_card_proto_msgTypes = make([]protoimpl.MessageInfo, 14)
var file_proto_card_card_proto_goTypes = []interface{}{
	(*GenerateCardsRequest)(nil),       // 0: card.GenerateCardsRequest
	(*GenerateCardsResponse)(nil),      // 1: card.GenerateCardsResponse
	(*DeleteCardRequest)(nil),          // 2: card.DeleteCardRequest
	(*DeleteCardResponse)(nil),         // 3: card.DeleteCardResponse
	(*GetCardsRequest)(nil),            // 4: card.GetCardsRequest
	(*GetCardsResponse)(nil),           // 5: card.GetCardsResponse
	(*NewCardRequest)(nil),             // 6: card.NewCardRequest
	(*NewCardResponse)(nil),            // 7: card.NewCardResponse
	(*CreateCardRequest)(nil),          // 8: card.CreateCardRequest
	(*CreateCardResponse)(nil),         // 9: card.CreateCardResponse
	(*Card)(nil),                       // 10: card.Card
	(*CardTemplate)(nil),               // 11: card.CardTemplate
	(*CreateCardTemplateRequest)(nil),  // 12: card.CreateCardTemplateRequest
	(*CreateCardTemplateResponse)(nil), // 13: card.CreateCardTemplateResponse
}
var file_proto_card_card_proto_depIdxs = []int32{
	10, // 0: card.GenerateCardsResponse.cards:type_name -> card.Card
	10, // 1: card.GetCardsResponse.cards:type_name -> card.Card
	10, // 2: card.NewCardRequest.card:type_name -> card.Card
	10, // 3: card.NewCardResponse.card:type_name -> card.Card
	10, // 4: card.CreateCardRequest.card:type_name -> card.Card
	10, // 5: card.CreateCardResponse.card:type_name -> card.Card
	11, // 6: card.CreateCardTemplateRequest.card_template:type_name -> card.CardTemplate
	11, // 7: card.CreateCardTemplateResponse.card_template:type_name -> card.CardTemplate
	4,  // 8: card.CardService.GetCards:input_type -> card.GetCardsRequest
	6,  // 9: card.CardService.NewCard:input_type -> card.NewCardRequest
	2,  // 10: card.CardService.DeleteCard:input_type -> card.DeleteCardRequest
	0,  // 11: card.CardService.GenerateCards:input_type -> card.GenerateCardsRequest
	12, // 12: card.CardService.CreateCardTemplate:input_type -> card.CreateCardTemplateRequest
	8,  // 13: card.CardService.CreateCard:input_type -> card.CreateCardRequest
	5,  // 14: card.CardService.GetCards:output_type -> card.GetCardsResponse
	7,  // 15: card.CardService.NewCard:output_type -> card.NewCardResponse
	3,  // 16: card.CardService.DeleteCard:output_type -> card.DeleteCardResponse
	1,  // 17: card.CardService.GenerateCards:output_type -> card.GenerateCardsResponse
	13, // 18: card.CardService.CreateCardTemplate:output_type -> card.CreateCardTemplateResponse
	9,  // 19: card.CardService.CreateCard:output_type -> card.CreateCardResponse
	14, // [14:20] is the sub-list for method output_type
	8,  // [8:14] is the sub-list for method input_type
	8,  // [8:8] is the sub-list for extension type_name
	8,  // [8:8] is the sub-list for extension extendee
	0,  // [0:8] is the sub-list for field type_name
}

func init() { file_proto_card_card_proto_init() }
func file_proto_card_card_proto_init() {
	if File_proto_card_card_proto != nil {
		return
	}
	if !protoimpl.UnsafeEnabled {
		file_proto_card_card_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*GenerateCardsRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*GenerateCardsResponse); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*DeleteCardRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[3].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*DeleteCardResponse); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[4].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*GetCardsRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[5].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*GetCardsResponse); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[6].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*NewCardRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[7].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*NewCardResponse); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[8].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*CreateCardRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[9].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*CreateCardResponse); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[10].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Card); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[11].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*CardTemplate); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[12].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*CreateCardTemplateRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_proto_card_card_proto_msgTypes[13].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*CreateCardTemplateResponse); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_proto_card_card_proto_rawDesc,
			NumEnums:      0,
			NumMessages:   14,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_proto_card_card_proto_goTypes,
		DependencyIndexes: file_proto_card_card_proto_depIdxs,
		MessageInfos:      file_proto_card_card_proto_msgTypes,
	}.Build()
	File_proto_card_card_proto = out.File
	file_proto_card_card_proto_rawDesc = nil
	file_proto_card_card_proto_goTypes = nil
	file_proto_card_card_proto_depIdxs = nil
}
