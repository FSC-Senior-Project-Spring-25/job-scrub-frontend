import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
  addDoc,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

/**
 * Creates or returns a 1-on-1 chat between two users by email.
 */
export const getOrCreateChat = async (email1: string, email2: string) => {
  const participants = [email1, email2].sort(); // ✅ Prevent duplicates by sorting

  // Query for existing chat between these users
  const chatQuery = query(
    collection(db, 'chats'),
    where('users', '==', participants)
  );

  const snapshot = await getDocs(chatQuery);

  if (!snapshot.empty) {
    return snapshot.docs[0].id; // Chat already exists
  }

  // Create new chat
  const chatRef = doc(collection(db, 'chats'));
  await setDoc(chatRef, {
    users: participants,
    lastMessage: '',
    updatedAt: serverTimestamp(),
  });

  return chatRef.id;
};

/**
 * Sends a new message inside a given chat
 */
export const sendMessage = async (
  chatId: string,
  senderEmail: string,
  text: string
) => {
  const messageRef = collection(db, 'chats', chatId, 'messages');

  await addDoc(messageRef, {
    sender: senderEmail,
    text,
    createdAt: serverTimestamp(),
  });

  // Update parent chat with last message
  await setDoc(
    doc(db, 'chats', chatId),
    {
      lastMessage: text,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};


export const listenToMessages = (
  chatId: string,
  callback: (messages: any[]) => void
) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
};
