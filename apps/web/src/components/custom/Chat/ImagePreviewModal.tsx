import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ImagePreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
};

const ImagePreviewModal = ({ isOpen, onClose, imageUrl, fileName }: ImagePreviewModalProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use portal to render modal outside the chat component hierarchy
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Image */}
        <img src={imageUrl} alt={fileName} className="max-w-[90vw] max-h-[85vh] object-contain" />

        {/* Filename */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-4 py-2 text-white text-sm truncate">
          {fileName}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImagePreviewModal;
