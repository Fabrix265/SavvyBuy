import { useState, useRef, useEffect } from "react"

export default function Chat({ onProductsReady }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hola, soy tu asistente de compras. ¿Qué producto estás buscando?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, status])

  const send = async () => {
    if (!input.trim() || loading) return
    const newMessages = [...messages, { role: "user", content: input }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setStatus("")
    setError("")

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => "Error del servidor")
        setError(`Error ${response.status}: ${errText}`)
        setLoading(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.replace("data: ", ""))
            if (event.type === "message") {
              setMessages(prev => [...prev, { role: "assistant", content: event.content }])
            } else if (event.type === "status") {
              setStatus(event.content)
            } else if (event.type === "error") {
              setError(event.content)
            } else if (event.type === "done") {
              setStatus("")
              if ((event.productos || []).length > 0) onProductsReady(event.productos)
            }
          } catch (e) {
            console.error("Error parseando SSE:", e, line)
          }
        }
      }
    } catch (e) {
      console.error("Error en chat:", e)
      setError("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "#534AB7" : "#F3F4F6",
            color: m.role === "user" ? "white" : "#111827",
            padding: "0.75rem 1rem", borderRadius: "12px", maxWidth: "78%",
            fontSize: "14px", lineHeight: "1.6"
          }}>
            {m.content}
          </div>
        ))}
        {status && (
          <div style={{ fontSize: "12px", color: "#6B7280", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", display: "inline-block" }} />
            {status}
          </div>
        )}
        {error && (
          <div style={{ fontSize: "12px", color: "#DC2626", background: "#FEF2F2", padding: "8px 12px", borderRadius: "8px", borderLeft: "3px solid #DC2626" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", padding: "1rem", borderTop: "1px solid #E5E7EB" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Escribe aquí..."
          disabled={loading}
          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "14px" }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ padding: "0.75rem 1.25rem", background: "#534AB7", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  )
}
