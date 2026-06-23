const NOVU_BASE_URL = 'https://api.novu.co/v1';

function getHeaders() {
  const apiKey = process.env.EXPO_PUBLIC_NOVU_API_KEY;
  if (!apiKey) {
    console.warn('[NovuService] API Key is missing in environment variables');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `ApiKey ${apiKey || ''}`,
  };
}

export const novuService = {
  isEnabled(): boolean {
    return !!process.env.EXPO_PUBLIC_NOVU_API_KEY;
  },

  /**
   * Register or update a subscriber profile in Novu
   */
  async upsertSubscriber(userId: string, displayName: string, photoURL?: string): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('[NovuService] Novu is disabled. Skipping upsertSubscriber.');
      return false;
    }

    try {
      const nameParts = displayName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Player';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch(`${NOVU_BASE_URL}/subscribers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subscriberId: userId,
          firstName,
          lastName,
          avatar: photoURL || '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[NovuService] Failed to upsert subscriber ${userId}:`, response.status, errorText);
        return false;
      }

      console.log(`[NovuService] Successfully upserted subscriber: ${userId} (${displayName})`);
      return true;
    } catch (error) {
      console.warn(`[NovuService] Error during upsertSubscriber for ${userId}:`, error);
      return false;
    }
  },

  /**
   * Associate an Expo Push Token with a Novu subscriber credentials
   */
  async updateSubscriberToken(userId: string, token: string): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('[NovuService] Novu is disabled. Skipping updateSubscriberToken.');
      return false;
    }

    try {
      const response = await fetch(`${NOVU_BASE_URL}/subscribers/${userId}/credentials`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          providerId: 'expo',
          credentials: {
            deviceTokens: [token],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[NovuService] Failed to update subscriber credentials for ${userId}:`, response.status, errorText);
        return false;
      }

      console.log(`[NovuService] Successfully registered Expo token to Novu subscriber ${userId}`);
      return true;
    } catch (error) {
      console.warn(`[NovuService] Error updating subscriber token for ${userId}:`, error);
      return false;
    }
  },

  /**
   * Trigger a workflow notification to one or more subscribers
   */
  async triggerNotification(
    workflowId: string,
    toSubscriberIds: string[],
    payload: Record<string, any>
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log(`[NovuService] Novu is disabled. Mock triggering workflow "${workflowId}" to:`, toSubscriberIds);
      return false;
    }

    if (toSubscriberIds.length === 0) {
      console.log(`[NovuService] No subscribers to target for workflow "${workflowId}"`);
      return false;
    }

    try {
      const recipients = toSubscriberIds.map(id => ({ subscriberId: id }));
      console.log(`[NovuService] Triggering workflow "${workflowId}" for subscribers:`, toSubscriberIds);

      const response = await fetch(`${NOVU_BASE_URL}/events/trigger`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: workflowId,
          to: recipients,
          payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[NovuService] Failed to trigger workflow "${workflowId}":`, response.status, errorText);
        return false;
      }

      console.log(`[NovuService] Successfully triggered workflow "${workflowId}"`);
      return true;
    } catch (error) {
      console.warn(`[NovuService] Error triggering workflow "${workflowId}":`, error);
      return false;
    }
  },
};
