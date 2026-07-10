import json
import re
from urllib.parse import quote, urljoin
from app.models.product import Product


def build_vtex_search_url(base_url: str, query: str) -> str:
    return f"{base_url}/{quote(query)}?map=ft"


def _extract_state_json(html: str) -> dict | None:
    match = re.search(r'<script id="__STATE__"[^>]*>(\{.*?\})</script>', html, re.S)
    if not match:
        match = re.search(r"__STATE__\s*=\s*(\{.*?\})\s*</script>", html, re.S)
    if not match:
        match = re.search(r"<script>(\{\"Product:.*?\})</script>", html, re.S)
    if not match:
        return None

    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def parse_vtex_state(
    html: str,
    store_name: str,
    base_url: str,
    limit: int = 15,
    brand_filter: str | None = None,
    scan_limit: int = 60,
) -> list[Product]:
    cache = _extract_state_json(html)
    if not cache:
        return []

    search_key = next(
        (k for k in cache if k.startswith("$ROOT_QUERY.productSearch")),
        None,
    )
    if not search_key:
        return []

    refs = cache[search_key].get("products", [])

    products = []
    for ref in refs[:scan_limit]:
        if len(products) >= limit:
            break
        try:
            product_id = ref["id"]
            product = cache.get(product_id)
            if not product:
                continue

            if brand_filter:
                brand = (product.get("brand") or "").strip().lower()
                if brand != brand_filter.strip().lower():
                    continue

            titulo = product.get("productName")
            link = product.get("link")
            if not titulo or not link:
                continue

            price_key = f"${product_id}.priceRange.sellingPrice"
            price_range = cache.get(price_key)
            if not price_range:
                continue

            precio = price_range.get("lowPrice") or price_range.get("highPrice")
            if not precio or precio <= 0:
                continue

            products.append(Product(
                tienda=store_name,
                titulo=titulo,
                precio=float(precio),
                url=urljoin(base_url, link),
            ))
        except (ValueError, TypeError, KeyError):
            continue
    return products