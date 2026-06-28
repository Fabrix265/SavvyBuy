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
      setError("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Mensajes */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 16px 8px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "82%",
          }}>
            <div style={{
              background: m.role === "user" ? "var(--brand)" : "var(--gray-100)",
              color: m.role === "user" ? "white" : "var(--gray-900)",
              padding: "10px 14px",
              borderRadius: m.role === "user"
                ? "14px 14px 4px 14px"
                : "14px 14px 14px 4px",
              fontSize: 13.5,
              lineHeight: 1.6,
              boxShadow: "var(--shadow-sm)",
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Estado de búsqueda */}
        {status && (
          <div style={{
            alignSelf: "flex-start",
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--brand-light)",
            border: "1px solid #C7D2FE",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            fontSize: 12.5,
            color: "var(--brand-dark)",
          }}>
            <LoadingDots />
            {status}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 12.5,
            color: "var(--red)",
            background: "var(--red-light)",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            borderLeft: "3px solid var(--red)",
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 14px",
        borderTop: "1px solid var(--gray-100)",
        display: "flex",
        gap: 8,
        background: "white",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ej: busco una freidora de aire..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--gray-200)",
            fontSize: 13.5,
            color: "var(--gray-900)",
            background: loading ? "var(--gray-50)" : "white",
            outline: "none",
            transition: "border-color .15s",
          }}
          onFocus={e => e.target.style.borderColor = "var(--brand)"}
          onBlur={e => e.target.style.borderColor = "var(--gray-200)"}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: loading ? "var(--gray-200)" : "var(--brand)",
            color: loading ? "var(--gray-400)" : "white",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13.5,
            fontWeight: 500,
            transition: "background .15s, transform .1s",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => { if (!loading) e.target.style.background = "var(--brand-dark)" }}
          onMouseLeave={e => { if (!loading) e.target.style.background = "var(--brand)" }}
        >
          {loading ? "···" : "Enviar"}
        </button>
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5,
          borderRadius: "50%",
          background: "var(--brand)",
          display: "inline-block",
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  )
}