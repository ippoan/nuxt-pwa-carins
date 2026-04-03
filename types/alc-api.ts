// Auto-generated from rust-alc-api (ts-rs)
// Source SHA: af672ce9f098f4664c58c3da3562baaf0a94a551
// Do not edit manually. Regenerate: scripts/export-ts-bindings.sh types

// serde_json::Value equivalent
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// --- carins types ---
export type CarInspectionListResponse = { carInspections: Array<JsonValue> };
export type FileListResponse = { files: Array<FileRow> };
export type FileRow = { uuid: string, filename: string, fileType: string, created: string, deleted: string | null, blob: string | null, s3Key: string | null, storageClass: string | null, lastAccessedAt: string | null, accessCountWeekly: number | null, accessCountTotal: number | null, promotedToStandardAt: string | null };
export type NfcTag = { id: number, nfcUuid: string, carInspectionId: number, createdAt: string };
export type NfcTagSearchResponse = { nfc_tag: NfcTag, car_inspection: JsonValue | null };

// --- admin types ---
export type SsoConfigRow = { provider: string, client_id: string, external_org_id: string, enabled: boolean, woff_id: string | null, created_at: string, updated_at: string };
export type TenantAllowedEmail = { id: string, tenant_id: string, email: string, role: string, created_at: string };
export type BotConfigResponse = { id: string, provider: string, name: string, client_id: string, service_account: string, bot_id: string, enabled: boolean, created_at: string, updated_at: string };
export type UserResponse = { id: string, email: string, name: string, role: string, created_at: string };

// --- list response wrappers ---
export type SsoConfigListResponse = { configs: SsoConfigRow[] };
export type BotConfigListResponse = { configs: BotConfigResponse[] };
export type UsersListResponse = { users: UserResponse[] };
export type InvitationsListResponse = { invitations: TenantAllowedEmail[] };
