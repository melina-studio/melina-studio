export default function TypingLoader({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="typing-dot bg-gray-500/90 dark:bg-gray-200/90" />
      <span className="typing-dot typing-delay-1 bg-gray-500/90 dark:bg-gray-200/90" />
      <span className="typing-dot typing-delay-2 bg-gray-500/90 dark:bg-gray-200/90" />
    </div>
  );
}
