const VEREDICTO = {
  "Mejor calidad-precio": { bg: "#E1F5EE", color: "#085041", border: "#1D9E75" },
  "Opción premium":       { bg: "#E6F1FB", color: "#0C447C", border: "transparent" },
  "Económica segura":     { bg: "#FAEEDA", color: "#633806", border: "transparent" },
  "Evitar":               { bg: "#FAECE7", color: "#712B13", border: "transparent" },
}

export default function ProductCard({ product, onVerDetalle }) {
  const v = VEREDICTO[product.veredicto] || { bg: "#F3F4F6", color: "#374151", border: "transparent" }
  const isBest = product.veredicto === "Mejor calidad-precio"

  return (
    <div style={{
      border: `${isBest ? "1.5px" : "0.5px"} solid ${isBest ? v.border : "#E5E7EB"}`,
      borderRadius: "12px", padding: "1rem",
      display: "flex", flexDirection: "column", gap: "8px",
      background: "white"
    }}>
      <span style={{ background: v.bg, color: v.color, padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 500, alignSelf: "flex-start" }}>
        {product.veredicto}
      </span>

      <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>{product.titulo}</div>
      <div style={{ fontSize: "11px", color: "#6B7280" }}>{product.tienda}</div>
      <div style={{ fontSize: "20px", fontWeight: 500, color: "#111827" }}>S/ {product.precio.toFixed(2)}</div>
      <div style={{ fontSize: "11px", color: "#6B7280" }}>Score {product.score_total}/10</div>
      <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>{product.explicacion}</div>

      {product.trampa && (
        <div style={{ background: "#FAEEDA", borderLeft: "2px solid #EF9F27", padding: "6px 8px", fontSize: "11px", color: "#633806" }}>
          Ojo: {product.trampa}
        </div>
      )}

      {product.metodos_pago?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {product.metodos_pago.map((m, i) => (
            <span key={i} style={{ fontSize: "10px", padding: "2px 6px", background: "#F3F4F6", color: "#374151", borderRadius: "4px", border: "0.5px solid #E5E7EB" }}>
              {m.nombre}{m.detalle ? ` · ${m.detalle}` : ""}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        <button
          onClick={() => onVerDetalle(product)}
          style={{ flex: 1, padding: "7px", background: "transparent", color: "#534AB7", border: "1px solid #534AB7", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}
        >
          Ver detalle
        </button>
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          style={{ flex: 1, padding: "7px", background: "#534AB7", color: "white", borderRadius: "8px", textAlign: "center", textDecoration: "none", fontSize: "12px" }}
        >
          Ir a comprar
        </a>
      </div>
    </div>
  )
}
