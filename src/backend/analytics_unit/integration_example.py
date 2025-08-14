#!/usr/bin/env python3
"""
Integration example showing how the Analytics Unit
integrates with other units and the frontend
"""

from simple_demo import (
    VocabularyAnalyticsService, UserActivityAnalyticsService,
    InMemoryVocabularyAnalyticsRepository, InMemoryUserActivityMetricsRepository
)

class AnalyticsBackend:
    """
    Main analytics backend service that integrates with other units
    """
    
    def __init__(self):
        # Initialize repositories
        self.vocab_repo = InMemoryVocabularyAnalyticsRepository()
        self.metrics_repo = InMemoryUserActivityMetricsRepository()
        
        # Initialize services
        self.vocab_service = VocabularyAnalyticsService(self.vocab_repo)
        self.activity_service = UserActivityAnalyticsService(self.metrics_repo)
    
    def process_learning_progress_event(self, user_id: str, word_id: str, category_id: str, 
                                      is_correct: bool, response_time: int) -> dict:
        """
        Process analytics from learning progress events
        This would be called when the Learning Progress Unit publishes events
        """
        try:
            # Record user activity
            self.activity_service.record_user_activity(user_id)
            
            # Process vocabulary analytics
            self.vocab_service.process_review_event(word_id, category_id, is_correct, response_time)
            
            return {
                "success": True,
                "message": "Analytics processed successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_admin_dashboard_data(self) -> dict:
        """
        Get comprehensive analytics data for admin dashboard
        """
        try:
            # Get user activity metrics
            activity_metrics = self.activity_service.get_activity_metrics()
            
            # Get vocabulary analytics
            popular_words = self.vocab_service.get_popular_words(10)
            difficult_words = self.vocab_service.get_difficult_words(0.7, 10)
            
            return {
                "success": True,
                "data": {
                    "user_activity": activity_metrics,
                    "popular_vocabulary": popular_words,
                    "difficult_vocabulary": difficult_words,
                    "generated_at": activity_metrics["generated_at"]
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_vocabulary_insights(self, category_id: str = None) -> dict:
        """
        Get insights about vocabulary usage and difficulty
        """
        try:
            popular = self.vocab_service.get_popular_words(5)
            difficult = self.vocab_service.get_difficult_words(0.6, 5)
            
            # Calculate overall statistics
            all_words = self.vocab_repo.find_most_reviewed(100)  # Get all words
            if all_words:
                total_reviews = sum(w.review_metrics.total_reviews for w in all_words)
                total_correct = sum(w.accuracy_metrics.correct_reviews for w in all_words)
                overall_accuracy = (total_correct / total_reviews * 100) if total_reviews > 0 else 0
                avg_response_time = sum(w.review_metrics.average_response_time for w in all_words) // len(all_words)
            else:
                total_reviews = 0
                overall_accuracy = 0
                avg_response_time = 0
            
            return {
                "success": True,
                "data": {
                    "overview": {
                        "total_words_reviewed": len(all_words),
                        "total_reviews": total_reviews,
                        "overall_accuracy": round(overall_accuracy, 1),
                        "average_response_time": avg_response_time
                    },
                    "popular_words": popular,
                    "difficult_words": difficult
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

def demo_integration():
    """
    Demonstrate integration between Analytics Unit and other components
    """
    print("=== Analytics Integration Demo ===\n")
    
    # Initialize analytics backend
    analytics = AnalyticsBackend()
    
    print("1. Simulating events from Learning Progress Unit...")
    # Simulate events that would come from the Learning Progress Unit
    learning_events = [
        ("user1", "hello", "greetings", True, 1200),
        ("user2", "goodbye", "greetings", True, 1500),
        ("user1", "difficult", "advanced", False, 3000),
        ("user3", "hello", "greetings", True, 1100),
        ("user2", "difficult", "advanced", False, 2800),
        ("user1", "easy", "basic", True, 800),
        ("user4", "hello", "greetings", True, 1300),
        ("user3", "difficult", "advanced", False, 3200),
        ("user5", "easy", "basic", True, 900),
        ("user2", "hello", "greetings", True, 1000),
    ]
    
    for user_id, word_id, category_id, is_correct, response_time in learning_events:
        result = analytics.process_learning_progress_event(
            user_id, word_id, category_id, is_correct, response_time
        )
        print(f"Processed event from {user_id} for '{word_id}': {result['message']}")
    
    print("\n2. Getting admin dashboard data...")
    dashboard_data = analytics.get_admin_dashboard_data()
    if dashboard_data["success"]:
        data = dashboard_data["data"]
        print(f"Active users: {data['user_activity']['daily_active_users']}")
        print(f"Popular words: {len(data['popular_vocabulary']['words'])}")
        print(f"Difficult words: {len(data['difficult_vocabulary']['words'])}")
    
    print("\n3. Getting vocabulary insights...")
    insights = analytics.get_vocabulary_insights()
    if insights["success"]:
        overview = insights["data"]["overview"]
        print(f"Total words reviewed: {overview['total_words_reviewed']}")
        print(f"Total reviews: {overview['total_reviews']}")
        print(f"Overall accuracy: {overview['overall_accuracy']}%")
        print(f"Average response time: {overview['average_response_time']}ms")
    
    print("\n4. Detailed vocabulary analysis:")
    popular_words = insights["data"]["popular_words"]["words"]
    for word in popular_words:
        print(f"  Popular: {word['word_id']} - {word['total_reviews']} reviews, {word['accuracy_rate']}% accuracy")
    
    difficult_words = insights["data"]["difficult_words"]["words"]
    for word in difficult_words:
        print(f"  Difficult: {word['word_id']} - {word['accuracy_rate']}% accuracy, {word['total_reviews']} reviews")
    
    print("\n=== Integration demo completed! ===")
    print("\nThis analytics backend can be integrated by:")
    print("- Subscribing to events from Learning Progress Unit")
    print("- Providing REST API endpoints for admin dashboard")
    print("- Generating automated reports and insights")
    print("- Feeding data to external analytics platforms")
    print("- Supporting real-time analytics dashboards")

if __name__ == "__main__":
    demo_integration()