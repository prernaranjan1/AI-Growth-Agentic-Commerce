"""Post-generation checks on the LLM's reply.

The prompt tells Gemini to use only catalog facts. This module checks that
it did: every rupee amount in the reply must be a real price (or a number
the customer gave), and the reply must name a product we actually returned.
A reply that fails is replaced by the deterministic one.
"""

import re
from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Set

from models.catalog import Product


_AMOUNT = re.compile(
    r"(?:₹|\brs\.?|\binr)\s*([\d,]+(?:\.\d+)?)\s*(k\b)?"
    r"|([\d,]+(?:\.\d+)?)\s*(k\b)?\s*(?:rupees|rs\b|inr\b|/-)",
    re.IGNORECASE,
)


@dataclass
class GuardrailResult:
    passed: bool
    problems: List[str] = field(default_factory=list)
    amounts_checked: int = 0


def _amounts_in(text: str) -> List[float]:
    amounts = []
    for groups in _AMOUNT.findall(text):
        number = groups[0] or groups[2]
        suffix = groups[1] or groups[3]
        try:
            value = float(number.replace(",", ""))
        except ValueError:
            continue
        amounts.append(value * 1000 if suffix else value)
    return amounts


def _allowed_amounts(
    products: Iterable[Product],
    extra: Iterable[Optional[float]],
) -> Set[float]:
    allowed: Set[float] = set()

    for p in products:
        allowed.update({p.price, p.original_price, p.original_price - p.price})

    allowed.update(v for v in extra if v is not None)

    return {round(v, 2) for v in allowed}


def check_reply(
    reply: str,
    products: List[Product],
    upsells: List[Product],
    customer_amounts: Iterable[Optional[float]] = (),
    bundle_saving: Optional[float] = None,
) -> GuardrailResult:
    problems: List[str] = []
    customer_amounts = [a for a in customer_amounts if a is not None]

    allowed = _allowed_amounts(
        [*products, *upsells],
        [*customer_amounts, bundle_saving],
    )

    amounts = _amounts_in(reply)

    for amount in amounts:
        if not any(abs(amount - a) < 0.5 for a in allowed):
            problems.append(f"₹{amount:,.0f} is not a catalog price")

    lowered = reply.lower()

    if products:
        if not any(p.name.lower() in lowered for p in products):
            problems.append("reply does not name any returned product")
    elif amounts and not customer_amounts:
        problems.append("reply quotes prices but no products were found")

    return GuardrailResult(
        passed=not problems,
        problems=problems,
        amounts_checked=len(amounts),
    )
