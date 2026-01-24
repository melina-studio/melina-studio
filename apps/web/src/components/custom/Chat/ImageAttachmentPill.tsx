import React, { useState } from "react";
import { ChatImageAttachment } from "@/lib/types";
import { X, Loader2 } from "lucide-react";
import ImagePreviewModal from "./ImagePreviewModal";

type ImageAttachmentPillProps = {
  attachment: ChatImageAttachment;
  isDark: boolean;
  onRemove: (id: string) => void;
};

const ImageAttachmentPill = ({ attachment, isDark, onRemove }: ImageAttachmentPillProps) => {
  const { id, file, previewUrl, status } = attachment;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Truncate filename to 12 chars
  const truncatedName =
    file.name.length > 12
      ? `${file.name.slice(0, 9)}...${file.name.slice(file.name.lastIndexOf("."))}`
      : file.name;

  const isLoading = status === "uploading";
  const isError = status === "error";

  return (
    <>
      <div
        className={`flex items-center gap-1.5 px-1 py-1 rounded-md shrink-0 text-xs cursor-pointer ${
          isError ? "ring-1 ring-red-500" : ""
        }`}
        style={{
          background: isDark ? "rgba(80, 80, 80, 0.8)" : "rgba(229, 231, 235, 0.8)",
        }}
        onClick={() => setIsPreviewOpen(true)}
      >
        <div className="relative w-5 h-5">
          <img
            src={previewUrl}
            alt={file.name}
            className="w-5 h-5 rounded-sm object-cover border border-gray-400 dark:border-gray-600"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
          )}
        </div>
        <span
          className={`${
            isError ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-300"
          }`}
          title={file.name}
        >
          {truncatedName}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
          disabled={isLoading}
        >
          <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewUrl}
        fileName={file.name}
      />
    </>
  );
};

export default ImageAttachmentPill;
