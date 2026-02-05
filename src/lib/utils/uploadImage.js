// src/lib/utils/uploadImage.js

export async function uploadImage(file, folder) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);

  const res = await fetch('/api/uploads/image', {
    method: 'POST',
    body: fd,
    credentials: 'include'
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json(); // { url, path }
}
