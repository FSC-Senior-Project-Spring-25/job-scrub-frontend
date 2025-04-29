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
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

/**
 * Get or create a 1-on-1 chat between two users
 */
export const getOrCreateChat = async (email1: string, email2: string) => {
  const participants = [email1, email2].sort();

  const chatQuery = query(
    collection(db, 'chats'),
    where('users', '==', participants)
  );

  const snapshot = await getDocs(chatQuery);

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const chatRef = doc(collection(db, 'chats'));
  await setDoc(chatRef, {
    users: participants,
    lastMessage: '',
    updatedAt: serverTimestamp(),
    unreadBy: participants, // initially unread by both
  });

  return chatRef.id;
};

/**
 * Send a new message inside a chat
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

  // Get users in the chat to set unreadBy correctly
  const chatDoc = doc(db, 'chats', chatId);
  const chatSnapshot = await getDocs(query(collection(db, 'chats'), where('__name__', '==', chatId)));
  const chatData = chatSnapshot.docs[0]?.data();
  const recipients = chatData?.users?.filter((u: string) => u !== senderEmail) || [];

  await updateDoc(chatDoc, {
    lastMessage: text,
    updatedAt: serverTimestamp(),
    unreadBy: arrayUnion(...recipients),
  });
};

/**
 * Listen to messages in a chat
 */
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

/**
 * Listen to all user chats
 */
export const listenToChats = (userEmail: string, callback: (chats: any[]) => void) => {
  const q = query(collection(db, 'chats'), where('users', 'array-contains', userEmail));
  return onSnapshot(q, (snapshot) => {
    const chatList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(chatList);
  });
};
