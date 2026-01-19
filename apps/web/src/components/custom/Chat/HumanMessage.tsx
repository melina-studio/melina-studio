type HumanMessageProps = {
  content: string;
};

function HumanMessage({ content }: HumanMessageProps) {
  return (
    <div className="flex justify-end mb-1 transition-all duration-200 ease-out">
      <div className="flex items-end gap-2 max-w-[85%] flex-row-reverse transition-all duration-200 ease-out">
        {/* Message bubble */}
        <div
          className="px-4 py-2 rounded-xl rounded-br-sm text-white bg-gradient-to-br from-blue-300 via-indigo-500 to-purple-900 transition-all duration-200 ease-out overflow-hidden"
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            className="text-sm leading-relaxed break-words overflow-wrap-anywhere"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HumanMessage;
