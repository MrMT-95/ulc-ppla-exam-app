declare var google: any;

export interface SyncData {
  correct_answers: Record<string, boolean>;
  incorrect_answers: Record<string, boolean>;
  bookmarks: Record<string, boolean>;
  exams_history: any[];
  last_updated: number;
}

export function requestGoogleToken(clientId: string, onSuccess: (token: string) => void, onError?: (err: any) => void) {
  if (typeof google === "undefined") {
    if (onError) onError("Google SDK not loaded yet.");
    return;
  }

  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email",
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          onSuccess(tokenResponse.access_token);
        } else if (tokenResponse.error) {
          if (onError) onError(tokenResponse.error);
        }
      },
    });
    client.requestAccessToken();
  } catch (err) {
    if (onError) onError(err);
  }
}

export async function fetchGoogleUserInfo(token: string): Promise<{ email: string } | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { email: data.email };
  } catch (err) {
    console.error("Error fetching Google user info:", err);
    return null;
  }
}

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

export async function findProgressFile(token: string): Promise<string | null> {
  try {
    const query = encodeURIComponent("name = 'ppla_progress.json' and 'appDataFolder' in parents and trashed = false");
    const res = await fetch(`${DRIVE_FILES_URL}?q=${query}&spaces=appDataFolder`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error("Error searching progress file in Google Drive:", err);
    return null;
  }
}

export async function downloadProgressFile(token: string, fileId: string): Promise<SyncData | null> {
  try {
    const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error downloading file from Google Drive:", err);
    return null;
  }
}

export async function createProgressFile(token: string, content: SyncData): Promise<string | null> {
  try {
    const metadata = {
      name: "ppla_progress.json",
      parents: ["appDataFolder"],
    };

    const boundary = "314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--\r\n`;

    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(content) +
      closeDelimiter;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error("Error creating progress file in Google Drive:", err);
    return null;
  }
}

export async function updateProgressFile(token: string, fileId: string, content: SyncData): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(content),
    });
    return res.ok;
  } catch (err) {
    console.error("Error updating progress file in Google Drive:", err);
    return false;
  }
}

export function mergeProgress(local: SyncData, cloud: SyncData): SyncData {
  const merged: SyncData = {
    correct_answers: { ...cloud.correct_answers, ...local.correct_answers },
    incorrect_answers: { ...cloud.incorrect_answers, ...local.incorrect_answers },
    bookmarks: { ...cloud.bookmarks, ...local.bookmarks },
    exams_history: [],
    last_updated: Date.now(),
  };

  // Clean up incorrect answers that are now marked correct in the merged set
  Object.keys(merged.correct_answers).forEach(id => {
    if (merged.correct_answers[id]) {
      delete merged.incorrect_answers[id];
    }
  });

  // Merge exam history by ID deduplication
  const localHistory = local.exams_history || [];
  const cloudHistory = cloud.exams_history || [];
  const historyMap = new Map<string, any>();

  localHistory.forEach(item => {
    if (item.id) historyMap.set(item.id, item);
  });
  cloudHistory.forEach(item => {
    if (item.id) historyMap.set(item.id, item);
  });

  merged.exams_history = Array.from(historyMap.values()).sort((a, b) => {
    const t1 = parseInt(a.id.replace("EXAM-", "")) || 0;
    const t2 = parseInt(b.id.replace("EXAM-", "")) || 0;
    return t1 - t2;
  });

  return merged;
}
