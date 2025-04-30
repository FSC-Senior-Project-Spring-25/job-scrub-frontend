'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { getOrCreateChat, sendMessage } from '@/lib/firebase-messaging';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface UserInfo {
  email: string;
  isPrivate?: boolean;
  profileIcon?: string;
}

export default function NewMessagePopup({
  onCloseAction,
  onOpenChatAction,
}: {
  onCloseAction: () => void;
  onOpenChatAction: (chatId: string) => void;
}) {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid || !user.email) return;
  
      // Get all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs
        .map((doc) => doc.data() as UserInfo)
        .filter((u) => u.email && u.email !== user.email);
  
      // Get following
      const followSnap = await getDocs(collection(db, 'users', user.uid, 'following'));
      const followingList = followSnap.docs.map((doc) => doc.data() as UserInfo);
  
      // 🔧 Enrich following with full user info (e.g., profileIcon, username)
      const enrichedFollowing = followingList
        .map((follow) => users.find((u) => u.email === follow.email))
        .filter(Boolean) as UserInfo[];
  
      setAllUsers(users);
      setFollowing(enrichedFollowing);
    };
  
    fetchData();
  }, [user?.uid, user?.email]);
  

  const handleSend = async () => {
    if (!user?.email || !selectedUser || !message.trim() || selectedUser.isPrivate) return;
    const chatId = await getOrCreateChat(user.email, selectedUser.email);
    await sendMessage(chatId, user.email, message);
    onCloseAction();
    onOpenChatAction(chatId);
  };

  const filteredUsers =
    searchText.length > 0
      ? allUsers.filter((u) => u.email.toLowerCase().includes(searchText.toLowerCase()))
      : [];

  const UserItem = ({ userData }: { userData: UserInfo }) => (
    <div
      key={userData.email}
      onClick={() => setSelectedUser(userData)}
      className="cursor-pointer px-2 py-2 hover:bg-gray-100 rounded flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-full bg-gray-200 text-center flex items-center justify-center text-lg font-medium text-gray-600 shrink-0">
        {userData.profileIcon || userData.email.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-900">{userData.email}</span>
    </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg w-full max-w-sm p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">New Message</h2>
          <button onClick={onCloseAction} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>

        {!selectedUser ? (
          <>
            <input
              type="text"
              placeholder="Search by email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm mb-2"
            />

            <div className="max-h-60 overflow-y-auto">
              {searchText ? (
                <>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((userData) => (
                      <UserItem key={userData.email} userData={userData} />
                    ))
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-4">No users found</p>
                  )}
                </>
              ) : (
                <>
                  {following.length > 0 ? (
                    <>
                      <p className="text-xs text-green-700 font-semibold mb-2 ml-2 pt-1">You follow</p>
                      {following.map((userData) => (
                        <UserItem key={userData.email} userData={userData} />
                      ))}
                    </>
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-4">No following</p>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm mb-2">
              To: <span className="font-semibold">{selectedUser.email}</span>
            </div>

            {selectedUser.isPrivate ? (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded">
                This user is private. You cannot send a message.
              </div>
            ) : (
              <>
                <textarea
                  className="w-full border rounded p-2 text-sm h-24 mb-2"
                  placeholder="Write your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium"
                  onClick={handleSend}
                >
                  Send
                </button>
              </>
            )}

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full text-center text-xs text-gray-500 mt-2 hover:underline"
            >
              ← Back to search
            </button>
          </>
        )}
      </div>
    </div>
  );
}
