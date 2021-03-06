interface BaseMessage {
  type: string;
  data?: any;
}

export interface RpcMessageData {
  entityId: string;
  componentName: string;
  methodName: string;
  args: any[];
}

export interface RpcMessage extends BaseMessage {
  type: 'rpc';
  data: RpcMessageData;
}

export interface EntitySnapshot {
  id: string;
  type: string;
  state: any;
  parentId: string | undefined;
}

export interface SnapshotMessageData {
  entities: EntitySnapshot[];
  clock: number;
}

export interface SnapshotMessage extends BaseMessage {
  type: 'snapshot';
  data: SnapshotMessageData;
}

export interface TooManyPlayersMessage extends BaseMessage {
  type: 'tooManyPlayers';
}

export interface EntityCreateMessage extends BaseMessage {
  type: 'entityCreate';
  data: EntitySnapshot;
}

export interface EntityDestroyData {
  id: string;
}

export interface EntityDestroyMessage extends BaseMessage {
  type: 'entityDestroy';
  data: EntityDestroyData;
}

export interface InitialSnapshotMessage extends BaseMessage {
  type: 'initialSnapshot';
  data: SnapshotMessageData;
}

export type ServerMessage =
  | RpcMessage
  | SnapshotMessage
  | TooManyPlayersMessage
  | EntityCreateMessage
  | EntityDestroyMessage
  | InitialSnapshotMessage;

export interface InputKeyMessageData {
  keyCode: number;
}

export interface InputKeyDownMessage extends BaseMessage {
  type: 'keyDown';
  data: InputKeyMessageData;
}

export interface InputKeyUpMessage extends BaseMessage {
  type: 'keyUp';
  data: InputKeyMessageData;
}

export type ClientMessage = InputKeyDownMessage | InputKeyUpMessage;
