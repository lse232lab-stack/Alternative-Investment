from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


SourceType = Literal["Disclosure", "Market Report", "News", "Model Assumption"]
Confidence = Literal["High", "Medium", "Low"]
EvidenceStatus = Literal["Confirmed", "Public reference", "Modeled estimate", "To verify"]


@dataclass(frozen=True)
class SourceItem:
    field: str
    value: str
    evidence_status: EvidenceStatus
    source_type: SourceType
    confidence: Confidence
    source_name: str
    source_url: str
    note: str


@dataclass(frozen=True)
class AssetProfileItem:
    item: str
    value: str
    evidence_status: EvidenceStatus
    source_name: str
    source_url: str
    memo_use: str


def source_items_as_rows(items: list[SourceItem]) -> list[dict[str, str]]:
    return [
        {
            "Field": item.field,
            "Value": item.value,
            "Evidence Status": item.evidence_status,
            "Source Type": item.source_type,
            "Confidence": item.confidence,
            "Source Name": item.source_name,
            "Source URL": item.source_url,
            "Note": item.note,
        }
        for item in items
    ]


def asset_profile_as_rows(items: list[AssetProfileItem]) -> list[dict[str, str]]:
    return [
        {
            "Item": item.item,
            "Value": item.value,
            "Evidence Status": item.evidence_status,
            "Source Name": item.source_name,
            "Source URL": item.source_url,
            "Memo Use": item.memo_use,
        }
        for item in items
    ]
