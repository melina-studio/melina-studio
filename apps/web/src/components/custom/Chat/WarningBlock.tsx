import { X } from 'lucide-react';

const WarningBlock = (
    {
        isDark,
        tokenStatus,
        setTokenStatus
    }: {
        isDark: boolean,
        tokenStatus: { type: "warning" | "blocked" | null, consumed: number, limit: number, remaining: number },
        setTokenStatus: (status: { type: "warning" | "blocked" | null, consumed: number, limit: number, remaining: number } | null) => void
    }
) => {
    return (
        <div
            className="flex items-center justify-between px-4 py-2 mb-2 rounded-md"
            style={{
                background: isDark
                    ? "rgba(40, 40, 40, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                border: `1px solid ${tokenStatus.type === "blocked"
                    ? "rgba(239, 68, 68, 0.5)"
                    : "rgba(234, 179, 8, 0.5)"
                    }`,
            }}
        >
            <span className="text-sm dark:text-gray-300 text-black">
                {tokenStatus.type === "blocked"
                    ? "You have consumed all your tokens"
                    : `${tokenStatus.remaining.toLocaleString()} tokens remaining`}
            </span>
            <div className="flex items-center gap-2">
                <button
                    className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    onClick={() => {
                        window.open("/playground/settings?tab=billing", "_blank");
                    }}
                >
                    Add credits
                </button>
                {tokenStatus.type === "warning" && (
                    <button
                        onClick={() => setTokenStatus(null)}
                        className="p-1 rounded hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    )
}

export default WarningBlock