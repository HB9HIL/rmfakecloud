import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { BsCloudUpload } from "react-icons/bs";
import { toast } from "react-toastify";

import { ApiError, deleteDocument, upload } from "../../api";
import { Spinner } from "../../components/ui";

const batchSize = 100;

async function uploadInBatches(files: File[], folderId: string) {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    try {
      await upload(folderId, batch);
    } catch (e) {
      // a document with the same name exists already
      const docId = e instanceof ApiError && e.status === 409 && (e.body as { docId?: string })?.docId;
      if (!docId) throw e;
      if (!window.confirm(`${(e as Error).message}\n\nOverwrite?`)) return;
      await deleteDocument(docId);
      await upload(folderId, batch);
    }
  }
}

type Props = { folderId: string; onUploaded: () => void };

export default function Upload({ folderId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  async function onDrop(files: File[]) {
    setUploading(true);
    try {
      await uploadInBatches(files, folderId);
      onUploaded();
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/zip": [".zip", ".rmdoc"],
      "application/epub+zip": [".epub"],
    },
    onDropAccepted: onDrop,
    maxSize: 1024 ** 3,
    disabled: uploading,
  });

  const state =
    isDragReject ? "border-danger text-danger"
    : isDragAccept ? "border-accent bg-accent/5 text-ink"
    : "border-line hover:border-muted";

  return (
    <div
      {...getRootProps({
        className: `my-4 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-5 text-center text-sm text-muted transition-colors ${state}`,
      })}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Spinner label="Uploading…" />
      ) : (
        <>
          <BsCloudUpload aria-hidden className="size-6" />
          <p>Drop PDF, EPUB or .rmdoc files here, or click to choose</p>
        </>
      )}
    </div>
  );
}
