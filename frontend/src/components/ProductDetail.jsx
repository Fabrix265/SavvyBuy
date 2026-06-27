export default function ProductDetail({ product, onClose }) {
  if (!product) return null

  const scoreWidth = `${(product.score_total / 10) * 100}%`

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "white", overflowY: "auto", zIndex: 10, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

      <button onClick={onClose} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: "13px", padding: 0 }}>
        ← Volver a resultados
      </button>

      <div>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>{product.titulo}</div>
        <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{product.tienda}</div>
        <div style={{ fontSize: "24px", fontWeight: 500, marginTop: "6px" }}>S/ {product.precio.toFixed(2)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>Score</span>
          <div style={{ flex: 1, height: "6px", background: "#F3F4F6", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: scoreWidth, background: "#1D9E75", borderRadius: "99px" }} />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 500 }}>{product.score_total}/10</span>
        </div>
      </div>

      {product.trampa && (
        <div style={{ background: "#FAEEDA", borderLeft: "3px solid #EF9F27", padding: "8px 12px", fontSize: "12px", color: "#633806", borderRadius: "0 6px 6px 0" }}>
          <strong>Ojo:</strong> {product.trampa}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#0F6E56", marginBottom: "6px" }}>Lo bueno</div>
          {product.pros?.map((p, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#111827", padding: "3px 0", display: "flex", gap: "6px" }}>
              <span style={{ color: "#1D9E75" }}>✓</span>{p}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#993C1D", marginBottom: "6px" }}>Lo que debes saber</div>
          {product.contras?.map((c, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#111827", padding: "3px 0", display: "flex", gap: "6px" }}>
              <span style={{ color: "#D85A30" }}>✗</span>{c}
            </div>
          ))}
        </div>
      </div>

      {Object.keys(product.specs || {}).length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Especificaciones</div>
          {Object.entries(product.specs).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid #F3F4F6", fontSize: "13px" }}>
              <span style={{ color: "#6B7280" }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {product.opiniones_muestra?.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Opiniones de compradores</div>
          {product.opiniones_muestra.map((op, i) => (
            <div key={i} style={{ background: "#F9FAFB", borderRadius: "8px", padding: "8px 10px", marginBottom: "6px" }}>
              <div style={{ fontSize: "12px", color: "#111827", lineHeight: 1.5 }}>{op.texto}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "3px" }}>
                {"★".repeat(op.estrellas || 0)}{"☆".repeat(5 - (op.estrellas || 0))} · {op.fuente}
              </div>
            </div>
          ))}
        </div>
      )}

      {product.metodos_pago?.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cómo pagar</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {product.metodos_pago.map((m, i) => (
              <span key={i} style={{ fontSize: "12px", padding: "4px 10px", background: "#F3F4F6", color: "#374151", borderRadius: "6px", border: "0.5px solid #E5E7EB" }}>
                {m.nombre}{m.detalle ? ` · ${m.detalle}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {product.tiendas_fisicas?.filter(t => t.disponible).length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Disponible en tienda física</div>
          {product.tiendas_fisicas.filter(t => t.disponible).map((t, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#0F6E56", padding: "3px 0", display: "flex", gap: "6px" }}>
              {t.nombre}{t.direccion ? ` — ${t.direccion}` : ""}
            </div>
          ))}
          <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>Puedes ir a verlo antes de comprar o recogerlo el mismo día.</div>
        </div>
      )}

      <a
        href={product.url}
        target="_blank"
        rel="noreferrer"
        style={{ display: "block", textAlign: "center", background: "#534AB7", color: "white", padding: "12px", borderRadius: "10px", textDecoration: "none", fontSize: "14px", fontWeight: 500, marginTop: "6px" }}
      >
        Ir a comprar en {product.tienda}
      </a>

    </div>
  )
}
