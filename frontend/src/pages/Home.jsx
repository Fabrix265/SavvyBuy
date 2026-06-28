import { useState, useCallback } from "react"
import Chat from "../components/Chat"
import ProductCard from "../components/ProductCard"
import ProductDetail from "../components/ProductDetail"

export default function Home() {
  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const handleClose = useCallback(() => setProductoSeleccionado(null), [])

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: 380,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "white",
        borderRight: "1px solid var(--gray-200)",
        boxShadow: "2px 0 12px rgba(0,0,0,.04)",
        zIndex: 1,
      }}>
        {/* Logo / header */}
        <div style={{
          padding: "18px 20px",
          borderBottom: "1px solid var(--gray-100)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 32, height: 32,
            background: "var(--brand)",
            borderRadius: "var(--radius-sm)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🛍️</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--gray-900)", letterSpacing: "-.2px" }}>
              SavvyBuy
            </div>
            <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>
              Comparador de precios · Perú
            </div>
          </div>
        </div>

        <Chat onProductsReady={setProductos} />
      </aside>

      {/* Panel de resultados */}
      <main style={{ flex: 1, overflowY: "auto", position: "relative", background: "var(--gray-50)" }}>
        {productos.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ padding: "24px 28px" }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--gray-900)", letterSpacing: "-.2px" }}>
                {productos.length} producto{productos.length !== 1 ? "s" : ""} encontrado{productos.length !== 1 ? "s" : ""}
              </h2>
              <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 3 }}>
                Ordenados por mejor puntuación
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
              gap: 16,
            }}>
              {productos.map((p, i) => (
                <ProductCard key={i} product={p} onVerDetalle={setProductoSeleccionado} />
              ))}
            </div>
          </div>
        )}

        {productoSeleccionado && (
          <ProductDetail product={productoSeleccionado} onClose={handleClose} />
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 12, padding: "2rem",
      color: "var(--gray-400)",
    }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>🔍</div>
      <p style={{ fontSize: 15, fontWeight: 500, color: "var(--gray-500)" }}>
        Aún no hay resultados
      </p>
      <p style={{ fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
        Cuéntale al asistente qué producto buscas y aparecerán aquí las mejores opciones comparadas.
      </p>
    </div>
  )
}