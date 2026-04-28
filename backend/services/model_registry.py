import json
import pickle
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


_PROJECT_ROOT = Path(__file__).resolve().parents[2]
RUNS_ROOT = _PROJECT_ROOT / "artifacts" / "model_runs"


def _ensure_runs_root(root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)


def _normalize_model_key(model_type: str) -> str:
    return model_type.strip().lower().replace("/", "_").replace(" ", "_")


def _metadata_files(root: Path) -> List[Path]:
    if not root.exists():
        return []
    return list(root.glob("*/metadata.json"))


def _next_version(model_type: str, root: Path) -> str:
    model_key = _normalize_model_key(model_type)
    max_version = 0

    for metadata_file in _metadata_files(root):
        try:
            payload = json.loads(metadata_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        if payload.get("model_key") != model_key:
            continue
        version_number = int(payload.get("version_number", 0))
        max_version = max(max_version, version_number)

    return f"{model_key}-v{max_version + 1:04d}"


def save_training_run(
    *,
    model_type: str,
    metrics: Dict[str, Any],
    training_config: Dict[str, Any],
    preprocessing_summary: Dict[str, Any],
    backtest: Optional[Dict[str, Any]] = None,
    error_analysis: Optional[Dict[str, Any]] = None,
    split_summary: Optional[Dict[str, Any]] = None,
    artifact_payload: Optional[Dict[str, Any]] = None,
    root: Optional[Path] = None,
) -> Dict[str, Any]:
    runs_root = root or RUNS_ROOT
    _ensure_runs_root(runs_root)

    now = datetime.now(timezone.utc)
    model_key = _normalize_model_key(model_type)
    version = _next_version(model_type, runs_root)
    version_number = int(version.rsplit("v", 1)[1])
    run_id = f"{now.strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}"
    run_dir = runs_root / run_id
    run_dir.mkdir(parents=True, exist_ok=False)

    artifact_files: List[str] = []
    artifact_payload = artifact_payload or {}

    trained_model = artifact_payload.get("trained_model")
    if trained_model is not None:
        model_path = run_dir / ("model.keras" if model_key in {"lstm", "gru", "bilstm"} else "model.pkl")
        if model_key in {"lstm", "gru", "bilstm"}:
            trained_model.save(model_path)
        else:
            with model_path.open("wb") as fh:
                pickle.dump(trained_model, fh)
        artifact_files.append(model_path.name)

    scaler = artifact_payload.get("scaler")
    if scaler is not None:
        scaler_path = run_dir / "scaler.pkl"
        with scaler_path.open("wb") as fh:
            pickle.dump(scaler, fh)
        artifact_files.append(scaler_path.name)

    extra_artifacts = artifact_payload.get("extra_artifacts", {})
    for filename, payload in extra_artifacts.items():
        target = run_dir / filename
        if isinstance(payload, (dict, list)):
            target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        elif isinstance(payload, str):
            target.write_text(payload, encoding="utf-8")
        else:
            with target.open("wb") as fh:
                pickle.dump(payload, fh)
        artifact_files.append(target.name)

    metadata = {
        "run_id": run_id,
        "model_type": model_type,
        "model_key": model_key,
        "model_version": version,
        "version_number": version_number,
        "created_at": now.isoformat(),
        "artifact_dir": str(run_dir),
        "artifact_files": artifact_files,
        "metrics": metrics,
        "training_config": training_config,
        "preprocessing_summary": preprocessing_summary,
        "backtest": backtest,
        "error_analysis": error_analysis,
        "split_summary": split_summary,
    }
    (run_dir / "metadata.json").write_text(
      json.dumps(metadata, ensure_ascii=False, indent=2),
      encoding="utf-8",
    )
    return metadata


def list_training_runs(root: Optional[Path] = None) -> List[Dict[str, Any]]:
    runs_root = root or RUNS_ROOT
    payloads: List[Dict[str, Any]] = []

    for metadata_file in _metadata_files(runs_root):
        try:
            payload = json.loads(metadata_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        payloads.append(payload)

    payloads.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return payloads


def get_training_run(run_id: str, root: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    runs_root = root or RUNS_ROOT
    metadata_file = runs_root / run_id / "metadata.json"
    if not metadata_file.exists():
        return None
    return json.loads(metadata_file.read_text(encoding="utf-8"))
