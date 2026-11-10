"""DINOv2 ViT backbone + CLS/mean-patch fusion + MLP head.

A faithful, dependency-free copy of `STD_model_train/src/models/dinov2_classifier.py`
and `heads.py`, so the serving layer can rebuild the architecture from the
configuration embedded in the checkpoint (technical doc section 35.3).
State-dict keys (`backbone.*`, `head.*`) match the training code exactly.
"""
from __future__ import annotations

import timm
import torch
import torch.nn as nn


class AttentionPool(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.score = nn.Sequential(nn.LayerNorm(dim), nn.Linear(dim, dim // 4),
                                   nn.Tanh(), nn.Linear(dim // 4, 1))

    def forward(self, tokens):
        w = torch.softmax(self.score(tokens), dim=1)
        return (w * tokens).sum(dim=1)


def build_head(kind, feature_dim, num_classes, hidden1=512, hidden2=256,
               dropout1=0.30, dropout2=0.20):
    if kind == "linear":
        return nn.Sequential(nn.LayerNorm(feature_dim), nn.Linear(feature_dim, num_classes))
    if kind == "mlp":
        return nn.Sequential(
            nn.LayerNorm(feature_dim),
            nn.Linear(feature_dim, hidden1), nn.GELU(), nn.Dropout(dropout1),
            nn.Linear(hidden1, hidden2), nn.GELU(), nn.Dropout(dropout2),
            nn.Linear(hidden2, num_classes),
        )
    raise ValueError(f"unknown head kind: {kind}")


class DINOv2Classifier(nn.Module):
    def __init__(self, backbone_name, num_classes, img_size=224, pooling="cls_patch_fusion",
                 head="mlp", hidden1=512, hidden2=256, dropout1=0.30, dropout2=0.20,
                 pretrained=False, grad_checkpointing=False):
        super().__init__()
        self.backbone_name = backbone_name
        self.pooling = pooling
        self.img_size = img_size
        self.backbone = timm.create_model(backbone_name, pretrained=pretrained,
                                          num_classes=0, img_size=img_size)
        self.embed_dim = self.backbone.embed_dim
        self.num_prefix = getattr(self.backbone, "num_prefix_tokens", 1)
        # alias kept so state-dict keys (`blocks.*`) match the training checkpoint exactly
        self.blocks = self.backbone.blocks
        self.num_blocks = len(self.blocks)
        self.patch_size = self.backbone.patch_embed.patch_size[0]
        self.attn_pool = AttentionPool(self.embed_dim) if pooling == "attn_pool" else None
        feature_dim = self.embed_dim * (2 if pooling in ("cls_patch_fusion", "attn_pool") else 1)
        self.feature_dim = feature_dim
        self.head = build_head(head, feature_dim, num_classes, hidden1, hidden2, dropout1, dropout2)

    def tokens(self, x):
        return self.backbone.forward_features(x)  # [B, prefix+N, D]

    def pool(self, tokens):
        cls = tokens[:, 0]
        patches = tokens[:, self.num_prefix:]
        if self.pooling == "cls":
            return cls
        if self.pooling == "mean":
            return patches.mean(dim=1)
        if self.pooling == "cls_patch_fusion":
            return torch.cat([cls, patches.mean(dim=1)], dim=-1)
        if self.pooling == "attn_pool":
            return torch.cat([cls, self.attn_pool(patches)], dim=-1)
        raise ValueError(f"unknown pooling: {self.pooling}")

    def extract_features(self, x):
        return self.pool(self.tokens(x))

    def forward(self, x):
        return self.head(self.extract_features(x))

    @classmethod
    def from_checkpoint(cls, ckpt: dict) -> "DINOv2Classifier":
        cfg = ckpt["config"]
        model = cls(
            backbone_name=cfg["backbone"], num_classes=len(ckpt["classes"]),
            img_size=cfg.get("img_size", 224), pooling=cfg.get("pooling", "cls_patch_fusion"),
            head=cfg.get("head", "mlp"), hidden1=cfg.get("hidden1", 512), hidden2=cfg.get("hidden2", 256),
            dropout1=cfg.get("dropout1", 0.3), dropout2=cfg.get("dropout2", 0.2), pretrained=False,
        )
        missing, unexpected = model.load_state_dict(ckpt["model"], strict=True)
        return model
