export interface IdentityProvider {
  verifyIdToken(
    provider: 'google' | 'apple',
    idToken: string,
  ): Promise<{ subject: string; email: string; name?: string }>;
}
