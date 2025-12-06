class AITextAutocompleter {
  constructor() {
    this.suggestionBox = null;
    this.currentTextarea = null;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.timeoutId = null;
    this.debounceDelay = 500; // 100ms debounce delay
    this.inputEventListener = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for focus on textareas and contenteditable elements
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        this.handleFocus(e.target);
      }
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        this.handleBlur(e.target);
      }
    });

    // Handle keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleFocus(element) {
    this.currentTextarea = element;
    this.hideSuggestionBox();
    
    // Add input event listener to the active textarea
    this.inputEventListener = this.handleInput.bind(this)
    this.currentTextarea.addEventListener('input', this.inputEventListener);
  }

  handleBlur(element) {
    this.currentTextarea.removeEventListener('input', this.inputEventListener);
    this.hideSuggestionBox();
    this.currentTextarea = null;
  }

  async handleInput() {
    // Clear any existing timeout to debounce the input
    if (this.timeoutId) {
      console.log(`Clearing timeout ${this.timeoutId}`)
      clearTimeout(this.timeoutId);
    }

    const text = this.currentTextarea.value || this.currentTextarea.innerText;
    if (!text.trim()) {
      this.hideSuggestionBox();
      return;
    }

    // Set a new timeout
    this.timeoutId = setTimeout(async () => {

      try {
        // Get suggestion from background script
        console.log("getting suggestion...")
        const suggestion_response = await this.getSuggestion(text);
        suggestion_response.received_message = new Date().toISOString()
        console.log(suggestion_response)
        const suggestion = suggestion_response.suggestion;

        if (suggestion && suggestion.length > 0) {
          this.suggestions = [suggestion];
          this.showSuggestions(this.suggestions);
        } else {
          this.hideSuggestionBox();
        }
      } catch (error) {
        console.error('Error getting suggestions:', error);
        this.hideSuggestionBox();
      }
    }, this.debounceDelay);
    console.log(`Set timeout to ${this.timeoutId}`)
  }

  async getSuggestion(text) {
    // This will be implemented in the background script
    return new Promise((resolve) => {
      let cursorPosition = this.currentTextarea.selectionStart
      let textBefore = text.substring(0, cursorPosition)
      let textAfter = text.substring(cursorPosition)
      console.log(`Getting suggestion for ${textBefore} | ${textAfter}`)

      chrome.runtime.sendMessage(
        { type: 'GET_SUGGESTION', textBefore, textAfter },
        (suggestion_response) => {
          resolve(suggestion_response);
        }
      );
    });
  }

  showSuggestions(suggestions) {
    if (!this.suggestionBox) {
      this.createSuggestionBox();
    }

    const list = this.suggestionBox.querySelector('ul');
    list.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
      const li = document.createElement('li');
      li.textContent = suggestion;
      li.dataset.index = index;
      li.addEventListener('click', () => this.selectSuggestion(index));
      list.appendChild(li);
    });

    this.positionSuggestionBox();
    this.suggestionBox.style.display = 'block';
    this.selectedIndex = -1;
  }

  createSuggestionBox() {
    this.suggestionBox = document.createElement('div');
    this.suggestionBox.id = 'ai-autocomplete-suggestions';
    this.suggestionBox.innerHTML = `
      <ul></ul>
    `;
    document.body.appendChild(this.suggestionBox);
  }

  positionSuggestionBox() {
    if (!this.currentTextarea || !this.suggestionBox) return;

    const rect = this.currentTextarea.getBoundingClientRect();
    this.suggestionBox.style.top = `${window.scrollY + rect.bottom}px`;
    this.suggestionBox.style.left = `${window.scrollX + rect.left}px`;
    this.suggestionBox.style.width = `${rect.width}px`;
  }

  hideSuggestionBox() {
    if (this.suggestionBox) {
      this.suggestionBox.style.display = 'none';
      this.selectedIndex = -1;
    }
  }

  handleKeyDown(event) {
    if (!this.suggestionBox || this.suggestionBox.style.display === 'none') {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectNextSuggestion();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectPreviousSuggestion();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          this.applySuggestion(this.selectedIndex);
        }
        break;
      case 'Escape':
        this.hideSuggestionBox();
        break;
    }
  }

  selectNextSuggestion() {
    if (this.suggestions.length === 0) return;
    
    const items = this.suggestionBox.querySelectorAll('li');
    if (this.selectedIndex >= 0) {
      items[this.selectedIndex].classList.remove('selected');
    }
    
    this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
    items[this.selectedIndex].classList.add('selected');
    items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
  }

  selectPreviousSuggestion() {
    if (this.suggestions.length === 0) return;
    
    const items = this.suggestionBox.querySelectorAll('li');
    if (this.selectedIndex >= 0) {
      items[this.selectedIndex].classList.remove('selected');
    }
    
    this.selectedIndex = (this.selectedIndex - 1 + this.suggestions.length) % this.suggestions.length;
    items[this.selectedIndex].classList.add('selected');
    items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
  }

  applySuggestion(index) {
    if (index < 0 || index >= this.suggestions.length) return;
    
    const suggestion = this.suggestions[index];
    
    if (this.currentTextarea.tagName === 'TEXTAREA') {
      const startPos = this.currentTextarea.selectionStart;
      const endPos = this.currentTextarea.selectionEnd;
      const text = this.currentTextarea.value;
      
      this.currentTextarea.value = text.substring(0, startPos) + suggestion + text.substring(endPos);
      
      // Move cursor to the end of the inserted text
      const newCursorPos = startPos + suggestion.length;
      this.currentTextarea.setSelectionRange(newCursorPos, newCursorPos);
    } else if (this.currentTextarea.isContentEditable) {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(suggestion));
      
      // Move cursor to the end of the inserted text
      const newRange = document.createRange();
      newRange.setStartAfter(range.endContainer);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // Trigger input event to update any listeners
    const event = new Event('input', { bubbles: true });
    this.currentTextarea.dispatchEvent(event);
    
    this.hideSuggestionBox();
  }

  selectSuggestion(index) {
    this.selectedIndex = index;
    this.applySuggestion(index);
  }
}

// Initialize the autocompleter when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AITextAutocompleter();
  });
} else {
  new AITextAutocompleter();
}
