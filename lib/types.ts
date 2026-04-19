export interface User {
  id: string
  name: string
  email: string
  leetcode_username: string
  role: 'member' | 'admin'
  solve_count: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  points: number
  current_rank: number | null
  streak: number
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  title: string
  start_date: string
  end_date: string
  duration_days: number
  status: 'upcoming' | 'active' | 'completed' | 'paused'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  leetcode_username: string
  solve_count: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  points: number
  streak: number
  last_synced_at: string | null
}

export interface ChallengeParticipant {
  id: string
  challenge_id: string
  user_id: string
  solve_count_at_start: number
  solve_count_current: number
  points_earned: number
  rank_in_challenge: number | null
  rank_change: number
  joined_at: string
}

export type ApiSuccess<T> = { success: true; data: T }
export type ApiError      = { success: false; error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
