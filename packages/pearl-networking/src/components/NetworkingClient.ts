import { Entity } from 'pearl';
import Networking, { NetworkingSettings } from './Networking';
import {
  SnapshotMessage,
  RpcMessage,
  SnapshotMessageData,
  RpcMessageData,
  ServerMessage,
  ClientMessage,
  EntitySnapshot,
  EntityDestroyData,
} from '../messages';

// TODO: replace this with something better?
import PlayerInputter from '../util/PlayerInputter';
import NetworkedEntity from './NetworkedEntity';
import { ClientSession } from 'pearl-multiplayer-socket';

interface ConnectionOptions {
  groovejetUrl: string;
  roomCode: string;
}

type ConnectionState = 'connecting' | 'connected' | 'error' | 'closed';

export default class NetworkingClient extends Networking<NetworkingSettings> {
  isHost: false = false;
  connectionState: ConnectionState = 'connecting';
  errorReason?: string;

  private connection!: ClientSession;
  private snapshotClock = 0;
  private inputter?: PlayerInputter;

  create(settings: NetworkingSettings) {
    this.registerSettings(settings);
  }

  connect(connectionOptions: ConnectionOptions) {
    const connection = new ClientSession(connectionOptions.groovejetUrl);
    this.connection = connection;

    const promise = new Promise((resolve, reject) => {
      connection.onOpen = () => {
        this.onOpen();
        resolve();
      };
      connection.onMessage = this.onMessage.bind(this);
    });

    connection.connectRoom(connectionOptions.roomCode);

    return promise;
  }

  private onMessage(strData: any) {
    const msg = JSON.parse(strData) as ServerMessage;

    if (msg.type === 'snapshot') {
      this.onSnapshot(msg.data);
    } else if (msg.type === 'identity') {
      this.setIdentity(msg.data.id);
    } else if (msg.type === 'tooManyPlayers') {
      this.connectionState = 'error';
      this.errorReason = 'Room at max capacity';
    } else if (msg.type === 'rpc') {
      this.handleRpc(msg.data);
    } else if (msg.type === 'entityCreate') {
      this.onEntityCreate(msg.data);
    } else if (msg.type === 'entityDestroy') {
      this.onEntityDestroy(msg.data);
    }
    // else if (msg.type === 'ping') {
    // this.sendToHost({
    //   type: 'pong',
    // });
    // }
  }

  private onOpen() {
    this.connectionState = 'connected';

    this.inputter = new PlayerInputter({
      onKeyDown: (keyCode) => {
        this.sendToHost({
          type: 'keyDown',
          data: {
            keyCode,
          },
        });
      },
      onKeyUp: (keyCode) => {
        this.sendToHost({
          type: 'keyUp',
          data: {
            keyCode,
          },
        });
      },
    });

    this.inputter.registerLocalListeners();
  }

  private onClose() {
    this.connectionState = 'closed';
    if (this.inputter) {
      this.inputter.onKeyDown = () => {};
      this.inputter.onKeyUp = () => {};
    }
  }

  private sendToHost(msg: ClientMessage) {
    this.connection.send(JSON.stringify(msg));
  }

  private onEntityCreate(snapshot: EntitySnapshot) {
    const prefab = this.getPrefab(snapshot.type);
    this.instantiatePrefab(prefab, snapshot.id);
    this.deserializeEntity(snapshot);
  }

  private onEntityDestroy({ id }: EntityDestroyData) {
    this.pearl.entities.destroy(this.networkedEntities.get(id)!);
  }

  destroyNetworkedEntity(entity: Entity) {
    this.deregisterNetworkedEntity(entity);
  }

  private deserializeEntity(snapshot: EntitySnapshot) {
    const entity = this.networkedEntities.get(snapshot.id)!;

    entity
      .getComponent(NetworkedEntity)
      .clientDeserialize(snapshot.state, this.networkedEntities);

    if (snapshot.parentId) {
      const parent = this.networkedEntities.get(snapshot.parentId)!;
      // XXX: this is safe to do every frame since children is a set
      parent.appendChild(entity);
    }
  }

  private onSnapshot(snapshot: SnapshotMessageData) {
    const clock = snapshot.clock;
    if (clock < this.snapshotClock) {
      return;
    }
    this.snapshotClock = clock;

    for (let snapshotEntity of snapshot.entities) {
      this.deserializeEntity(snapshotEntity);
    }
  }

  private handleRpc(rpc: RpcMessageData) {
    const { entityId, componentName, methodName, args } = rpc;
    const entity = this.networkedEntities.get(entityId);

    if (!entity) {
      console.warn(
        `ignoring rpc for nonexistent entity ${entityId} -
        ${rpc.componentName}, ${rpc.methodName}`
      );
      return;
    }

    if (!methodName.startsWith('rpc')) {
      throw new Error(
        'refusing to allow rpc message to execute non-rpc method ' +
          `${componentName}.${methodName}`
      );
    }

    const component = entity.components.find(
      (component) => component.constructor.name === componentName
    );

    if (!component) {
      throw new Error(
        `missing component ${component} for rpc message ${methodName}`
      );
    }

    (component as any)[methodName](...args);
  }
}
