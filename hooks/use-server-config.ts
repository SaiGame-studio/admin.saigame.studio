import { useState, useEffect } from "react"
import { fetchServerConfig, type ServerConfig } from "@/lib/server-config-api"

// Module-level cache so the API is only called once per page load
let cachedConfig: ServerConfig | null = null
let fetchPromise: Promise<ServerConfig> | null = null

function getServerConfig(): Promise<ServerConfig> {
  if (cachedConfig) return Promise.resolve(cachedConfig)
  if (fetchPromise) return fetchPromise
  fetchPromise = fetchServerConfig().then(config => {
    cachedConfig = config
    return config
  })
  return fetchPromise
}

export function useServerConfig() {
  const [config, setConfig] = useState<ServerConfig | null>(cachedConfig)
  const [loading, setLoading] = useState(cachedConfig === null)

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig)
      setLoading(false)
      return
    }
    getServerConfig()
      .then(setConfig)
      .catch(() => {
        // On error keep config null — callers should default to "feature enabled"
      })
      .finally(() => setLoading(false))
  }, [])

  return { config, loading }
}
