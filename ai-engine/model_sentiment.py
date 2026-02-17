import logging
try:
    from transformers import pipeline
except ImportError:
    pipeline = None

logger = logging.getLogger(__name__)

class SentimentModel:
    def __init__(self):
        self.pipeline = None
        self._load_model()

    def _load_model(self):
        if pipeline is None:
            logger.error("Transformers library not installed.")
            return

        try:
            logger.info("Loading FinBERT model from Hugging Face...")
            # Use a smaller/distilled model or the specific FinBERT if available
            # 'ProsusAI/finbert' is standard but heavy. 
            # We wrap in try-except to fallback if download fails or internet is restricted
            self.pipeline = pipeline("text-classification", model="ProsusAI/finbert")
            logger.info("FinBERT Model Loaded Successfully.")
        except Exception as e:
            logger.error(f"Failed to load FinBERT model: {e}")
            self.pipeline = None

    def analyze(self, text):
        """
        Returns sentiment score: -1 (Negative) to 1 (Positive)
        """
        if not self.pipeline:
            logger.warning("Sentiment model not loaded. Returning Neutral (0).")
            return 0.0

        try:
            # Output format: [{'label': 'positive', 'score': 0.95}]
            result = self.pipeline(text)[0]
            label = result['label'].lower()
            score = result['score']

            if label == 'positive':
                return score
            elif label == 'negative':
                return -score
            else: # neutral
                return 0.0
        except Exception as e:
            logger.error(f"Error analyzing text: {e}")
            return 0.0
