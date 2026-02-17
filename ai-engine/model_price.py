import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import logging

logger = logging.getLogger(__name__)

class PriceModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self._train_initial_model()

    def _train_initial_model(self):
        """Trains the model on synthetic data representing profitable patterns."""
        logger.info("Training Price Action Model on synthetic data...")
        
        # Synthetic Data Generation
        # Features: [RSI (0-100), MACD (-5 to 5), Volume (0-1), PriceChange (-0.1 to 0.1), Volatility (0-1)]
        # Rules for 'profitable' patterns:
        # 1. Buy if RSI < 30 (Oversold) AND MACD > 0 (Momentum)
        # 2. Sell if RSI > 70 (Overbought) AND MACD < 0
        
        n_samples = 1000
        X = []
        y = []

        for _ in range(n_samples):
            rsi = np.random.uniform(10, 90)
            macd = np.random.uniform(-2, 2)
            volume = np.random.random()
            price_change = np.random.uniform(-0.05, 0.05)
            volatility = np.random.random()
            
            features = [rsi, macd, volume, price_change, volatility]
            
            # Label Logic
            label = 0 # HOLD/SELL
            if rsi < 35 and macd > -0.5:
                label = 1 # BUY
            elif rsi > 65 and macd < 0.5:
                label = 0 # SELL
            else:
                 # Random noise for Hold/Neutral, mapped to 0 for binary classification
                 label = 0 if np.random.random() > 0.3 else 1 # Slight bias

            X.append(features)
            y.append(label)

        X = np.array(X)
        y = np.array(y)

        # Scale and Train
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        logger.info("Price Model Level-1 Training Complete.")

    def predict(self, features):
        """
        Predicts BUY probability.
        Features: [RSI, MACD, Volume, PriceChange, Volatility]
        """
        if not self.is_trained:
             logger.warning("Model not trained, returning random prediction")
             return np.random.random()

        features_np = np.array(features).reshape(1, -1)
        features_scaled = self.scaler.transform(features_np)
        
        # Get probability of Class 1 (BUY)
        buy_prob = self.model.predict_proba(features_scaled)[0][1]
        return float(buy_prob)

    def save(self, path="price_model.joblib"):
        joblib.dump((self.model, self.scaler), path)

    def load(self, path="price_model.joblib"):
        self.model, self.scaler = joblib.load(path)
        self.is_trained = True
