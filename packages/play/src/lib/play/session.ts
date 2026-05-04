import { headers } from 'next/headers';
import { fetchWebsiteSession } from './website-client';

export async function getPlaySession() {
  const headerStore = await headers();
  return fetchWebsiteSession(headerStore.get('cookie'));
}
