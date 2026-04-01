export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string | null;
  from: string | null;
  date: string | null;
  snippet: string;
}

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// Job-related email search query
const JOB_EMAIL_QUERY =
  'subject:(application OR interview OR offer OR rejection OR "next steps" OR recruiter OR "thank you for applying" OR "we received" OR "phone screen" OR "take-home" OR "technical round" OR "move forward") newer_than:90d';

/**
 * Fetches job-related emails from Gmail.
 *
 * @param accessToken  Valid Google OAuth access token
 * @param cursor       Gmail historyId from previous sync (enables incremental sync).
 *                     Pass undefined for first-time full sync.
 * @returns messages and a new historyId cursor for the next sync
 */
export async function fetchJobEmails(
  accessToken: string,
  cursor?: string | null
): Promise<{ messages: GmailMessage[]; newCursor: string | null }> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  let messageIds: string[] = [];
  let newCursor: string | null = null;

  if (cursor) {
    // Incremental: only messages added since last historyId
    const historyRes = await fetch(
      `${GMAIL_BASE}/history?startHistoryId=${encodeURIComponent(cursor)}&historyTypes=messageAdded&labelId=INBOX`,
      { headers }
    );

    if (historyRes.status === 404) {
      // historyId expired — fall back to full sync
      return fetchJobEmails(accessToken, undefined);
    }

    if (!historyRes.ok) {
      throw new Error(`Gmail history API error: ${historyRes.status}`);
    }

    const historyData = await historyRes.json();
    newCursor = historyData.historyId ?? cursor;

    const history: Array<{ messagesAdded?: Array<{ message: { id: string } }> }> =
      historyData.history ?? [];

    for (const record of history) {
      for (const added of record.messagesAdded ?? []) {
        messageIds.push(added.message.id);
      }
    }
  } else {
    // Full sync: search with job-related query, max 200 results
    let pageToken: string | undefined;

    do {
      const url = new URL(`${GMAIL_BASE}/messages`);
      url.searchParams.set("q", JOB_EMAIL_QUERY);
      url.searchParams.set("maxResults", "200");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const listRes = await fetch(url.toString(), { headers });
      if (!listRes.ok) {
        throw new Error(`Gmail messages.list error: ${listRes.status}`);
      }

      const listData = await listRes.json();
      const msgs: Array<{ id: string }> = listData.messages ?? [];
      messageIds.push(...msgs.map((m) => m.id));

      // Only fetch one page (200 msgs) on full sync for speed
      pageToken = undefined;
    } while (pageToken && messageIds.length < 200);

    // Get current historyId for future incremental syncs
    const profileRes = await fetch(`${GMAIL_BASE}/profile`, { headers });
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      newCursor = profileData.historyId ?? null;
    }
  }

  if (messageIds.length === 0) {
    return { messages: [], newCursor };
  }

  // Batch fetch metadata in chunks of 20
  const messages = await batchFetchMetadata(messageIds, headers);
  return { messages, newCursor };
}

async function batchFetchMetadata(
  ids: string[],
  headers: Record<string, string>
): Promise<GmailMessage[]> {
  const CHUNK_SIZE = 20;
  const results: GmailMessage[] = [];

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const fetched = await Promise.all(
      chunk.map((id) => fetchMessageMetadata(id, headers))
    );
    results.push(...fetched.filter((m): m is GmailMessage => m !== null));
  }

  return results;
}

async function fetchMessageMetadata(
  id: string,
  headers: Record<string, string>
): Promise<GmailMessage | null> {
  try {
    const url = new URL(`${GMAIL_BASE}/messages/${id}`);
    url.searchParams.set("format", "metadata");
    url.searchParams.set("metadataHeaders", "Subject");
    url.searchParams.set("metadataHeaders", "From");
    url.searchParams.set("metadataHeaders", "Date");

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;

    const data = await res.json();
    const headerMap: Record<string, string> = {};
    for (const h of data.payload?.headers ?? []) {
      headerMap[h.name.toLowerCase()] = h.value;
    }

    return {
      id: data.id,
      threadId: data.threadId,
      subject: headerMap["subject"] ?? null,
      from: headerMap["from"] ?? null,
      date: headerMap["date"] ?? null,
      snippet: data.snippet ?? "",
    };
  } catch {
    return null;
  }
}
