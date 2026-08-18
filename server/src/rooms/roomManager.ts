import type { Server as IOServer } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { Room } from "./room";
import { generateRoomCode } from "../utils/roomCode";

const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

type IO = IOServer<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private io: IO) {
    setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref();
  }

  create(): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room = new Room(code, this.io);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.isEmpty() && now - room.lastActivityAt > EMPTY_ROOM_TTL_MS) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }
}
