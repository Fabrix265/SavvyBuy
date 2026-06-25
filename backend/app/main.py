from fastapi import FastAPI

app = FastAPI(title="Agente Comparador de Productos")


@app.get("/health")
def health():
    return {"status": "ok"}
