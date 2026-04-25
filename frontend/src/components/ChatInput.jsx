import React, { useState } from 'react';

const ChatInput = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() === '') return;
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-lg border-t border-[#E5E7EB]">
      <div className="flex gap-md items-end">
        <div className="flex-1 relative">
          <textarea 
            className="w-full border border-[#E5E7EB] rounded-xl p-md focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none resize-none text-body-sm" 
            placeholder="Type your event request here..." 
            rows="2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
        </div>
        <button 
          onClick={handleSend}
          className="bg-[#3B82F6] text-white px-lg py-md rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>Send</span>
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
