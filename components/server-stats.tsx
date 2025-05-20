"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// Mock data for server performance
const generateMockData = () => {
  const data = []
  const now = new Date()

  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60000)
    data.push({
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      cpu: Math.floor(Math.random() * 30) + 20,
      memory: Math.floor(Math.random() * 40) + 30,
      players: Math.floor(Math.random() * 50) + 70,
    })
  }

  return data
}

export function ServerStats() {
  const [data, setData] = useState(generateMockData())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prevData) => {
        const newData = [...prevData.slice(1)]
        const now = new Date()
        newData.push({
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          cpu: Math.floor(Math.random() * 30) + 20,
          memory: Math.floor(Math.random() * 40) + 30,
          players: Math.floor(Math.random() * 50) + 70,
        })
        return newData
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="memory" name="Memory %" stroke="#82ca9d" />
          <Line type="monotone" dataKey="players" name="Players" stroke="#ffc658" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
