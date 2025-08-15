from datetime import datetime, timedelta

class RetirementDialog:
    def __init__(self):
        self.is_open = False
        self.current_word = None
        self.confirmation_callback = None
    
    def show_retirement_confirmation(self, word_text: str, on_confirm_callback):
        self.is_open = True
        self.current_word = word_text
        self.confirmation_callback = on_confirm_callback
        
        print(f"\n{'='*50}")
        print("RETIREMENT CONFIRMATION DIALOG")
        print(f"{'='*50}")
        print(f"Word: '{word_text}'")
        print()
        print("Are you sure you want to retire this word?")
        print()
        print("This word will be hidden from your daily practice")
        print("and will automatically reappear after 100 days for review.")
        print()
        
        # Calculate return date
        return_date = (datetime.now() + timedelta(days=100)).strftime('%Y-%m-%d')
        print(f"The word will return on: {return_date}")
        print()
        
        # Simulate user interaction
        response = self._get_user_response()
        
        if response:
            print("✓ Word retirement confirmed")
            if self.confirmation_callback:
                self.confirmation_callback()
        else:
            print("✗ Word retirement cancelled")
        
        self._close_dialog()
    
    def _get_user_response(self) -> bool:
        print("Options:")
        print("1. Confirm retirement (y/yes)")
        print("2. Cancel (n/no)")
        print()
        
        # For demo purposes, simulate user confirmation
        # In real implementation, this would wait for user input
        simulated_response = "y"  # Simulate user confirming
        print(f"User response (simulated): {simulated_response}")
        
        return simulated_response.lower() in ['y', 'yes', '1']
    
    def _close_dialog(self):
        self.is_open = False
        self.current_word = None
        self.confirmation_callback = None
        print(f"{'='*50}")
        print("Dialog closed")
        print()
    
    def is_dialog_open(self) -> bool:
        return self.is_open