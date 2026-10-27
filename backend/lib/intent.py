"""Deterministic shopping-intent extraction.

Turns a message like "wireless running earbuds between 1k and 2k" into a
category, a price range and feature keywords. Matching is on whole words,
and the category comes from the first product noun in the message, so
"running watch" is a smartwatch and "socks for my running shoes" is socks.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class ShoppingIntent:
    category: Optional[str] = None
    budget_max: Optional[float] = None
    budget_min: Optional[float] = None
    keywords: List[str] = field(default_factory=list)
    # "cheaper" / "more premium" relative to the previous recommendation.
    relative_price: Optional[str] = None


# Product nouns decide the category. Order within a list does not matter;
# the earliest match in the message wins across categories.
CATEGORY_NOUNS: Dict[str, List[str]] = {
    "footwear": [
        "shoe", "shoes", "sneaker", "sneakers", "trainer", "trainers",
        "boot", "boots", "footwear", "runners", "spikes",
    ],
    "smartwatch": [
        "smartwatch", "smartwatches", "smart watch", "watch", "watches",
        "fitness band", "fitness tracker", "tracker", "wearable",
    ],
    "electronics": [
        "headphone", "headphones", "headset", "earbud", "earbuds",
        "earphone", "earphones", "speaker", "speakers", "tws", "neckband",
    ],
    "accessories": [
        "sock", "socks", "bottle", "bottles", "flask", "spray",
        "care kit", "cleaner", "pouch", "bag", "bags",
        "accessory", "accessories",
    ],
    "apparel": [
        "tshirt", "t-shirt", "t-shirts", "shirt", "shirts", "jersey",
        "shorts", "hoodie", "tracksuit", "apparel",
    ],
}

# Used only when no product noun is present ("something for my morning run").
CATEGORY_HINTS: Dict[str, List[str]] = {
    "footwear": ["running", "jogging", "marathon", "run", "jog", "5k", "10k"],
    "electronics": ["wireless", "anc", "noise cancelling", "noise cancellation", "audio", "bass"],
    "smartwatch": ["heart rate", "spo2", "gps", "step count"],
}

KEYWORD_GROUPS: Dict[str, List[str]] = {
    "running": ["running", "runner", "run", "jogging", "jog"],
    "cushion": ["cushion", "cushioned", "cushioning", "foam", "plush"],
    "lightweight": ["light", "lightweight", "featherweight", "featherlight"],
    "marathon": ["marathon", "long distance"],
    "daily": ["daily", "everyday"],
    "waterproof": ["waterproof", "water resistant", "water-resistant", "rain"],
    "trail": ["trail", "off-road", "terrain", "hiking"],
    "fitness": ["heart rate", "fitness", "spo2"],
    "gps": ["gps"],
    "amoled": ["amoled"],
    "anc": ["anc", "noise cancelling", "noise canceling", "noise cancellation"],
    "sweat": ["sweat", "sweatproof", "sweat-proof", "ipx5", "ipx4"],
}

RELATIVE_CHEAPER = ["cheaper", "less expensive", "lower price", "more affordable", "budget option"]
RELATIVE_PREMIUM = ["more premium", "more expensive", "higher end", "high-end", "better one", "upgrade"]

_NUM = r"([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh|lakhs|l)?\b"
_CUR = r"(?:₹|rs\.?|inr)?\s*"

_RANGE_PATTERNS = [
    re.compile(rf"\b(?:between|from)\s+{_CUR}{_NUM}\s*(?:and|to|-)\s*{_CUR}{_NUM}"),
    re.compile(rf"{_CUR}{_NUM}\s*(?:-|to)\s*{_CUR}{_NUM}\s*(?:₹|rs\.?|rupees|inr)?\s*(?:budget|range)?"),
]
_MAX_PATTERN = re.compile(
    rf"\b(?:under|below|within|upto|up\s*to|less\s+than|max(?:imum)?|"
    rf"not\s+more\s+than|budget(?:\s+(?:of|is))?|around|about)\s+{_CUR}{_NUM}"
)
_MIN_PATTERN = re.compile(
    rf"\b(?:above|over|more\s+than|at\s+least|starting\s+(?:at|from)|min(?:imum)?)\s+{_CUR}{_NUM}"
)
_CURRENCY_PATTERN = re.compile(rf"(?:₹|\brs\.?|\binr)\s*{_NUM}|{_NUM}\s*(?:rupees|rs\b|inr\b)")


def _has_term(text: str, term: str) -> bool:
    return re.search(rf"(?<![\w-]){re.escape(term)}(?![\w-])", text) is not None


def _first_position(text: str, terms: List[str]) -> Optional[int]:
    positions = [
        m.start()
        for term in terms
        for m in [re.search(rf"(?<![\w-]){re.escape(term)}(?![\w-])", text)]
        if m
    ]
    return min(positions) if positions else None


def _to_amount(number: str, suffix: Optional[str]) -> Optional[float]:
    try:
        value = float(number.replace(",", ""))
    except ValueError:
        return None

    suffix = (suffix or "").lower()

    if suffix in ("k", "thousand"):
        value *= 1_000
    elif suffix in ("lakh", "lakhs", "l"):
        value *= 100_000

    return value


def extract_price_range(text: str) -> Tuple[Optional[float], Optional[float]]:
    """Return (min, max) in rupees from free text."""
    for index, pattern in enumerate(_RANGE_PATTERNS):
        match = pattern.search(text)
        if match:
            low = _to_amount(match.group(1), match.group(2))
            # "2-3k" means 2k-3k: carry the suffix back to the first number.
            high_suffix = match.group(4)
            if match.group(2) is None and high_suffix:
                low = _to_amount(match.group(1), high_suffix)
            high = _to_amount(match.group(3), high_suffix)
            # A bare "9 to 10" is a size, not a price.
            if index == 1 and (high is None or high < 100):
                continue
            if low is not None and high is not None:
                return (min(low, high), max(low, high))

    budget_min = budget_max = None

    match = _MAX_PATTERN.search(text)
    if match:
        budget_max = _to_amount(match.group(1), match.group(2))

    match = _MIN_PATTERN.search(text)
    if match:
        budget_min = _to_amount(match.group(1), match.group(2))

    if budget_max is None and budget_min is None:
        match = _CURRENCY_PATTERN.search(text)
        if match:
            number = match.group(1) or match.group(3)
            suffix = match.group(2) if match.group(1) else match.group(4)
            budget_max = _to_amount(number, suffix)

    return budget_min, budget_max


def detect_category(text: str) -> Optional[str]:
    best: Optional[Tuple[int, str]] = None

    for category, nouns in CATEGORY_NOUNS.items():
        position = _first_position(text, nouns)
        if position is not None and (best is None or position < best[0]):
            best = (position, category)

    if best:
        return best[1]

    for category, hints in CATEGORY_HINTS.items():
        if any(_has_term(text, hint) for hint in hints):
            return category

    return None


def extract_intent(user_text: str) -> ShoppingIntent:
    text = user_text.lower().strip()

    budget_min, budget_max = extract_price_range(text)

    keywords = [
        keyword
        for keyword, terms in KEYWORD_GROUPS.items()
        if any(_has_term(text, term) for term in terms)
    ]

    relative = None
    if any(_has_term(text, t) for t in RELATIVE_CHEAPER):
        relative = "cheaper"
    elif any(_has_term(text, t) for t in RELATIVE_PREMIUM):
        relative = "premium"

    return ShoppingIntent(
        category=detect_category(text),
        budget_max=budget_max,
        budget_min=budget_min,
        keywords=keywords,
        relative_price=relative,
    )
