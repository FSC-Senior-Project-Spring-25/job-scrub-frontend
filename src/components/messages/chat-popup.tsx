'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/auth-context';
import MessageThread from './message-thread';
import NewMessagePopup from './new-message-popup';
import { formatDistanceToNow } from 'date-fns';


interface Chat {
  id: string;
  users: string[];
  lastMessage: string;
  updatedAt: any;
}

interface OpenChat {
  id: string;
  minimized: boolean;
}

export default function ChatPopup() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [showNewPopup, setShowNewPopup] = useState(false);
  const [isMessagesMinimized, setIsMessagesMinimized] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, boolean>>({});
  const lastReadRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.email),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Chat, 'id'>),
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user?.email]);

  const handleOpenChat = (chatId: string) => {
    setOpenChats((prev) => {
      if (prev.find((c) => c.id === chatId)) {
        return prev.map((c) =>
          c.id === chatId ? { ...c, minimized: false } : c
        );
      }
      return [...prev, { id: chatId, minimized: false }];
    });

    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });

    lastReadRef.current[chatId] = Date.now();
  };

  const handleCloseChat = (chatId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== chatId));
  };

  const renderInitial = (email: string) => (
    <div className="min-w-8 min-h-8 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
      {email?.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <>
      {/* Your Messages Panel */}
      {!isMessagesMinimized ? (
        <div className="fixed bottom-4 right-4 w-[320px] h-[500px] z-50 bg-white rounded shadow-lg border flex flex-col">
          <div className="bg-green-200 p-2 flex justify-between items-center">
            <span className="font-bold">Your Messages</span>
            <div className="flex gap-2">
              <button onClick={() => setShowNewPopup(true)}>✏️</button>
              <button onClick={() => setIsMessagesMinimized(true)}>−</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chats.length > 0 ? (
              chats.map((chat) => {
                const otherUser = chat.users.find((u) => u !== user?.email);
                const unread = unreadCounts[chat.id];

                return (
                  <div
                    key={chat.id} //FIXED
                    onClick={() => handleOpenChat(chat.id)}
                    className="p-3 border-b hover:bg-gray-100 cursor-pointer flex items-center gap-3 relative"
                  >
                    {renderInitial(otherUser || '?')}
                    
                  <div className="flex-1">
                    <div className="font-semibold">{otherUser}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {chat.lastMessage || 'No messages yet'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {chat.updatedAt?.toDate ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true }) : ''}
                    </div>
                  </div>

                    {unread && (
                      <div className="w-2 h-2 rounded-full bg-green-500 absolute top-3 right-3"></div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-400">No messages yet</div>
            )}
          </div>

          {showNewPopup && (
            <NewMessagePopup
              onCloseAction={() => setShowNewPopup(false)}
              onOpenChatAction={(chatId) => {
                handleOpenChat(chatId);
                setShowNewPopup(false);
              }}
            />
          )}
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsMessagesMinimized(false)}
            className="bg-green-500 text-white px-4 py-2 rounded shadow"
          >
            💬 Messages
          </button>
        </div>
      )}

      {/* Open Chats */}
      {openChats.map((chat, index) => {
        const chatData = chats.find((c) => c.id === chat.id);
        const otherUser = chatData?.users.find((u) => u !== user?.email);

        return (
          <div
            key={chat.id}
            className="fixed bottom-4 z-50 w-[320px] h-[500px] bg-white shadow-lg border rounded flex flex-col"
            style={{ right: `${340 + index * 340}px` }}
          >
            <div className="bg-green-100 p-2 flex justify-between items-center">
              <span className="font-bold">{otherUser}</span>
              <div className="flex gap-2">
                <button onClick={() => handleCloseChat(chat.id)}>✕</button>
              </div>
            </div>
            {!chat.minimized && <MessageThread chatId={chat.id} />}
          </div>
        );
      })}
    </>
  );
}
