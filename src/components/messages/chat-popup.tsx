'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/auth-context';
import { formatDistanceToNow } from 'date-fns';
import NewMessagePopup from './new-message-popup';
import MessageThread from './message-thread';
import { MessageSquare } from 'lucide-react';

interface Chat {
  id: string;
  users: string[];
  lastMessage: string;
  updatedAt: any;
  unreadBy?: string[];
}

export default function ChatPopup() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [profileIcons, setProfileIcons] = useState<Record<string, string>>({});
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [showNewPopup, setShowNewPopup] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedChats, setArchivedChats] = useState<string[]>([]);
  const [deletedChats, setDeletedChats] = useState<string[]>([]);
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null); // 🆕 confirmation modal

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!user?.uid || !user?.email) return;

    const chatQuery = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.email),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(chatQuery, async (snapshot) => {
      const chatList: Chat[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const chat: Chat = {
          id: docSnap.id,
          users: data.users || [],
          lastMessage: data.lastMessage || '',
          updatedAt: data.updatedAt || null,
          unreadBy: data.unreadBy || [],
        };

        const otherUserEmail = chat.users.find((u) => u !== user.email);
        if (otherUserEmail && !profileIcons[otherUserEmail]) {
          const q = query(collection(db, 'users'), where('email', '==', otherUserEmail));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            profileIcons[otherUserEmail] = data.profileIcon || '';
          }
        }

        chatList.push(chat);
      }

      setChats(chatList);
    });

    loadHiddenChats();

    return () => unsub();
  }, [user?.email, user?.uid]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedInside = Object.values(menuRefs.current).some(
        (ref) => ref && ref.contains(event.target as Node)
      );
      if (!clickedInside) {
        setMenuOpenChatId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHiddenChats = async () => {
    const settingsRef = doc(db, 'users', user!.uid, 'chatSettings', 'hiddenChats');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data();
      setArchivedChats(data.archived || []);
      setDeletedChats(data.deleted || []);
    } else {
      await setDoc(settingsRef, { archived: [], deleted: [] });
    }
  };

  const showTemporaryMessage = (text: string) => {
    setStatusMessage(text);
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const archiveChat = async (chatId: string) => {
    const settingsRef = doc(db, 'users', user!.uid, 'chatSettings', 'hiddenChats');
    await updateDoc(settingsRef, {
      archived: arrayUnion(chatId),
    });
    setArchivedChats((prev) => [...prev, chatId]);
    setMenuOpenChatId(null);
    showTemporaryMessage('Chat archived');
  };

  const unarchiveChat = async (chatId: string) => {
    const settingsRef = doc(db, 'users', user!.uid, 'chatSettings', 'hiddenChats');
    await updateDoc(settingsRef, {
      archived: arrayRemove(chatId),
    });
    setArchivedChats((prev) => prev.filter((id) => id !== chatId));
    setMenuOpenChatId(null);
    showTemporaryMessage('Moved to Messages');
  };

  const deleteChat = async (chatId: string) => {
    setConfirmDeleteId(chatId);
  };

  const hasUnread = (chat: Chat) => {
    return chat.unreadBy?.includes(user?.email ?? '') ?? false;
  };

  const renderProfileIcon = (email: string) => {
    const icon = profileIcons[email];
    return (
      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-black text-xl font-semibold overflow-hidden">
        {icon || email.charAt(0).toUpperCase()}
      </div>
    );
  };

  const visibleChats = chats.filter((chat) => {
    if (deletedChats.includes(chat.id)) return false;
    if (showArchived) return archivedChats.includes(chat.id);
    return !archivedChats.includes(chat.id);
  });

  const hasAnyUnread = chats.some((chat) => hasUnread(chat));

  return (
    <>
      {/* Floating button */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-[9999] bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
        >
          <MessageSquare className="w-6 h-6" />
          {hasAnyUnread && (
            <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
          )}
        </button>
      ) : (
        <div className="fixed bottom-6 right-6 w-[320px] bg-white border shadow-xl rounded-lg z-[9999] p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Messages</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewPopup(true)}
                className="text-green-600 text-sm hover:underline"
              >
                + New
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-500 text-xl hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs text-green-700 hover:underline"
            >
              {showArchived ? 'Back to Messages' : 'Show Archived'}
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {visibleChats.length > 0 ? (
              visibleChats.map((chat) => {
                const otherUser = chat.users.find((u) => u !== user?.email) || '?';
                const time = chat.updatedAt?.toDate
                  ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true })
                  : '';

                return (
                  <div
                    key={chat.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition relative"
                  >
                    <div onClick={() => setOpenChatId(chat.id)} className="cursor-pointer">
                      {renderProfileIcon(otherUser)}
                    </div>
                    <div
                      onClick={async () => {
                        setOpenChatId(chat.id);
                        const chatRef = doc(db, 'chats', chat.id);
                        await updateDoc(chatRef, {
                          unreadBy: arrayRemove(user?.email ?? ''),
                        });
                      }}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="font-semibold truncate">{otherUser}</div>
                      <div className="text-xs text-gray-500 truncate">{chat.lastMessage}</div>
                      <div className="text-xs text-gray-400">{time}</div>
                    </div>

                    {hasUnread(chat) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-1" />
                    )}

                    <div className="relative" ref={(el) => { menuRefs.current[chat.id] = el; }}>
                      <button
                        onClick={() => setMenuOpenChatId((prev) => (prev === chat.id ? null : chat.id))}
                        className="text-gray-400 hover:text-black"
                      >
                        ⋮
                      </button>

                      {menuOpenChatId === chat.id && (
                        <div className="absolute right-0 mt-2 bg-white shadow-md rounded-lg overflow-hidden z-50 min-w-[150px]">
                          {showArchived ? (
                            <>
                              <button
                                onClick={() => unarchiveChat(chat.id)}
                                className="block px-4 py-2 text-sm text-green-700 hover:bg-gray-100 w-full text-left"
                              >
                                Move to Messages
                              </button>
                              <button
                                onClick={() => deleteChat(chat.id)}
                                className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => archiveChat(chat.id)}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Archive
                              </button>
                              <button
                                onClick={() => deleteChat(chat.id)}
                                className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 mt-6">
                {showArchived ? 'No archived chats.' : 'No messages yet.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Message */}
      {showNewPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-[9999] flex justify-center items-center">
          <div className="bg-white rounded-lg p-4 w-[350px] shadow-lg">
            <button onClick={() => setShowNewPopup(false)} className="text-gray-400 float-right">✕</button>
            <NewMessagePopup
              onCloseAction={() => setShowNewPopup(false)}
              onOpenChatAction={(chatId) => {
                setOpenChatId(chatId);
                setShowNewPopup(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Opened Chat Thread */}
      {openChatId && (
        <div className="fixed bottom-6 right-[350px] w-[320px] h-[480px] bg-white border shadow-xl rounded-lg z-[9999] flex flex-col">
          <div className="bg-green-100 p-3 flex justify-between items-center rounded-t">
            <span className="font-semibold">Chat</span>
            <button onClick={() => setOpenChatId(null)} className="text-gray-600 hover:text-red-600">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MessageThread chatId={openChatId} />
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="fixed bottom-4 right-6 bg-black text-white px-4 py-2 rounded shadow-md text-sm z-[9999] opacity-90 transition-opacity duration-300">
          {statusMessage}
        </div>
      )}

      {/* 🆕 Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-[9999]">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[300px]">
            <h3 className="text-lg font-semibold mb-3">Delete Chat</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this chat?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-black"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const settingsRef = doc(db, 'users', user!.uid, 'chatSettings', 'hiddenChats');
                  await updateDoc(settingsRef, {
                    deleted: arrayUnion(confirmDeleteId),
                  });
                  setDeletedChats((prev) => [...prev, confirmDeleteId]);
                  setConfirmDeleteId(null);
                  showTemporaryMessage('Chat deleted');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
