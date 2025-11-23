import { Bot } from 'lucide-react';
import { useTheme } from 'next-themes';

type MessageProps = {
  role: 'human' | 'ai';
  content: string;
};

function ChatMessage({ role, content }: MessageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isHuman = role === 'human';

  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex items-end gap-2 max-w-[85%] ${isHuman ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar - only for AI */}
        {!isHuman && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
            <Bot className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isHuman
              ? 'text-white rounded-br-sm bg-gradient-to-br from-blue-300 via-indigo-500 to-purple-900'
              : isDark
              ? 'bg-gray-700/80 text-white rounded-bl-sm'
              : 'bg-gray-200/80 text-gray-900 rounded-bl-sm'
          }`}
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
