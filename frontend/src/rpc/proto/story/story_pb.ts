// @generated by protoc-gen-es v1.4.2 with parameter "target=ts"
// @generated from file proto/story/story.proto (package story, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage } from "@bufbuild/protobuf";
import { Message, proto3 } from "@bufbuild/protobuf";

/**
 * Define the Scene message
 *
 * @generated from message story.Scene
 */
export class Scene extends Message<Scene> {
  /**
   * Unique identifier for each scene
   *
   * @generated from field: string id = 1;
   */
  id = "";

  /**
   * @generated from field: string scene = 2;
   */
  scene = "";

  /**
   * JSON string for examples
   *
   * @generated from field: string examples = 3;
   */
  examples = "";

  constructor(data?: PartialMessage<Scene>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.Scene";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "scene", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "examples", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Scene {
    return new Scene().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Scene {
    return new Scene().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Scene {
    return new Scene().fromJsonString(jsonString, options);
  }

  static equals(a: Scene | PlainMessage<Scene> | undefined, b: Scene | PlainMessage<Scene> | undefined): boolean {
    return proto3.util.equals(Scene, a, b);
  }
}

/**
 * @generated from message story.GetScenesRequest
 */
export class GetScenesRequest extends Message<GetScenesRequest> {
  constructor(data?: PartialMessage<GetScenesRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.GetScenesRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): GetScenesRequest {
    return new GetScenesRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): GetScenesRequest {
    return new GetScenesRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): GetScenesRequest {
    return new GetScenesRequest().fromJsonString(jsonString, options);
  }

  static equals(a: GetScenesRequest | PlainMessage<GetScenesRequest> | undefined, b: GetScenesRequest | PlainMessage<GetScenesRequest> | undefined): boolean {
    return proto3.util.equals(GetScenesRequest, a, b);
  }
}

/**
 * @generated from message story.GetScenesResponse
 */
export class GetScenesResponse extends Message<GetScenesResponse> {
  /**
   * @generated from field: repeated story.Scene scenes = 1;
   */
  scenes: Scene[] = [];

  constructor(data?: PartialMessage<GetScenesResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.GetScenesResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "scenes", kind: "message", T: Scene, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): GetScenesResponse {
    return new GetScenesResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): GetScenesResponse {
    return new GetScenesResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): GetScenesResponse {
    return new GetScenesResponse().fromJsonString(jsonString, options);
  }

  static equals(a: GetScenesResponse | PlainMessage<GetScenesResponse> | undefined, b: GetScenesResponse | PlainMessage<GetScenesResponse> | undefined): boolean {
    return proto3.util.equals(GetScenesResponse, a, b);
  }
}

/**
 * Request and response messages for CreateScene
 *
 * @generated from message story.CreateSceneRequest
 */
export class CreateSceneRequest extends Message<CreateSceneRequest> {
  /**
   * @generated from field: story.Scene scene = 1;
   */
  scene?: Scene;

  constructor(data?: PartialMessage<CreateSceneRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.CreateSceneRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "scene", kind: "message", T: Scene },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CreateSceneRequest {
    return new CreateSceneRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CreateSceneRequest {
    return new CreateSceneRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CreateSceneRequest {
    return new CreateSceneRequest().fromJsonString(jsonString, options);
  }

  static equals(a: CreateSceneRequest | PlainMessage<CreateSceneRequest> | undefined, b: CreateSceneRequest | PlainMessage<CreateSceneRequest> | undefined): boolean {
    return proto3.util.equals(CreateSceneRequest, a, b);
  }
}

/**
 * @generated from message story.CreateSceneResponse
 */
export class CreateSceneResponse extends Message<CreateSceneResponse> {
  /**
   * @generated from field: story.Scene scene = 1;
   */
  scene?: Scene;

  constructor(data?: PartialMessage<CreateSceneResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.CreateSceneResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "scene", kind: "message", T: Scene },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CreateSceneResponse {
    return new CreateSceneResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CreateSceneResponse {
    return new CreateSceneResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CreateSceneResponse {
    return new CreateSceneResponse().fromJsonString(jsonString, options);
  }

  static equals(a: CreateSceneResponse | PlainMessage<CreateSceneResponse> | undefined, b: CreateSceneResponse | PlainMessage<CreateSceneResponse> | undefined): boolean {
    return proto3.util.equals(CreateSceneResponse, a, b);
  }
}

/**
 * Request and response messages for GetScene
 *
 * @generated from message story.GetSceneRequest
 */
export class GetSceneRequest extends Message<GetSceneRequest> {
  /**
   * @generated from field: string id = 1;
   */
  id = "";

  constructor(data?: PartialMessage<GetSceneRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.GetSceneRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): GetSceneRequest {
    return new GetSceneRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): GetSceneRequest {
    return new GetSceneRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): GetSceneRequest {
    return new GetSceneRequest().fromJsonString(jsonString, options);
  }

  static equals(a: GetSceneRequest | PlainMessage<GetSceneRequest> | undefined, b: GetSceneRequest | PlainMessage<GetSceneRequest> | undefined): boolean {
    return proto3.util.equals(GetSceneRequest, a, b);
  }
}

/**
 * @generated from message story.GetSceneResponse
 */
export class GetSceneResponse extends Message<GetSceneResponse> {
  /**
   * @generated from field: story.Scene scene = 1;
   */
  scene?: Scene;

  constructor(data?: PartialMessage<GetSceneResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.GetSceneResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "scene", kind: "message", T: Scene },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): GetSceneResponse {
    return new GetSceneResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): GetSceneResponse {
    return new GetSceneResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): GetSceneResponse {
    return new GetSceneResponse().fromJsonString(jsonString, options);
  }

  static equals(a: GetSceneResponse | PlainMessage<GetSceneResponse> | undefined, b: GetSceneResponse | PlainMessage<GetSceneResponse> | undefined): boolean {
    return proto3.util.equals(GetSceneResponse, a, b);
  }
}

/**
 * Request and response messages for UpdateScene
 *
 * @generated from message story.UpdateSceneRequest
 */
export class UpdateSceneRequest extends Message<UpdateSceneRequest> {
  /**
   * @generated from field: story.Scene scene = 1;
   */
  scene?: Scene;

  constructor(data?: PartialMessage<UpdateSceneRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.UpdateSceneRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "scene", kind: "message", T: Scene },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UpdateSceneRequest {
    return new UpdateSceneRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UpdateSceneRequest {
    return new UpdateSceneRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UpdateSceneRequest {
    return new UpdateSceneRequest().fromJsonString(jsonString, options);
  }

  static equals(a: UpdateSceneRequest | PlainMessage<UpdateSceneRequest> | undefined, b: UpdateSceneRequest | PlainMessage<UpdateSceneRequest> | undefined): boolean {
    return proto3.util.equals(UpdateSceneRequest, a, b);
  }
}

/**
 * @generated from message story.UpdateSceneResponse
 */
export class UpdateSceneResponse extends Message<UpdateSceneResponse> {
  /**
   * @generated from field: story.Scene scene = 1;
   */
  scene?: Scene;

  constructor(data?: PartialMessage<UpdateSceneResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.UpdateSceneResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "scene", kind: "message", T: Scene },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UpdateSceneResponse {
    return new UpdateSceneResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UpdateSceneResponse {
    return new UpdateSceneResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UpdateSceneResponse {
    return new UpdateSceneResponse().fromJsonString(jsonString, options);
  }

  static equals(a: UpdateSceneResponse | PlainMessage<UpdateSceneResponse> | undefined, b: UpdateSceneResponse | PlainMessage<UpdateSceneResponse> | undefined): boolean {
    return proto3.util.equals(UpdateSceneResponse, a, b);
  }
}

/**
 * Request and response messages for DeleteScene
 *
 * @generated from message story.DeleteSceneRequest
 */
export class DeleteSceneRequest extends Message<DeleteSceneRequest> {
  /**
   * @generated from field: string id = 1;
   */
  id = "";

  constructor(data?: PartialMessage<DeleteSceneRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.DeleteSceneRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): DeleteSceneRequest {
    return new DeleteSceneRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): DeleteSceneRequest {
    return new DeleteSceneRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): DeleteSceneRequest {
    return new DeleteSceneRequest().fromJsonString(jsonString, options);
  }

  static equals(a: DeleteSceneRequest | PlainMessage<DeleteSceneRequest> | undefined, b: DeleteSceneRequest | PlainMessage<DeleteSceneRequest> | undefined): boolean {
    return proto3.util.equals(DeleteSceneRequest, a, b);
  }
}

/**
 * Optionally include a status or confirmation message
 *
 * @generated from message story.DeleteSceneResponse
 */
export class DeleteSceneResponse extends Message<DeleteSceneResponse> {
  constructor(data?: PartialMessage<DeleteSceneResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "story.DeleteSceneResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): DeleteSceneResponse {
    return new DeleteSceneResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): DeleteSceneResponse {
    return new DeleteSceneResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): DeleteSceneResponse {
    return new DeleteSceneResponse().fromJsonString(jsonString, options);
  }

  static equals(a: DeleteSceneResponse | PlainMessage<DeleteSceneResponse> | undefined, b: DeleteSceneResponse | PlainMessage<DeleteSceneResponse> | undefined): boolean {
    return proto3.util.equals(DeleteSceneResponse, a, b);
  }
}

