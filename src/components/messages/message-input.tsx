'use client';

import { useState } from 'react';
import { sendMessage } from '../../lib/firebase-messaging';
import { useAuth } from '@/app/auth-context';

interface props {
  chatId: string;
}

export default function MessageInput({ chatId }: props) {
  const { user } = useAuth();
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim()) return;
    console.log("📤 Sending as:", user?.email);// checking log in 
    await sendMessage(chatId, user?.email!, text);
    setText('');
  };

  return (
    <div className="p-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        className="flex-1 px-3 py-1 border rounded text-sm"
        placeholder="Type a message..."
      />
      <button
        onClick={handleSend}
        className="text-sm px-2 py-1 bg-green-500 text-white rounded"
      >
        Send
      </button>
    </div>
  );
}
