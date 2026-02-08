const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}/api/v1${endpoint}`, config);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function uploadFile(
  endpoint: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("POST", `${API_BASE}/api/v1${endpoint}`);
    xhr.send(formData);
  });
}
