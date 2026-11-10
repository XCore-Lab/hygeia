"""Request / response models for the API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Questionnaire(BaseModel):
    visible_change: bool | None = None
    age: int | None = Field(default=None, ge=12, le=110)
    sex_at_birth: Literal["male", "female", "intersex", "prefer_not_to_say"] | None = None
    symptoms: list[str] = Field(default_factory=list)
    duration: Literal["<1w", "1-4w", ">4w", "unknown"] | None = None
    pain: bool = False
    itching: bool = False
    changed: bool = False
    fever: bool = False
    exposure: Literal["none", "protected", "unprotected", "unknown"] | None = None
    partner_sti: bool = False
    prior_sti: bool = False
    notes: str = Field(default="", max_length=1000)


class AnalyzeOptions(BaseModel):
    likelihood_mode: Literal["single", "ensemble"] | None = None
    tta: bool | None = None
    segmentation: bool = True
    vlm: bool = True


class TriageRequest(BaseModel):
    questionnaire: Questionnaire = Field(default_factory=Questionnaire)


class ChatRequest(BaseModel):
    result_id: str
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    history: list[dict]
