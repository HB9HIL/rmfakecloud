// url of a document or folder, the root is plain /documents
export function docPath(id: string) {
  return id === "root" ? "/documents" : `/documents/${id}`;
}
