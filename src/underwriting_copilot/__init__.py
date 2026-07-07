"""Alternative investment underwriting copilot."""

from .alternative_models import (
    GenericAlternativeAssumptions,
    GenericAlternativeResult,
    alternative_asset_catalog,
    default_generic_assumptions,
    underwrite_generic,
)
from .engine import underwrite
from .infra_models import InfraAssumptions, InfraResult, underwrite_infra
from .institution_lens import build_institution_views
from .models import DealAssumptions, UnderwritingResult
from .sample_deals import sample_deals

__all__ = [
    "DealAssumptions",
    "GenericAlternativeAssumptions",
    "GenericAlternativeResult",
    "InfraAssumptions",
    "InfraResult",
    "UnderwritingResult",
    "alternative_asset_catalog",
    "build_institution_views",
    "default_generic_assumptions",
    "sample_deals",
    "underwrite",
    "underwrite_generic",
    "underwrite_infra",
]
