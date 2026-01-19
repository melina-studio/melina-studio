import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatImageAttachment } from "@/lib/types";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS = 5;

type ValidationError = {
  file: File;
  reason: string;
};

export function useImageAttachments() {
  const [attachments, setAttachments] = useState<ChatImageAttachment[]>([]);

  const validateFile = useCallback(
    (file: File): ValidationError | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return {
          file,
          reason: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP`,
        };
      }
      if (file.size > MAX_FILE_SIZE) {
        return {
          file,
          reason: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`,
        };
      }
      return null;
    },
    []
  );

  const addFiles = useCallback(
    (files: FileList | File[]): ValidationError[] => {
      const fileArray = Array.from(files);
      const errors: ValidationError[] = [];
      const validFiles: File[] = [];

      // Check how many more we can add
      const remainingSlots = MAX_ATTACHMENTS - attachments.length;
      if (remainingSlots <= 0) {
        return [
          {
            file: fileArray[0],
            reason: `Maximum ${MAX_ATTACHMENTS} images allowed`,
          },
        ];
      }

      // Validate each file
      for (const file of fileArray.slice(0, remainingSlots)) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      // Warn if some files were skipped due to limit
      if (fileArray.length > remainingSlots) {
        errors.push({
          file: fileArray[remainingSlots],
          reason: `Only ${remainingSlots} more image(s) can be added (max ${MAX_ATTACHMENTS})`,
        });
      }

      // Add valid files as attachments
      if (validFiles.length > 0) {
        const newAttachments: ChatImageAttachment[] = validFiles.map(
          (file) => ({
            id: uuidv4(),
            file,
            previewUrl: URL.createObjectURL(file),
            status: "pending" as const,
          })
        );
        setAttachments((prev) => [...prev, ...newAttachments]);
      }

      return errors;
    },
    [attachments.length, validateFile]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
  }, []);

  const updateAttachmentStatus = useCallback(
    (
      id: string,
      status: ChatImageAttachment["status"],
      uploadedUrl?: string
    ) => {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status, ...(uploadedUrl && { uploadedUrl }) } : a
        )
      );
    },
    []
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return [];

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        return addFiles(imageFiles);
      }
      return [];
    },
    [addFiles]
  );

  const hasAttachments = attachments.length > 0;
  const hasPendingUploads = attachments.some(
    (a) => a.status === "pending" || a.status === "uploading"
  );
  const allUploaded = attachments.every((a) => a.status === "uploaded");
  const getUploadedUrls = useCallback(
    () =>
      attachments
        .filter((a) => a.status === "uploaded" && a.uploadedUrl)
        .map((a) => a.uploadedUrl as string),
    [attachments]
  );

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    updateAttachmentStatus,
    handlePaste,
    hasAttachments,
    hasPendingUploads,
    allUploaded,
    getUploadedUrls,
  };
}
