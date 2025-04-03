import { Timestamp } from 'firebase/firestore';

export interface message {
  id?: string;          // Optional not sure yet helpful when mapping messages
  text: string;
  sender: string;       
  createdAt: Timestamp; 
  senderPhotoURL?: string; // Optional for displaying sender's photo if available
}
