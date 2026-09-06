export interface RemoteUser {
  id: string;
  socketId?: string;
  name: string;
  color?: string;
  joinedAt?: string;
}

export interface RoomSyncState {
  roomId: string;
  code: string;
  language: string;
  users: RemoteUser[];
  lastUpdated: string;
}
