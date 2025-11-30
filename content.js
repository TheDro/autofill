class AITextAutocompleter {
  constructor() {
    this.suggestionBox = null;
    this.currentTextarea = null;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for focus on textareas and contenteditable elements
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        this.handleFocus(e.target);
      }
    });

    // Handle keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleFocus(element) {
    this.currentTextarea = element;
    this.hideSuggestionBox();
    
    // Add input event listener to the active textarea
    this.currentTextarea.addEventListener('input', this.handleInput.bind(this));
  }

  async handleInput() {
    const text = this.currentTextarea.value || this.currentTextarea.innerText;
    if (!text.trim()) {
      this.hideSuggestionBox();
      return;
    }

    try {
      // Get suggestions from background script
      const suggestions = await this.getSuggestions(text);
      console.log({suggestions})
      
      if (suggestions && suggestions.length > 0) {
        this.suggestions = suggestions;
        this.showSuggestions(suggestions);
      } else {
        this.hideSuggestionBox();
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      this.hideSuggestionBox();
    }
  }

  async getSuggestions(text) {
    // This will be implemented in the background script
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_SUGGESTIONS', text },
        (response) => {
          resolve(response?.suggestions || []);
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
