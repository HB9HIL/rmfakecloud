import { ApiError, deleteDocument, upload } from "../../api";

const batchSize = 100;

export const accept = {
  "application/pdf": [".pdf"],
  "application/zip": [".zip", ".rmdoc"],
  "application/epub+zip": [".epub"],
};
export const maxSize = 1024 ** 3;
export const rejected = "Only PDF, EPUB and .rmdoc files up to 1 GB can be uploaded";

// for drops outside the dropzone, which filters by itself
export const accepted = (f: File) =>
  f.size <= maxSize && Object.values(accept).flat().some((ext) => f.name.toLowerCase().endsWith(ext));

export async function uploadInBatches(files: File[], folderId: string) {
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
