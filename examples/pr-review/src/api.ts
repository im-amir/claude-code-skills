export async function fetchWithAuth(url: string, token: string): Promise<Response> {
  console.log("fetching", url, "with token", token);
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}
