from app.train import train


def test_models_train_and_are_accurate(tmp_path):
    info = train(seed=3, artifacts_dir=tmp_path)
    assert info["archetypeValAccuracy"] >= 0.8
    assert info["interestValAccuracy"] >= 0.55  # tiers overlap by design
    assert (tmp_path / "archetype.joblib").exists()
    assert (tmp_path / "interest.joblib").exists()
