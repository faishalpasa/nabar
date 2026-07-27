/**
 * Tipe database, ditulis manual agar cocok dengan supabase/migrations/.
 *
 * Idealnya ini di-generate:
 *   npx supabase gen types typescript --db-url "$DATABASE_URL" > lib/database.types.ts
 * tapi generator itu butuh Docker. Kalau nanti Docker tersedia, ganti file ini
 * dengan hasil generate-nya.
 *
 * Catatan bentuk: supabase-js mensyaratkan setiap tabel punya Row/Insert/Update
 * dan setiap tabel/view punya `Relationships`. Tabel yang read-only dari client
 * (profiles, memberships, transaction_events) tetap diberi Insert/Update di
 * tingkat tipe — yang menolaknya adalah RLS, bukan TypeScript.
 */

export type GroupType = "one_time" | "ongoing"
export type MemberRole = "owner" | "member"
export type MemberStatus = "invited" | "active"
export type TxType = "deposit" | "withdrawal"
export type TxStatus = "pending" | "verified" | "rejected"
export type InvitationStatus = "pending" | "accepted" | "revoked"

export type TxEventAction =
  | "created"
  | "approved"
  | "rejected"
  | "unapproved"
  | "amount_edited"
  | "note_edited"

/** State yang dikembalikan RPC get_invitation_preview. */
export type InvitationState =
  "ok" | "not_found" | "expired" | "used" | "revoked" | "already_member"

export type InvitationPreview = {
  state: InvitationState
  group_id: string | null
  group_name: string | null
  group_type: GroupType | null
  goal_amount: string | null
  goal_deadline: string | null
  invited_by_name: string | null
}

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  email: string | null
  updated_at: string
}

export type GroupRow = {
  id: string
  name: string
  type: GroupType
  goal_amount: string | null
  goal_deadline: string | null
  owner_id: string
  created_at: string
}

export type MembershipRow = {
  group_id: string
  user_id: string
  role: MemberRole
  status: MemberStatus
  joined_at: string | null
  created_at: string
}

export type TransactionRow = {
  id: string
  group_id: string
  user_id: string
  type: TxType
  amount: string
  proof_path: string
  note: string | null
  status: TxStatus
  reject_reason: string | null
  created_at: string
  verified_by: string | null
  verified_at: string | null
}

export type TransactionEventRow = {
  id: number
  transaction_id: string
  actor_id: string
  action: TxEventAction
  amount_before: string | null
  amount_after: string | null
  reason: string | null
  created_at: string
}

export type InvitationRow = {
  id: string
  group_id: string
  invited_by: string
  token: string
  status: InvitationStatus
  expires_at: string
  accepted_by: string | null
  accepted_at: string | null
  created_at: string
}

export type GroupOverview = {
  group_id: string
  name: string
  type: GroupType
  goal_amount: string | null
  goal_deadline: string | null
  owner_id: string
  created_at: string
  total_deposits: string
  total_withdrawals: string
  balance: string
  pending_count: number
  member_count: number
  /** null kalau grup tanpa target. Sudah dijepit ke 0..1 oleh view. */
  progress: string | null
}

export type MemberContribution = {
  group_id: string
  user_id: string
  role: MemberRole
  joined_at: string | null
  display_name: string
  avatar_url: string | null
  total_contributed: string
  pending_count: number
}

export type TransactionFeedRow = {
  id: string
  group_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  type: TxType
  amount: string
  signed_amount: string
  status: TxStatus
  note: string | null
  reject_reason: string | null
  proof_path: string
  created_at: string
  verified_at: string | null
  verified_by: string | null
  was_edited: boolean
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
        Relationships: []
      }
      groups: {
        Row: GroupRow
        // owner_id dan created_at diisi trigger dari auth.uid()/now(),
        // jangan dikirim dari client.
        Insert: {
          name: string
          type: GroupType
          goal_amount?: number | null
          goal_deadline?: string | null
        }
        Update: { name?: string }
        Relationships: []
      }
      memberships: {
        Row: MembershipRow
        Insert: Partial<MembershipRow>
        Update: Partial<MembershipRow>
        Relationships: []
      }
      transactions: {
        Row: TransactionRow
        // status, created_at, dan field verifikasi ditentukan server.
        Insert: {
          group_id: string
          type: TxType
          amount: number
          proof_path: string
          note?: string | null
        }
        Update: {
          status?: TxStatus
          reject_reason?: string | null
          amount?: number
          note?: string | null
        }
        Relationships: []
      }
      transaction_events: {
        Row: TransactionEventRow
        Insert: Partial<TransactionEventRow>
        Update: Partial<TransactionEventRow>
        Relationships: []
      }
      invitations: {
        Row: InvitationRow
        Insert: { group_id: string }
        Update: { status?: "revoked" }
        Relationships: []
      }
    }
    Views: {
      group_overview: { Row: GroupOverview; Relationships: [] }
      member_contributions: { Row: MemberContribution; Relationships: [] }
      transaction_feed: { Row: TransactionFeedRow; Relationships: [] }
    }
    Functions: {
      get_invitation_preview: {
        Args: { p_token: string }
        Returns: InvitationPreview
      }
      accept_invitation: {
        Args: { p_token: string }
        Returns: string
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
