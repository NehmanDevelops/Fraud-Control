"""
Model versioning and management system for FraudGuard.
Tracks model versions, performance metrics, and enables model comparison.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
import hashlib


@dataclass
class ModelVersion:
    """Represents a single model version."""
    
    version_id: str
    model_name: str
    created_at: str
    model_file: str
    scaler_file: Optional[str]
    training_samples: int
    metrics: Dict[str, float]
    hyperparameters: Dict[str, Any]
    features_count: int
    description: str
    is_production: bool = False
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "ModelVersion":
        """Create from dictionary."""
        return ModelVersion(**data)


class ModelVersionManager:
    """
    Manages model versions, tracks metrics, and handles model lifecycle.
    """
    
    def __init__(self, models_dir: str = "backend/models", registry_file: str = "backend/models/registry.json"):
        self.models_dir = Path(models_dir)
        self.registry_file = Path(registry_file)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file.parent.mkdir(parents=True, exist_ok=True)
        self.versions: Dict[str, List[ModelVersion]] = self._load_registry()
    
    def _load_registry(self) -> Dict[str, List[ModelVersion]]:
        """Load version registry from disk."""
        if not self.registry_file.exists():
            return {}
        
        try:
            with open(self.registry_file) as f:
                data = json.load(f)
                return {
                    model_name: [ModelVersion.from_dict(v) for v in versions]
                    for model_name, versions in data.items()
                }
        except Exception as e:
            print(f"Warning: Could not load registry: {e}")
            return {}
    
    def _save_registry(self) -> None:
        """Save version registry to disk."""
        data = {
            model_name: [v.to_dict() for v in versions]
            for model_name, versions in self.versions.items()
        }
        
        with open(self.registry_file, "w") as f:
            json.dump(data, f, indent=2)
    
    def _generate_version_id(self, model_name: str) -> str:
        """Generate a unique version ID."""
        timestamp = datetime.utcnow().isoformat().replace(":", "-").replace(".", "-")
        return f"{model_name}-{timestamp}"
    
    def register_version(
        self,
        model_name: str,
        model_file: str,
        metrics: Dict[str, float],
        hyperparameters: Dict[str, Any],
        features_count: int,
        training_samples: int,
        scaler_file: Optional[str] = None,
        description: str = "",
        tags: Optional[List[str]] = None,
    ) -> ModelVersion:
        """
        Register a new model version.
        
        Args:
            model_name: Name of the model
            model_file: Path to saved model file
            metrics: Model performance metrics
            hyperparameters: Model hyperparameters
            features_count: Number of features
            training_samples: Number of training samples
            scaler_file: Optional path to feature scaler
            description: Human-readable description
            tags: Optional list of tags
        
        Returns:
            Registered ModelVersion
        """
        version_id = self._generate_version_id(model_name)
        
        version = ModelVersion(
            version_id=version_id,
            model_name=model_name,
            created_at=datetime.utcnow().isoformat(),
            model_file=str(model_file),
            scaler_file=str(scaler_file) if scaler_file else None,
            training_samples=training_samples,
            metrics=metrics,
            hyperparameters=hyperparameters,
            features_count=features_count,
            description=description,
            tags=tags or [],
        )
        
        if model_name not in self.versions:
            self.versions[model_name] = []
        
        self.versions[model_name].append(version)
        self._save_registry()
        
        return version
    
    def get_version(self, model_name: str, version_id: str) -> Optional[ModelVersion]:
        """Get a specific model version."""
        if model_name not in self.versions:
            return None
        
        for version in self.versions[model_name]:
            if version.version_id == version_id:
                return version
        
        return None
    
    def get_latest_version(self, model_name: str) -> Optional[ModelVersion]:
        """Get the latest version of a model."""
        if model_name not in self.versions or not self.versions[model_name]:
            return None
        
        return self.versions[model_name][-1]
    
    def get_production_version(self, model_name: str) -> Optional[ModelVersion]:
        """Get the production version of a model."""
        if model_name not in self.versions:
            return None
        
        for version in reversed(self.versions[model_name]):
            if version.is_production:
                return version
        
        return None
    
    def list_versions(self, model_name: str) -> List[ModelVersion]:
        """List all versions of a model."""
        return self.versions.get(model_name, [])
    
    def promote_to_production(self, model_name: str, version_id: str) -> bool:
        """
        Promote a version to production status.
        Demotes any previously production version.
        """
        version = self.get_version(model_name, version_id)
        if not version:
            return False
        
        # Demote all other versions
        for v in self.versions.get(model_name, []):
            v.is_production = False
        
        # Promote this version
        version.is_production = True
        self._save_registry()
        
        return True
    
    def add_tag(self, model_name: str, version_id: str, tag: str) -> bool:
        """Add a tag to a model version."""
        version = self.get_version(model_name, version_id)
        if not version:
            return False
        
        if tag not in version.tags:
            version.tags.append(tag)
            self._save_registry()
        
        return True
    
    def compare_versions(
        self,
        model_name: str,
        version_id_1: str,
        version_id_2: str,
    ) -> Dict[str, Any]:
        """
        Compare two model versions.
        
        Returns:
            Dictionary with comparison metrics
        """
        v1 = self.get_version(model_name, version_id_1)
        v2 = self.get_version(model_name, version_id_2)
        
        if not v1 or not v2:
            return {}
        
        # Find common metrics
        all_metric_keys = set(v1.metrics.keys()) | set(v2.metrics.keys())
        
        comparison = {
            "model": model_name,
            "version_1": version_id_1,
            "version_2": version_id_2,
            "created_at_1": v1.created_at,
            "created_at_2": v2.created_at,
            "metrics_comparison": {},
        }
        
        for metric_key in all_metric_keys:
            val1 = v1.metrics.get(metric_key, None)
            val2 = v2.metrics.get(metric_key, None)
            
            comparison["metrics_comparison"][metric_key] = {
                "version_1": val1,
                "version_2": val2,
                "improvement": None,
            }
            
            if val1 is not None and val2 is not None and isinstance(val1, (int, float)):
                improvement = val2 - val1
                comparison["metrics_comparison"][metric_key]["improvement"] = round(improvement, 4)
        
        return comparison
    
    def delete_version(self, model_name: str, version_id: str) -> bool:
        """
        Delete a model version (but keep registry entry).
        Does not delete if it's production version.
        """
        version = self.get_version(model_name, version_id)
        if not version or version.is_production:
            return False
        
        # Delete model file
        if Path(version.model_file).exists():
            Path(version.model_file).unlink()
        
        if version.scaler_file and Path(version.scaler_file).exists():
            Path(version.scaler_file).unlink()
        
        # Keep registry entry for audit trail
        return True
    
    def get_registry_summary(self) -> Dict[str, Any]:
        """Get summary of all registered models."""
        summary = {}
        
        for model_name, versions in self.versions.items():
            summary[model_name] = {
                "total_versions": len(versions),
                "latest_version": versions[-1].version_id if versions else None,
                "production_version": next(
                    (v.version_id for v in reversed(versions) if v.is_production),
                    None
                ),
                "versions": [
                    {
                        "version_id": v.version_id,
                        "created_at": v.created_at,
                        "recall": v.metrics.get("recall", None),
                        "precision": v.metrics.get("precision", None),
                        "f1": v.metrics.get("f1_score", None),
                        "is_production": v.is_production,
                    }
                    for v in versions
                ],
            }
        
        return summary


# Global instance
_manager: Optional[ModelVersionManager] = None


def get_version_manager() -> ModelVersionManager:
    """Get or create global version manager."""
    global _manager
    if _manager is None:
        _manager = ModelVersionManager()
    return _manager
