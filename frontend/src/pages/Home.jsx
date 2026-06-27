import { useState } from "react"
import Chat from "../components/Chat"
import ProductCard from "../components/ProductCard"
import ProductDetail from "../components/ProductDetail"

export default function Home() {
  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ width: "400px", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #E5E7EB", fontWeight: 500, fontSize: "15px", color: "#111827" }}>
          Asistente de compras
        </div>
        <Chat onProductsReady={setProductos} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {productos.length === 0 ? (
          <div style={{ color: "#9CA3AF", textAlign: "center", marginTop: "5rem", fontSize: "14px" }}>
            Los resultados aparecerán aquí después de la búsqueda
          </div>
        ) : (
          <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {productos.map((p, i) => (
              <ProductCard key={i} product={p} onVerDetalle={setProductoSeleccionado} />
            ))}
          </div>
        )}

        {productoSeleccionado && (
          <ProductDetail
            product={productoSeleccionado}
            onClose={() => setProductoSeleccionado(null)}
          />
        )}
      </div>

    </div>
  )
}
