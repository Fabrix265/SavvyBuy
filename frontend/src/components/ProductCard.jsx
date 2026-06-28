const VEREDICTO = {
  "Mejor calidad-precio": { bg: "var(--green-light)",  color: "#065F46", border: "var(--green)" },
  "Opción premium":       { bg: "var(--brand-light)",  color: "#312E81", border: "var(--brand)" },
  "Económica segura":     { bg: "var(--amber-light)",  color: "#92400E", border: "var(--amber)" },
  "Evitar":               { bg: "var(--red-light)",    color: "#991B1B", border: "var(--red)"   },
}

export default function ProductCard({ product, onVerDetalle }) {
  const v = VEREDICTO[product.veredicto] || { bg: "var(--gray-100)", color: "var(--gray-700)", border: "var(--gray-200)" }
  const isBest = product.veredicto === "Mejor calidad-precio"

  return (
    <div
      style={{
        background: "white",
        border: `${isBest ? "2px" : "1px"} solid ${isBest ? v.border : "var(--gray-200)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: isBest ? "0 4px 16px rgba(5,150,105,.12)" : "var(--shadow-sm)",
        transition: "box-shadow .2s, transform .2s",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)"
        e.currentTarget.style.transform = "translateY(-2px)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = isBest ? "0 4px 16px rgba(5,150,105,.12)" : "var(--shadow-sm)"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {/* Imagen + Veredicto */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          background: v.bg,
          color: v.color,
          padding: "3px 10px",
          borderRadius: "var(--radius-pill)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".2px",
        }}>
          {product.veredicto}
        </span>
        {product.imagen_url && (
          <img
            src={product.imagen_url}
            alt={product.titulo}
            style={{ width: 52, height: 52, objectFit: "contain", borderRadius: "var(--radius-sm)", flexShrink: 0 }}
          />
        )}
      </div>

      {/* Info principal */}
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--gray-900)", lineHeight: 1.4 }}>
          {product.titulo}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 3 }}>
          {product.tienda}
        </div>
      </div>

      {/* Precio + Score */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: "var(--gray-900)", letterSpacing: "-.5px" }}>
          S/ {product.precio.toFixed(2)}
        </div>
        <ScoreBadge score={product.score_total} />
      </div>

      {/* Explicación */}
      <p style={{ fontSize: 12.5, color: "var(--gray-500)", lineHeight: 1.55, margin: 0 }}>
        {product.explicacion}
      </p>

      {/* Trampa */}
      {product.trampa && (
        <div style={{
          background: "var(--amber-light)",
          borderLeft: "3px solid var(--amber)",
          padding: "7px 10px",
          fontSize: 11.5,
          color: "#92400E",
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        }}>
          ⚠️ {product.trampa}
        </div>
      )}

      {/* Métodos de pago */}
      {product.metodos_pago?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {product.metodos_pago.map((m, i) => (
            <span key={i} style={{
              fontSize: 10.5,
              padding: "2px 8px",
              background: "var(--gray-100)",
              color: "var(--gray-700)",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--gray-200)",
            }}>
              {m.nombre}{m.detalle ? ` · ${m.detalle}` : ""}
            </span>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          onClick={() => onVerDetalle(product)}
          style={{
            flex: 1,
            padding: "9px 0",
            background: "white",
            color: "var(--brand)",
            border: "1.5px solid var(--brand)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            fontFamily: "inherit",
            transition: "background .15s",
          }}
          onMouseEnter={e => { e.target.style.background = "var(--brand-light)" }}
          onMouseLeave={e => { e.target.style.background = "white" }}
        >
          Ver detalle
        </button>
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            padding: "9px 0",
            background: "var(--brand)",
            color: "white",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            textDecoration: "none",
            fontSize: 12.5,
            fontWeight: 500,
            transition: "background .15s",
            display: "block",
          }}
          onMouseEnter={e => { e.target.style.background = "var(--brand-dark)" }}
          onMouseLeave={e => { e.target.style.background = "var(--brand)" }}
        >
          Ir a comprar
        </a>
      </div>
    </div>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 7.5 ? "var(--green)" : score >= 5 ? "var(--amber)" : "var(--red)"
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)",
      borderRadius: "var(--radius-sm)",
      padding: "4px 10px",
      minWidth: 52,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1.1 }}>{score.toFixed(1)}</span>
      <span style={{ fontSize: 9, color: "var(--gray-400)", fontWeight: 500, letterSpacing: ".3px" }}>/ 10</span>
    </div>
  )
}