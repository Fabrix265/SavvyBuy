from app.config import ACTIVE_STORES
from app.stores.mercadolibre import MercadoLibreAdapter
from app.stores.falabella import FalabellaAdapter
from app.stores.ripley import RipleyAdapter
from app.stores.oechsle import OechsleAdapter
from app.stores.sodimac import SodimacAdapter
from app.stores.metro import MetroAdapter
from app.stores.tiendamia import TiendaMiaAdapter
from app.stores.radioshack import RadioShackAdapter

ADAPTER_MAP = {
    "mercadolibre": MercadoLibreAdapter,
    "falabella": FalabellaAdapter,
    "ripley": RipleyAdapter,
    "oechsle": OechsleAdapter,
    "sodimac": SodimacAdapter,
    "metro": MetroAdapter,
    "tiendamia": TiendaMiaAdapter,
    "radioshack": RadioShackAdapter,
}


def get_active_adapters() -> list:
    return [ADAPTER_MAP[name]() for name in ACTIVE_STORES if name in ADAPTER_MAP]
