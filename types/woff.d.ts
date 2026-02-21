/** WOFF SDK (WORKS Front-end Framework) type definitions */
declare const woff: {
  init(config: { woffId: string }): Promise<void>
  isInClient(): boolean
  isLoggedIn(): boolean
  login(config?: { redirectUri?: string }): void
  logout(): Promise<void>
  getAccessToken(): string | null
  getProfile(): Promise<{ domainId: string; userId: string; displayName: string }>
  sendMessage(message: { content: string }): Promise<void>
  closeWindow(): void
  openWindow(config: { url: string; external?: boolean }): void
}
