export default function ProductDetail({ product, onClose }) {
  if (!product) return null

  const scoreColor = product.score_total >= 7.5
    ? "var(--green)" : product.score_total >= 5
    ? "var(--amber)" : "var(--red)"

  const tiendasDisponibles = product.tiendas_fisicas?.filter(t => t.disponible) || []

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "white",
      overflowY: "auto",
      zIndex: 10,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header sticky */}
      <div style={{
        position: "sticky", top: 0,
        background: "white",
        borderBottom: "1px solid var(--gray-100)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 1,
        boxShadow: "0 1px 6px rgba(0,0,0,.05)",
      }}>
        <button
          onClick={onClose}
          style={{
            background: "var(--gray-100)",
            border: "none",
            cursor: "pointer",
            color: "var(--gray-700)",
            fontSize: 13,
            padding: "6px 12px",
            borderRadius: "var(--radius-md)",
            fontFamily: "inherit",
            fontWeight: 500,
            transition: "background .15s",
          }}
          onMouseEnter={e => { e.target.style.background = "var(--gray-200)" }}
          onMouseLeave={e => { e.target.style.background = "var(--gray-100)" }}
        >
          ← Volver
        </button>
        <span style={{
          fontSize: 13.5, fontWeight: 500, color: "var(--gray-700)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {product.tienda}
        </span>
      </div>

      {/* Contenido */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 680 }}>

        {/* Título + precio */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {product.imagen_url && (
            <img
              src={product.imagen_url}
              alt={product.titulo}
              style={{
                width: 80, height: 80, objectFit: "contain",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--gray-200)",
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.4, letterSpacing: "-.2px" }}>
              {product.titulo}
            </h1>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--gray-900)", marginTop: 8, letterSpacing: "-.5px" }}>
              S/ {product.precio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--gray-500)" }}>Puntuación general</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor }}>
              {product.score_total.toFixed(1)}
              <span style={{ fontSize: 12, color: "var(--gray-400)", fontWeight: 400 }}>/10</span>
            </span>
          </div>
          <div style={{ height: 7, background: "var(--gray-200)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(product.score_total / 10) * 100}%`,
              background: scoreColor,
              borderRadius: "var(--radius-pill)",
              transition: "width .6s ease",
            }} />
          </div>
        </div>

        {/* Trampa */}
        {product.trampa && (
          <div style={{
            background: "var(--amber-light)",
            borderLeft: "3px solid var(--amber)",
            padding: "10px 14px",
            fontSize: 13,
            color: "#92400E",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            lineHeight: 1.5,
          }}>
            <strong>⚠️ Lo que el vendedor no dice:</strong><br />{product.trampa}
          </div>
        )}

        {/* Pros y contras */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Section title="Lo bueno" titleColor="#065F46">
            {product.pros?.map((p, i) => (
              <Item key={i} icon="✓" iconColor="var(--green)">{p}</Item>
            ))}
          </Section>
          <Section title="Lo que debes saber" titleColor="#991B1B">
            {product.contras?.map((c, i) => (
              <Item key={i} icon="✗" iconColor="var(--red)">{c}</Item>
            ))}
          </Section>
        </div>

        {/* Especificaciones */}
        {Object.keys(product.specs || {}).length > 0 && (
          <Section title="Especificaciones">
            {Object.entries(product.specs).map(([k, val]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--gray-100)",
                fontSize: 13,
              }}>
                <span style={{ color: "var(--gray-500)" }}>{k}</span>
                <span style={{ fontWeight: 500, color: "var(--gray-900)" }}>{val}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Opiniones */}
        {product.opiniones_muestra?.length > 0 && (
          <Section title="Opiniones de compradores">
            {product.opiniones_muestra.map((op, i) => (
              <div key={i} style={{
                background: "var(--gray-50)",
                border: "1px solid var(--gray-100)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                marginBottom: 8,
              }}>
                <p style={{ fontSize: 13, color: "var(--gray-700)", lineHeight: 1.55, margin: 0 }}>{op.texto}</p>
                <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 5 }}>
                  <span style={{ color: "#FBBF24" }}>{"★".repeat(op.estrellas || 0)}</span>
                  <span style={{ color: "var(--gray-200)" }}>{"★".repeat(5 - (op.estrellas || 0))}</span>
                  {op.fuente && <span> · {op.fuente}</span>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Métodos de pago */}
        {product.metodos_pago?.length > 0 && (
          <Section title="Cómo pagar">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {product.metodos_pago.map((m, i) => (
                <span key={i} style={{
                  fontSize: 12.5, padding: "5px 12px",
                  background: "var(--gray-100)",
                  color: "var(--gray-700)",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--gray-200)",
                }}>
                  {m.nombre}{m.detalle ? ` · ${m.detalle}` : ""}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Tiendas físicas */}
        {tiendasDisponibles.length > 0 && (
          <Section title="Disponible en tienda física">
            {tiendasDisponibles.map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: "var(--green)", padding: "4px 0", display: "flex", gap: 8 }}>
                <span>📍</span>
                <span>{t.nombre}{t.direccion ? ` — ${t.direccion}` : ""}</span>
              </div>
            ))}
            <p style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 6 }}>
              Puedes ir a verlo antes de comprar o recogerlo el mismo día.
            </p>
          </Section>
        )}

        {/* CTA */}
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            background: "var(--brand)",
            color: "white",
            padding: "14px",
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: ".1px",
            boxShadow: "0 4px 12px rgba(79,70,229,.3)",
            transition: "background .15s, box-shadow .15s",
          }}
          onMouseEnter={e => {
            e.target.style.background = "var(--brand-dark)"
            e.target.style.boxShadow = "0 6px 16px rgba(79,70,229,.4)"
          }}
          onMouseLeave={e => {
            e.target.style.background = "var(--brand)"
            e.target.style.boxShadow = "0 4px 12px rgba(79,70,229,.3)"
          }}
        >
          Ir a comprar en {product.tienda}
        </a>

      </div>
    </div>
  )
}

function Section({ title, titleColor = "var(--gray-500)", children }) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: titleColor,
        textTransform: "uppercase",
        letterSpacing: ".6px",
        marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Item({ icon, iconColor, children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 13, color: "var(--gray-700)", lineHeight: 1.5 }}>
      <span style={{ color: iconColor, fontWeight: 700, flexShrink: 0 }}>{icon}</span>
      {children}
    </div>
  )
}