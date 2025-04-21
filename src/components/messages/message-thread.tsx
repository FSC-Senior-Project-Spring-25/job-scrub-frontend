'use client';

import { useEffect, useState } from 'react';
import { listenToMessages } from '@/lib/firebase-messaging';
import MessageInput from './message-input';
import { useAuth } from '@/app/auth-context';
import { message } from '@/types/message';
import { db } from '@/app/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Props {
  chatId: string;
}

interface userProfile {
  email: string;
  photoURL?: string;
}

export default function MessageThread({ chatId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = listenToMessages(chatId, setMessages);
    return () => unsubscribe();
  }, [chatId]);

  // Fetch all users once (email => photoURL map)
  useEffect(() => {
    const fetchProfiles = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const map: Record<string, string> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.email && data.photoURL) {
          map[data.email] = data.photoURL;
        }
      });
      setProfiles(map);
    };

    fetchProfiles();
  }, []);

  return (
    <div className="flex flex-col flex-1 justify-between p-2 h-full">
      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {messages.map((msg, i) => {
          const isSender = msg.sender === user?.email;
          const initials = msg.sender.charAt(0).toUpperCase();
  
          return (
            <div
              key={i}
              className={`flex items-end gap-2 ${
                isSender ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar for other user */}
              {!isSender && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold">
                  {initials}
                </div>
              )}
  
              {/* Message bubble */}
              <div
                className={`px-4 py-2 rounded-lg max-w-xs text-sm ${
                  isSender ? 'bg-green-200 text-black' : 'bg-gray-200 text-black'
                }`}
              >
                {msg.text}
              </div>
  
              {/* Avatar for current user */}
              {isSender && (
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>
  
      <MessageInput chatId={chatId} />
    </div>
  );
  
}
