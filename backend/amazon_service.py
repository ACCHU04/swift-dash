import re
from datetime import datetime
from typing import Any

import httpx

from config import settings


_MOCK_PRODUCTS = [
    {"title": "Apple AirPods Pro (2nd Gen)", "price": 249.0, "rating": 4.7, "review_count": 83241, "is_prime": True, "asin": "B0BDHWDR12"},
    {"title": "Samsung Galaxy Buds2 Pro", "price": 179.99, "rating": 4.5, "review_count": 18522, "is_prime": True, "asin": "B0B8TC6KWF"},
    {"title": "Sony WH-1000XM5", "price": 398.0, "rating": 4.6, "review_count": 22115, "is_prime": True, "asin": "B09XS7JWHH"},
    {"title": "Apple MacBook Air M3", "price": 1099.0, "rating": 4.8, "review_count": 12494, "is_prime": True, "asin": "B0CX23L7DT"},
    {"title": "Logitech MX Master 3S", "price": 99.99, "rating": 4.7, "review_count": 30123, "is_prime": True, "asin": "B09HM94VDS"},
    {"title": "Anker 737 Power Bank", "price": 129.99, "rating": 4.6, "review_count": 9532, "is_prime": True, "asin": "B09VPHVT2Z"},
    {"title": "Kindle Paperwhite (11th Gen)", "price": 149.99, "rating": 4.7, "review_count": 116002, "is_prime": True, "asin": "B08KTZ8249"},
    {"title": "Echo Dot (5th Gen)", "price": 49.99, "rating": 4.6, "review_count": 413257, "is_prime": True, "asin": "B09B8V1LZ3"},
    {"title": "Fire TV Stick 4K", "price": 39.99, "rating": 4.7, "review_count": 625404, "is_prime": True, "asin": "B0BJMGC3X7"},
    {"title": "Roku Streaming Stick 4K", "price": 49.99, "rating": 4.6, "review_count": 87231, "is_prime": True, "asin": "B09BKCDXZC"},
]

_SUPPORTED_CATEGORIES = [
    "electronics",
    "books",
    "fashion",
    "home",
    "beauty",
    "sports",
]


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    raw = str(value)
    cleaned = re.sub(r"[^0-9.\-]", "", raw)
    if not cleaned:
        return default
    try:
        return float(cleaned)
    except ValueError:
        return default


def _to_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    raw = str(value)
    cleaned = re.sub(r"[^0-9\-]", "", raw)
    if not cleaned:
        return default
    try:
        return int(cleaned)
    except ValueError:
        return default


def _normalize_products(
    items: list[dict[str, Any]],
    category: str,
    country: str,
    start_index: int = 1,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    today = datetime.utcnow().strftime("%Y-%m-%d")

    for idx, item in enumerate(items, start_index):
        title = item.get("product_title") or item.get("title") or item.get("name") or f"Amazon Product {idx}"
        price = _to_float(item.get("product_price") or item.get("price") or item.get("current_price"), 0.0)
        rating = _to_float(item.get("product_star_rating") or item.get("rating"), 0.0)
        review_count = _to_int(item.get("product_num_ratings") or item.get("review_count"), 0)
        asin = item.get("asin") or item.get("product_asin") or f"MOCK-ASIN-{idx:04d}"
        is_prime = bool(item.get("is_prime", False))
        product_url = item.get("product_url") or item.get("url") or ""

        normalized.append(
            {
                "order_id": idx,
                "order_date": today,
                "product_id": idx,
                "product_category": category,
                "price": price,
                "discount_percent": 0,
                "quantity_sold": 1,
                "customer_region": country,
                "payment_method": "N/A",
                "rating": rating,
                "review_count": review_count,
                "discounted_price": price,
                "total_revenue": price,
                "product_title": str(title),
                "asin": str(asin),
                "is_prime": int(is_prime),
                "product_url": str(product_url),
                "data_source": "amazon_api",
            }
        )

    return normalized


def _mock_rows_for_category(category: str, country: str, limit: int, start_index: int = 1) -> list[dict[str, Any]]:
    if category == "all":
        mixed_products: list[dict[str, Any]] = []
        per_category = max(2, limit // len(_SUPPORTED_CATEGORIES))
        for cat in _SUPPORTED_CATEGORIES:
            for item in _MOCK_PRODUCTS[:per_category]:
                mixed_products.append({
                    **item,
                    "title": f"{item['title']} ({cat})",
                })
                if len(mixed_products) >= limit:
                    break
            if len(mixed_products) >= limit:
                break
        return _normalize_products(mixed_products[:limit], category="mixed", country=country, start_index=start_index)

    return _normalize_products(_MOCK_PRODUCTS[:limit], category, country, start_index=start_index)


async def _fetch_single_category(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    category: str,
    country: str,
    limit: int,
    start_index: int = 1,
) -> list[dict[str, Any]]:
    url = f"{settings.rapidapi_base_url}/best-sellers"
    params = {
        "category": category,
        "country": country,
        "page": "1",
    }

    resp = await client.get(url, headers=headers, params=params)
    resp.raise_for_status()
    payload = resp.json()

    data = payload.get("data", {}) if isinstance(payload, dict) else {}
    products = data.get("best_sellers") or data.get("products") or []

    if not isinstance(products, list) or not products:
        return []

    return _normalize_products(products[:limit], category, country, start_index=start_index)


async def fetch_amazon_best_sellers(category: str = "electronics", country: str = "US", limit: int = 20) -> tuple[list[dict[str, Any]], str]:
    """Fetch best-seller products and normalize them into dashboard-friendly rows."""
    capped_limit = max(5, min(limit, 50))

    normalized_category = (category or "electronics").strip().lower()

    if not settings.rapidapi_key:
        mock_rows = _mock_rows_for_category(normalized_category, country, capped_limit)
        return mock_rows, "mock"

    headers = {
        "X-RapidAPI-Key": settings.rapidapi_key,
        "X-RapidAPI-Host": settings.rapidapi_host,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            if normalized_category == "all":
                all_rows: list[dict[str, Any]] = []
                per_category = max(3, capped_limit // len(_SUPPORTED_CATEGORIES))
                row_index = 1
                for cat in _SUPPORTED_CATEGORIES:
                    try:
                        rows = await _fetch_single_category(
                            client,
                            headers,
                            category=cat,
                            country=country,
                            limit=per_category,
                            start_index=row_index,
                        )
                    except Exception:
                        rows = []

                    if rows:
                        all_rows.extend(rows)
                        row_index += len(rows)

                    if len(all_rows) >= capped_limit:
                        break

                normalized = all_rows[:capped_limit]
            else:
                normalized = await _fetch_single_category(
                    client,
                    headers,
                    category=normalized_category,
                    country=country,
                    limit=capped_limit,
                    start_index=1,
                )

        if not normalized:
            raise ValueError("RapidAPI response could not be normalized")

        return normalized, "live"
    except Exception:
        # Demo-safe fallback so the product keeps working even if API quota is exhausted.
        mock_rows = _mock_rows_for_category(normalized_category, country, capped_limit)
        return mock_rows, "mock"
