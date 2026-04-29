import { providerFromRoute } from "@/lib/email/provider-config";
import { requireCurrentUser } from "@/lib/authorization";
import { disconnectEmailConnection, listUserEmailConnections } from "@/lib/email/token-store";

export async function getCurrentUserEmailConnections() {
  const user = await requireCurrentUser();
  return listUserEmailConnections(user.id);
}

export async function disconnectProviderForCurrentUser(providerRoute: string, connectionId?: string) {
  const user = await requireCurrentUser();
  const provider = providerFromRoute(providerRoute);

  await disconnectEmailConnection(user.id, provider, connectionId);
}
