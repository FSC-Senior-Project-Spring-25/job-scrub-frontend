import { Timestamp } from 'firebase/firestore';

export interface chat {
  id?: string;
  users: string[];
  lastMessage: string;
  updatedAt: Timestamp;
}
