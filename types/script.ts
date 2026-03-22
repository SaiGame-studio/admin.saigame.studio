export interface GameScript {
  id: string
  studio_id: string
  game_id: string
  name: string
  description: string
  trigger_type: string
  script_body: string
  version: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateScriptRequest {
  name: string
  description: string
  trigger_type: string
  script_body: string
}

export interface UpdateScriptRequest {
  description?: string
  script_body?: string
  is_active?: boolean
}

export interface SampleScript {
  name: string
  description: string
  trigger_type: string
  game_type: string
  script_body: string
}
