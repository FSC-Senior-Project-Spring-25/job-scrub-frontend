'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { getOrCreateChat, sendMessage } from '@/lib/firebase-messaging';
import { query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';

export default function NewMessagePopup({
    onCloseAction,
    onOpenChatAction,
  }: {
    onCloseAction: () => void;
    onOpenChatAction: (chatId: string) => void;
}) {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user?.email) return;
  
    const snapshot = await getDocs(collection(db, 'users'));
    const emails = snapshot.docs
    .map((doc) => doc.data())
    .filter((data) =>
    data.email &&
    data.email !== user.email &&
    data.isPrivate !== true 
  ) 
    .map((data) => data.email);
    setAllUsers(emails);
  };
  
    fetchUsers();
  }, [user?.email]);  
  

  const handleSend = async () => {
    if (!user?.email || !selectedUser || !message.trim()) return;

    const chatId = await getOrCreateChat(user.email, selectedUser);
    await sendMessage(chatId, user.email, message);

    onCloseAction();         // Close the popup
    onOpenChatAction(chatId); 
  };

  const filteredUsers = allUsers.filter((email) =>
    email.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg w-full max-w-sm p-4 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">New Message</h2>
          <button onClick={onCloseAction}>✕</button>
        </div>

        {!selectedUser ? (
          <>
            <input
              type="text"
              placeholder="Search email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map((email) => (
                <div
                  key={email}
                  onClick={() => setSelectedUser(email)}
                  className="cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
                >
                  {email}
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-gray-400 text-sm text-center">No users found</p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              To: <span className="font-semibold">{selectedUser}</span>
            </p>
            <textarea
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded p-2 text-sm h-24"
            />
            <button
              onClick={handleSend}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium"
            >
              Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}