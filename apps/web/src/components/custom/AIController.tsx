import { SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import ChatMessage from './ChatMessage';

type Message = {
  role: 'human' | 'ai';
  content: string;
};

function AIController() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const text = e.target.message.value.trim();
    if (!text) return;

    // Add user message
    setMessages(msgs => [...msgs, { role: 'human', content: text }]);
    e.target.reset();
  };

  return (
    <div
      className="w-[320px] h-full p-4 rounded-xl shadow-2xl border overflow-y-auto flex flex-col backdrop-blur-xl"
      style={{
        background: isDark ? 'rgba(50, 51, 50, 0.5)' : 'rgba(220, 220, 220, 0)',
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        borderColor: isDark ? 'rgba(107, 114, 128, 0.3)' : 'rgba(209, 213, 219, 0.3)',
      }}
    >
      <h3
        className="text-lg text-center font-bold mb-4 sticky top-0 pb-2 border-b  bg-transparent"
        style={{
          fontFamily: '"DM Serif Text", serif',
        }}
      >
        Ask Melina
      </h3>
      <div className="flex-1 overflow-y-auto relative pb-16">
        {/* Messages container */}
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm mt-8">
              Start a conversation with Melina
            </div>
          ) : (
            messages.map((msg, i) => <ChatMessage key={i} role={msg.role} content={msg.content} />)
          )}
        </div>

        {/* text input */}
        <div
          className="absolute bottom-0 left-0 right-0 items-center flex border p-2 rounded-lg backdrop-blur-md"
          style={{
            background: isDark ? 'rgba(50, 51, 50, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'saturate(180%) blur(10px)',
            WebkitBackdropFilter: 'saturate(180%) blur(10px)',
            borderColor: isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(229, 231, 235, 0.5)',
          }}
        >
          <form onSubmit={handleSubmit} className="w-full">
            <input
              type="text"
              name="message"
              placeholder="Type your message here..."
              className="w-full outline-none text-sm"
            />
          </form>
          <SendHorizontal className="w-6 h-6 cursor-pointer" color="gray" onClick={handleSubmit} />
        </div>
      </div>
    </div>
  );
}

export default AIController;
