import pytest
import numpy as np
from model_price import PriceModel
from model_sentiment import SentimentModel

@pytest.fixture
def price_model():
    return PriceModel()

@pytest.fixture
def sentiment_model():
    return SentimentModel()

def test_price_model_initialization(price_model):
    """Test if price model initializes and trains on synthetic data."""
    assert price_model.is_trained == True
    assert price_model.model is not None
    assert price_model.scaler is not None

def test_price_model_prediction_format(price_model):
    """Test if prediction returns a float between 0 and 1."""
    # [RSI, MACD, Volume, Change, Volatility]
    features = [50, 0, 0.5, 0.0, 0.5]
    prob = price_model.predict(features)
    assert isinstance(prob, float)
    assert 0.0 <= prob <= 1.0

def test_price_model_logic_buy(price_model):
    """Test if model learns the 'RSI < 35 & MACD > -0.5' rule for BUY."""
    # Strong Buy Signal: RSI=20, MACD=1.0
    features = [20, 1.0, 0.5, 0.01, 0.2]
    prob = price_model.predict(features)
    # Expect high probability for Buy (Class 1)
    assert prob > 0.5

def test_price_model_logic_sell(price_model):
    """Test if model learns the 'RSI > 65 & MACD < 0.5' rule for SELL."""
    # Strong Sell Signal: RSI=80, MACD=-1.0
    features = [80, -1.0, 0.5, -0.01, 0.2]
    prob = price_model.predict(features)
    # Expect low probability for Buy (Class 1), meaning High for Sell
    assert prob < 0.5

def test_sentiment_model_loading(sentiment_model):
    """Test if sentiment model loads (or handles failure gracefully)."""
    # If transformers is installed and intent works, predictions should be valid
    # If not, it should return 0.0 safely
    score = sentiment_model.analyze("Bitcoin is crashing due to regulation.")
    assert isinstance(score, float)
    assert -1.0 <= score <= 1.0

def test_sentiment_analysis_logic(sentiment_model):
    """Test basic sentiment logic if model is active."""
    if sentiment_model.pipeline:
        pos_score = sentiment_model.analyze("Bitcoin hits all-time high!")
        neg_score = sentiment_model.analyze("Market crashes, investors panic.")
        
        assert pos_score > 0
        assert neg_score < 0
