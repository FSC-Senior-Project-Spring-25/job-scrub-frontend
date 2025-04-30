'use client';

import { useEffect, useState, useRef } from 'react';
import {
  doc,
  onSnapshot,
  addDoc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs,
  where,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/auth-context';

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: any;
  readBy?: string[];
}

export default function MessageThread({ chatId }: { chatId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [otherUserEmail, setOtherUserEmail] = useState<string | null>(null);
  const [otherUserProfileIcon, setOtherUserProfileIcon] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !user?.email) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatRef, async (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      const otherEmail = data.users.find((u: string) => u !== user.email);
      setOtherUserEmail(otherEmail || null);

      if (otherEmail) {
        const q = query(collection(db, 'users'), where('email', '==', otherEmail));
        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          setOtherUserProfileIcon(userData.profileIcon || null);
          setOtherUsername(userData.username || null);
        } else {
          setOtherUserProfileIcon(null);
          setOtherUsername(null);
        }
      } else {
        setOtherUserProfileIcon(null);
        setOtherUsername(null);
      }
    });

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const qMessages = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);

      // Mark all unread messages as seen when opening
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.sender !== user?.email && !(data.readBy || []).includes(user?.email)) {
          await updateDoc(doc(db, 'chats', chatId, 'messages', docSnap.id), {
            readBy: arrayUnion(user?.email),
          });
        }
      });
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
  
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    const chatData = chatSnap.data();
    const recipients = (chatData?.users || []).filter((email: string) => email !== user?.email);

    await addDoc(messagesRef, {
      text: input.trim(),
      sender: user.email,
      createdAt: serverTimestamp(),
      readBy: [],
      unreadBy: recipients, 
    });

  
    // Update the chat document with lastMessage and updatedAt
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: input.trim(),
      updatedAt: serverTimestamp(),
      unreadBy: arrayUnion(otherUserEmail),
    });
  
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-green-100 p-3 flex items-center gap-3 rounded-t">
        <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
          {otherUserProfileIcon ? (
            <span className="text-2xl">{otherUserProfileIcon}</span>
          ) : (
            <span className="text-white text-xl font-semibold">
              {otherUserEmail?.charAt(0).toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {otherUsername || otherUserEmail || 'Unknown User'}
          </span>
          <span className="text-xs text-gray-500">{otherUserEmail}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col">
        {messages.map((msg, index) => {
          const isSender = msg.sender === user?.email;
          const isLastSent = isSender && index === messages.length - 1;
          const hasSeenAll =
            isLastSent && otherUserEmail && (msg.readBy || []).includes(otherUserEmail);

          return (
            <div
              key={msg.id}
              className={`relative w-fit px-4 py-2 rounded-2xl text-sm leading-tight ${
                isSender
                  ? 'bg-green-400 text-white self-end ml-auto'
                  : 'bg-gray-200 text-black'
              }`}
              style={{
                maxWidth: '85%',
                alignSelf: isSender ? 'flex-end' : 'flex-start',
                marginTop: '4px',
              }}
            >
              <div>{msg.text}</div>

              {/* Seen indicator */}
              {hasSeenAll && (
                <div className="absolute right-1 -bottom-5 text-[11px] text-gray-400">
                  Seen
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-green-300"
        />
        <button
          onClick={sendMessage}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
